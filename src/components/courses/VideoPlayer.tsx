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
const HIDE_DELAY_MS = 3500;

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function SkipFlash({ direction, visible }: { direction: 'back' | 'forward'; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`${direction}-${Date.now()}`}
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={cn(
            'absolute inset-y-0 flex items-center justify-center pointer-events-none w-1/3',
            direction === 'back' ? 'left-0' : 'right-0',
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name={direction === 'back' ? 'replay_10' : 'forward_10'} size={36} className="text-white" />
            </div>
            <span className="text-white text-xs font-bold drop-shadow">{direction === 'back' ? '-10s' : '+10s'}</span>
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
  const [skipFlash, setSkipFlash] = useState<{ dir: 'back' | 'forward'; id: number } | null>(null);

  const ref = externalRef ?? internalRef;

  // ── Controls visibility ───────────────────────────────────────────────────

  const clearHideTimer = () => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  };

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY_MS);
  }, []);

  const bringUpControls = useCallback(() => {
    setControlsVisible(true);
    clearHideTimer();
    // Only auto-hide if video is playing
    if (ref.current && !ref.current.paused) scheduleHide();
  }, [ref, scheduleHide]);

  useEffect(() => {
    if (!playing) {
      clearHideTimer();
      setControlsVisible(true);
    } else {
      scheduleHide();
    }
    return clearHideTimer;
  }, [playing, scheduleHide]);

  // ── Basic playback ────────────────────────────────────────────────────────

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

  const skip = useCallback((delta: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    setSkipFlash({ dir: delta < 0 ? 'back' : 'forward', id: Date.now() });
    bringUpControls();
  }, [ref, bringUpControls]);

  // ── Video event handlers ──────────────────────────────────────────────────

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

  const getProgressPct = (clientX: number): number => {
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (ref.current) { ref.current.volume = val; ref.current.muted = val === 0; }
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    setShowSpeed(false);
    if (ref.current) ref.current.playbackRate = s;
  };

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

  const changeQuality = (q: string) => { setQuality(q); setShowQuality(false); };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement !== document.body &&
        !containerRef.current?.contains(document.activeElement)) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); skip(-10); break;
        case 'ArrowRight': e.preventDefault(); skip(10); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [playing, muted, togglePlay, skip]); // eslint-disable-line

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const timelineTicks = markers.filter(m => duration > 0 && m.time_seconds > 0 && m.time_seconds < duration);

  // ── Tap-on-video: show controls; if already visible, toggle play ──────────
  // We use a single pointerdown on the video-background div (not the controls).
  const handleVideoBgClick = useCallback(() => {
    if (!controlsVisible) {
      bringUpControls();
    } else {
      togglePlay();
    }
  }, [controlsVisible, bringUpControls, togglePlay]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black select-none"
      onMouseMove={bringUpControls}
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
        onPause={() => { setPlaying(false); clearHideTimer(); setControlsVisible(true); }}
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
      />

      {/* ── Transparent click-catcher behind all controls ─────────────────── */}
      {/* This sits above the video but below the controls overlay */}
      <div
        className="absolute inset-0 z-10"
        onClick={handleVideoBgClick}
      />

      {/* ── Skip flash feedback ───────────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <SkipFlash direction="back" visible={skipFlash?.dir === 'back'} />
        <SkipFlash direction="forward" visible={skipFlash?.dir === 'forward'} />
      </div>

      {/* ── Centre controls: rewind | play/pause | forward ───────────────── */}
      {/* z-30 so it sits above the click-catcher */}
      <div
        className={cn(
          'absolute inset-0 z-30 flex items-center justify-center gap-6 transition-opacity duration-300',
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Rewind 10s */}
        <button
          className="flex flex-col items-center gap-1.5 cursor-pointer"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerUp={(e) => { e.stopPropagation(); skip(-10); }}
          aria-label="Rewind 10 seconds"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="replay_10" size={30} className="text-white" />
          </div>
          <span className="text-white/80 text-xs font-bold drop-shadow">10s</span>
        </button>

        {/* Play / Pause */}
        <button
          className="flex items-center justify-center cursor-pointer"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerUp={(e) => { e.stopPropagation(); togglePlay(); bringUpControls(); }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <div className="w-18 h-18 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
            style={{ width: '72px', height: '72px' }}>
            <Icon
              name={playing ? 'pause' : 'play_arrow'}
              size={40}
              className="text-white"
              fill
              style={!playing ? { marginLeft: 4 } : undefined}
            />
          </div>
        </button>

        {/* Forward 10s */}
        <button
          className="flex flex-col items-center gap-1.5 cursor-pointer"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerUp={(e) => { e.stopPropagation(); skip(10); }}
          aria-label="Forward 10 seconds"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="forward_10" size={30} className="text-white" />
          </div>
          <span className="text-white/80 text-xs font-bold drop-shadow">10s</span>
        </button>
      </div>

      {/* ── Bottom controls bar ───────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300',
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none rounded-b" />

        <div className="relative px-3 pb-3 pt-10">

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
            onPointerMove={(e) => {
              if (e.pointerType === 'touch' && seeking) {
                seekTo(e.clientX);
              }
            }}
            onPointerUp={() => setSeeking(false)}
          >
            {/* Track background */}
            <div className="absolute left-0 right-0 h-1.5 group-hover/bar:h-2.5 bg-white/25 rounded-full transition-all duration-100 bottom-2">
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full" style={{ width: `${progress}%` }} />

              {timelineTicks.map((marker, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-black/50 z-10"
                  style={{ left: `${(marker.time_seconds / duration) * 100}%` }} />
              ))}
            </div>

            {/* Playhead thumb */}
            <div
              className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 bottom-1.5"
              style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
            />

            {/* Chapter dots */}
            {timelineTicks.map((marker, i) => (
              <div
                key={`dot-${i}`}
                className="absolute w-3 h-3 bg-amber-400 rounded-full border-2 border-white/80 shadow z-10 bottom-1.5 cursor-pointer hover:scale-150 active:scale-150 transition-transform"
                style={{ left: `${(marker.time_seconds / duration) * 100}%`, transform: 'translateX(-50%)' }}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  if (ref.current) ref.current.currentTime = marker.time_seconds;
                }}
              />
            ))}

            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div className="absolute pointer-events-none z-30 bottom-8" style={{ left: `${hoverPos}%`, transform: 'translateX(-50%)' }}>
                <div className="px-2 py-1 bg-gray-900/95 rounded text-white text-[10px] font-mono whitespace-nowrap shadow-xl border border-white/10">
                  {formatTime(hoverTime)}
                </div>
              </div>
            )}

            {/* Marker tooltip */}
            {hoveredMarker && (
              <div
                className="absolute pointer-events-none z-30 bottom-8"
                style={{ left: `${(hoveredMarker.time_seconds / duration) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <div className="px-2.5 py-1.5 bg-amber-500 rounded text-white text-[10px] font-bold whitespace-nowrap shadow-xl max-w-[140px] truncate">
                  {hoveredMarker.label}
                </div>
              </div>
            )}
          </div>

          {/* ── Control bar row ── */}
          <div className="flex items-center gap-1 mt-0.5">

            {/* Mute */}
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerUp={(e) => { e.stopPropagation(); toggleMute(); }}
              className="p-2 text-white"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              <Icon name={muted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'} size={20} />
            </button>

            {/* Volume slider — hidden on mobile */}
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              onPointerDown={(e) => e.stopPropagation()}
              className="hidden sm:block w-16 h-1 accent-white cursor-pointer"
            />

            {/* Time */}
            <span className="text-white text-[11px] font-mono tabular-nums ml-1 select-none whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Speed */}
            <div className="relative">
              <button
                onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
                onPointerUp={(e) => { e.stopPropagation(); setShowSpeed(v => !v); setShowQuality(false); }}
                className="px-2 py-1.5 text-white text-[11px] font-bold rounded hover:bg-white/10 active:bg-white/10"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minWidth: 36 }}
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
                      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
                      onPointerUp={(e) => { e.stopPropagation(); changeSpeed(s); }}
                      className={cn('block w-full px-4 py-2.5 text-left text-[12px] font-medium hover:bg-white/10 active:bg-white/10',
                        s === speed ? 'text-red-400 font-bold bg-white/5' : 'text-white')}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
                  onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
                  onPointerUp={(e) => { e.stopPropagation(); setShowQuality(v => !v); setShowSpeed(false); }}
                  className="flex items-center gap-1 px-2 py-1.5 text-white text-[11px] font-bold rounded hover:bg-white/10 active:bg-white/10"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
                        onPointerUp={(e) => { e.stopPropagation(); changeQuality(q); }}
                        className={cn('block w-full px-4 py-2.5 text-left text-[12px] font-medium hover:bg-white/10 active:bg-white/10',
                          q === quality ? 'text-red-400 font-bold bg-white/5' : 'text-white')}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
              onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerUp={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-2 text-white"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Title overlay */}
      {title && (
        <div className={cn(
          'absolute top-0 inset-x-0 z-30 pointer-events-none transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="bg-gradient-to-b from-black/75 to-transparent px-4 pt-3 pb-8">
            <p className="text-white text-sm font-semibold truncate drop-shadow">{title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
