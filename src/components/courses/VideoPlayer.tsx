import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Icon } from '../ui/Icon';
import type { TimelineMarker } from '../../hooks/useCourses';

export type { TimelineMarker };

interface VideoPlayerProps {
  src: string;
  title?: string;
  markers?: TimelineMarker[];
  onTimeUpdate?: (seconds: number) => void;
  initialTime?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_DELAY_MS = 3000;

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Prime-style double-tap ripple zone
interface RippleZoneProps {
  direction: 'back' | 'forward';
  count: number; // how many 10s skips triggered
  visible: boolean;
}

function RippleZone({ direction, count, visible }: RippleZoneProps) {
  const isBack = direction === 'back';
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`${direction}-${count}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'absolute inset-y-0 w-[38%] flex items-center pointer-events-none overflow-hidden',
            isBack ? 'left-0' : 'right-0',
          )}
        >
          {/* Oval gradient background */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0.7 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{
              background: isBack
                ? 'radial-gradient(ellipse 80% 100% at 10% 50%, rgba(255,255,255,0.18) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 80% 100% at 90% 50%, rgba(255,255,255,0.18) 0%, transparent 70%)',
            }}
          />

          {/* Ripple circles emanating outward */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.6, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2.2 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: 'easeOut' }}
              className="absolute rounded-full border border-white/40"
              style={{
                width: 100,
                height: 100,
                [isBack ? 'left' : 'right']: -20,
                top: '50%',
                marginTop: -50,
              }}
            />
          ))}

          {/* Icon + label */}
          <div
            className={cn(
              'absolute flex flex-col items-center gap-1.5',
              isBack ? 'left-[18%]' : 'right-[18%]',
            )}
            style={{ transform: 'translate(-50%, -50%)', top: '50%' }}
          >
            <Icon
              name={isBack ? 'replay_10' : 'forward_10'}
              size={44}
              className="text-white drop-shadow-lg"
            />
            <span className="text-white text-[13px] font-bold drop-shadow-lg tracking-wide">
              {count * 10} seconds
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function VideoPlayer({ src, title, markers = [], onTimeUpdate, initialTime, videoRef: externalRef }: VideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double-tap tracking
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapZone = useRef<'left' | 'right' | 'center' | null>(null);
  const tapCount = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [quality, setQuality] = useState<string>('Auto');
  const [showQuality, setShowQuality] = useState(false);
  const [nativeHeight, setNativeHeight] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [seeking, setSeeking] = useState(false);

  // Ripple state
  const [leftRipple, setLeftRipple] = useState<{ count: number; visible: boolean }>({ count: 0, visible: false });
  const [rightRipple, setRightRipple] = useState<{ count: number; visible: boolean }>({ count: 0, visible: false });
  const leftRippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightRippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ref = externalRef ?? internalRef;

  // ── Controls visibility ───────────────────────────────────────────────────

  const clearHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY_MS);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearHide();
    if (ref.current && !ref.current.paused) scheduleHide();
  }, [ref, scheduleHide]);

  useEffect(() => {
    if (!playing) { clearHide(); setControlsVisible(true); }
    else scheduleHide();
    return clearHide;
  }, [playing, scheduleHide]);

  // ── Playback ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const v = ref.current;
    if (!v || !initialTime || initialTime <= 0) return;
    v.currentTime = initialTime;
  }, [src]); // eslint-disable-line

  const togglePlay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }, [ref]);

  // ── Skip with ripple ──────────────────────────────────────────────────────

  const triggerSkip = useCallback((delta: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    showControls();

    if (delta < 0) {
      if (leftRippleTimer.current) clearTimeout(leftRippleTimer.current);
      setLeftRipple(prev => ({ count: prev.visible ? prev.count + 1 : 1, visible: true }));
      leftRippleTimer.current = setTimeout(() => setLeftRipple(prev => ({ ...prev, visible: false })), 800);
    } else {
      if (rightRippleTimer.current) clearTimeout(rightRippleTimer.current);
      setRightRipple(prev => ({ count: prev.visible ? prev.count + 1 : 1, visible: true }));
      rightRippleTimer.current = setTimeout(() => setRightRipple(prev => ({ ...prev, visible: false })), 800);
    }
  }, [ref, showControls]);

  // ── Prime-style tap handler ───────────────────────────────────────────────
  // Single tap center: toggle controls (if playing) or play/pause (if paused)
  // Double tap left: -10s | Double tap right: +10s
  const handleVideoTap = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relX = clientX - rect.left;
    const zone: 'left' | 'right' | 'center' =
      relX < rect.width * 0.3 ? 'left' :
      relX > rect.width * 0.7 ? 'right' : 'center';

    // Accumulate taps in the same zone
    if (tapZone.current === zone) {
      tapCount.current += 1;
    } else {
      tapZone.current = zone;
      tapCount.current = 1;
    }

    if (tapTimer.current) clearTimeout(tapTimer.current);

    tapTimer.current = setTimeout(() => {
      const count = tapCount.current;
      const z = tapZone.current;
      tapCount.current = 0;
      tapZone.current = null;

      if (z === 'left' && count >= 2) {
        for (let i = 0; i < Math.floor(count / 2) + (count % 2 === 0 ? -1 : 0); i++) triggerSkip(-10);
        // Actually skip by (floor(count/2)) × 10
        const skips = Math.floor(count / 2);
        if (skips > 0) {
          const v = ref.current;
          if (v) v.currentTime = Math.max(0, v.currentTime - 10 * (skips - 1)); // already skipped once
        }
      } else if (z === 'right' && count >= 2) {
        const skips = Math.floor(count / 2);
        if (skips > 0) {
          const v = ref.current;
          if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10 * (skips - 1));
        }
      } else {
        // Single tap anywhere: toggle controls visibility
        if (controlsVisible) {
          clearHide();
          setControlsVisible(false);
        } else {
          showControls();
        }
      }
    }, 250);
  }, [controlsVisible, showControls, triggerSkip, ref]);

  // ── Video events ──────────────────────────────────────────────────────────

  const handleTimeUpdate = () => {
    const v = ref.current;
    if (!v || seeking) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    onTimeUpdate?.(Math.floor(v.currentTime));
  };

  const handleLoadedMetadata = () => {
    const v = ref.current;
    if (!v) return;
    setDuration(v.duration);
    setNativeHeight(v.videoHeight);
    if (initialTime && initialTime > 0) v.currentTime = initialTime;
  };

  // ── Progress bar ──────────────────────────────────────────────────────────

  const getProgressPct = (clientX: number) => {
    const bar = progressRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const seekTo = (clientX: number) => {
    const v = ref.current;
    if (!v || !duration) return;
    v.currentTime = getProgressPct(clientX) * duration;
    setCurrentTime(v.currentTime);
  };

  // ── Volume / speed / quality / fullscreen ─────────────────────────────────

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val); setMuted(val === 0);
    if (ref.current) { ref.current.volume = val; ref.current.muted = val === 0; }
  };

  const changeSpeed = (s: number) => { setSpeed(s); setShowSpeed(false); if (ref.current) ref.current.playbackRate = s; };
  const changeQuality = (q: string) => { setQuality(q); setShowQuality(false); };

  const qualityOptions = (() => {
    const opts = ['Auto'];
    if (nativeHeight >= 2160) opts.push('2160p');
    if (nativeHeight >= 1440) opts.push('1440p');
    if (nativeHeight >= 1080) opts.push('1080p');
    if (nativeHeight >= 720) opts.push('720p');
    if (nativeHeight >= 480) opts.push('480p');
    if (nativeHeight >= 360) opts.push('360p');
    return opts;
  })();

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) await containerRef.current.requestFullscreen();
    else await document.exitFullscreen();
  };

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement !== document.body &&
        !containerRef.current?.contains(document.activeElement)) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); triggerSkip(-10); break;
        case 'ArrowRight': e.preventDefault(); triggerSkip(10); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [playing, muted, togglePlay, triggerSkip]); // eslint-disable-line

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const timelineTicks = markers.filter(m => duration > 0 && m.time_seconds > 0 && m.time_seconds < duration);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black select-none overflow-hidden"
      onMouseMove={showControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
    >
      <video
        ref={ref}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        onPlay={() => { setPlaying(true); scheduleHide(); }}
        onPause={() => { setPlaying(false); clearHide(); setControlsVisible(true); }}
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
      />

      {/* ── Tap zones (left / center / right) ──────────────────────────────── */}
      {/* Left zone: 30% */}
      <div
        className="absolute inset-y-0 left-0 z-10 cursor-pointer"
        style={{ width: '30%' }}
        onClick={(e) => { e.stopPropagation(); handleVideoTap(e.clientX); }}
        onPointerDown={(e) => { if (e.pointerType === 'touch') { e.stopPropagation(); } }}
        onPointerUp={(e) => { if (e.pointerType === 'touch') { e.stopPropagation(); handleVideoTap(e.clientX); } }}
      />
      {/* Center zone: 40% */}
      <div
        className="absolute inset-y-0 z-10 cursor-pointer"
        style={{ left: '30%', width: '40%' }}
        onClick={(e) => { e.stopPropagation(); handleVideoTap(e.clientX); }}
        onPointerDown={(e) => { if (e.pointerType === 'touch') e.stopPropagation(); }}
        onPointerUp={(e) => { if (e.pointerType === 'touch') { e.stopPropagation(); handleVideoTap(e.clientX); } }}
      />
      {/* Right zone: 30% */}
      <div
        className="absolute inset-y-0 right-0 z-10 cursor-pointer"
        style={{ width: '30%' }}
        onClick={(e) => { e.stopPropagation(); handleVideoTap(e.clientX); }}
        onPointerDown={(e) => { if (e.pointerType === 'touch') e.stopPropagation(); }}
        onPointerUp={(e) => { if (e.pointerType === 'touch') { e.stopPropagation(); handleVideoTap(e.clientX); } }}
      />

      {/* ── Double-tap ripple overlays ──────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <RippleZone direction="back" count={leftRipple.count} visible={leftRipple.visible} />
        <RippleZone direction="forward" count={rightRipple.count} visible={rightRipple.visible} />
      </div>

      {/* ── Top gradient + title ────────────────────────────────────────────── */}
      <AnimatePresence>
        {controlsVisible && title && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 inset-x-0 z-30 pointer-events-none"
          >
            <div className="bg-gradient-to-b from-black/80 via-black/20 to-transparent px-4 pt-4 pb-14">
              <p className="text-white text-sm font-semibold truncate drop-shadow-lg">{title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            <div className="relative px-3 sm:px-4 pb-3 pt-10">

              {/* ── Progress bar ── */}
              <div
                ref={progressRef}
                className="relative h-8 flex items-center cursor-pointer group/bar mb-1"
                onClick={(e) => seekTo(e.clientX)}
                onMouseMove={(e) => {
                  const pct = getProgressPct(e.clientX);
                  setHoverTime(pct * duration);
                  setHoverPos(pct * 100);
                }}
                onMouseLeave={() => { setHoverTime(null); setHoveredMarker(null); }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch') {
                    e.stopPropagation();
                    setSeeking(true);
                    seekTo(e.clientX);
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => { if (seeking && e.pointerType === 'touch') seekTo(e.clientX); }}
                onPointerUp={() => setSeeking(false)}
              >
                {/* Track */}
                <div className="absolute left-0 right-0 bottom-2 h-1 group-hover/bar:h-[5px] bg-white/25 rounded-full transition-all duration-100">
                  <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${progress}%`, background: '#00A8E1' }}
                  />
                  {timelineTicks.map((marker, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-black/60 z-10"
                      style={{ left: `${(marker.time_seconds / duration) * 100}%` }} />
                  ))}
                </div>

                {/* Playhead */}
                <div
                  className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 bottom-1.5"
                  style={{ left: `${progress}%`, transform: 'translateX(-50%)', background: '#00A8E1' }}
                />

                {/* Chapter dots */}
                {timelineTicks.map((marker, i) => (
                  <div
                    key={`dot-${i}`}
                    className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full border border-white/80 shadow z-10 bottom-1.5 cursor-pointer hover:scale-150 active:scale-150 transition-transform"
                    style={{ left: `${(marker.time_seconds / duration) * 100}%`, transform: 'translateX(-50%)' }}
                    onMouseEnter={() => setHoveredMarker(marker)}
                    onMouseLeave={() => setHoveredMarker(null)}
                    onPointerUp={(e) => { e.stopPropagation(); if (ref.current) ref.current.currentTime = marker.time_seconds; }}
                  />
                ))}

                {/* Hover time */}
                {hoverTime !== null && (
                  <div className="absolute pointer-events-none z-30 bottom-8" style={{ left: `${hoverPos}%`, transform: 'translateX(-50%)' }}>
                    <div className="px-2 py-0.5 bg-gray-900/95 rounded text-white text-[10px] font-mono whitespace-nowrap border border-white/10">
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                )}

                {/* Marker tooltip */}
                {hoveredMarker && (
                  <div className="absolute pointer-events-none z-30 bottom-8"
                    style={{ left: `${(hoveredMarker.time_seconds / duration) * 100}%`, transform: 'translateX(-50%)' }}>
                    <div className="px-2 py-1 bg-amber-500 rounded text-white text-[10px] font-bold whitespace-nowrap shadow-xl max-w-[140px] truncate">
                      {hoveredMarker.label}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Control row ── */}
              <div className="flex items-center gap-1 mt-0.5">

                {/* Play/Pause */}
                <button
                  className="p-1.5 text-white hover:text-white/80 active:scale-90 transition-transform"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  <Icon name={playing ? 'pause' : 'play_arrow'} size={22} className="text-white" fill />
                </button>

                {/* Skip back 10s */}
                <button
                  className="p-1.5 text-white hover:text-white/80 active:scale-90 transition-transform"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  onClick={(e) => { e.stopPropagation(); triggerSkip(-10); }}
                  aria-label="Rewind 10s"
                >
                  <Icon name="replay_10" size={20} className="text-white" />
                </button>

                {/* Skip forward 10s */}
                <button
                  className="p-1.5 text-white hover:text-white/80 active:scale-90 transition-transform"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  onClick={(e) => { e.stopPropagation(); triggerSkip(10); }}
                  aria-label="Forward 10s"
                >
                  <Icon name="forward_10" size={20} className="text-white" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-0.5 group/vol ml-0.5">
                  <button
                    className="p-1.5 text-white hover:text-white/80 active:scale-90 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    aria-label={muted ? 'Unmute' : 'Mute'}
                  >
                    <Icon name={muted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'} size={20} className="text-white" />
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:block w-0 group-hover/vol:w-16 transition-all duration-200 h-1 cursor-pointer opacity-0 group-hover/vol:opacity-100"
                    style={{ accentColor: '#00A8E1' }}
                  />
                </div>

                {/* Time */}
                <span className="text-white text-[11px] font-mono tabular-nums ml-1 select-none whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className="flex-1" />

                {/* Speed */}
                <div className="relative">
                  <button
                    className="px-2 py-1.5 text-white text-[11px] font-bold rounded hover:bg-white/10 active:bg-white/10"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', minWidth: 36 }}
                    onClick={(e) => { e.stopPropagation(); setShowSpeed(v => !v); setShowQuality(false); }}
                  >
                    {speed}x
                  </button>
                  {showSpeed && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50 min-w-[100px]">
                      <div className="px-3 py-2 border-b border-white/10">
                        <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Speed</span>
                      </div>
                      {SPEEDS.map((s) => (
                        <button key={s}
                          onClick={(e) => { e.stopPropagation(); changeSpeed(s); }}
                          className={cn('block w-full px-4 py-2.5 text-left text-[12px] font-medium hover:bg-white/10 active:bg-white/10',
                            s === speed ? 'font-bold bg-white/5' : 'text-white')}
                          style={{ color: s === speed ? '#00A8E1' : undefined, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        >
                          {s === 1 ? 'Normal' : `${s}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality */}
                {nativeHeight > 0 && (
                  <div className="relative">
                    <button
                      className="flex items-center gap-1 px-2 py-1.5 text-white text-[11px] font-bold rounded hover:bg-white/10 active:bg-white/10"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                      onClick={(e) => { e.stopPropagation(); setShowQuality(v => !v); setShowSpeed(false); }}
                    >
                      <Icon name="settings" size={15} />
                      <span className="hidden sm:inline">{quality === 'Auto' ? `Auto (${nativeHeight}p)` : quality}</span>
                    </button>
                    {showQuality && (
                      <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50 min-w-[110px]">
                        <div className="px-3 py-2 border-b border-white/10">
                          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Quality</span>
                        </div>
                        {qualityOptions.map((q) => (
                          <button key={q}
                            onClick={(e) => { e.stopPropagation(); changeQuality(q); }}
                            className={cn('block w-full px-4 py-2.5 text-left text-[12px] font-medium hover:bg-white/10 active:bg-white/10',
                              q === quality ? 'font-bold bg-white/5' : 'text-white')}
                            style={{ color: q === quality ? '#00A8E1' : undefined, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                          >
                            {q}{q === 'Auto' && nativeHeight > 0 ? ` (${nativeHeight}p)` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fullscreen */}
                <button
                  className="p-1.5 text-white hover:text-white/80 active:scale-90 transition-transform"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={22} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
