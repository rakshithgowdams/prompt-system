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
          key={direction}
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
            <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center">
              <Icon name={direction === 'back' ? 'replay_10' : 'forward_10'} size={32} className="text-white" />
            </div>
            <span className="text-white text-xs font-bold">{direction === 'back' ? '-10s' : '+10s'}</span>
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
  const lastTapTime = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [skipFlash, setSkipFlash] = useState<'back' | 'forward' | null>(null);
  const skipFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ref = externalRef ?? internalRef;

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY_MS);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) scheduleHide();
  }, [playing, scheduleHide]);

  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      scheduleHide();
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing, scheduleHide]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !initialTime || initialTime <= 0) return;
    v.currentTime = initialTime;
  }, [src]);

  const togglePlay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, [ref]);

  const skip = useCallback((delta: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    const dir = delta < 0 ? 'back' : 'forward';
    setSkipFlash(dir);
    if (skipFlashTimer.current) clearTimeout(skipFlashTimer.current);
    skipFlashTimer.current = setTimeout(() => setSkipFlash(null), 600);
    showControls();
  }, [ref, showControls]);

  // Touch tap handler: single tap shows/hides controls; does NOT toggle play
  const handleContainerTouchEnd = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // If the tap landed on a button or control, let it handle itself
    if (target.closest('button') || target.closest('[data-controls]') || target.closest('[data-center-controls]')) return;

    const now = Date.now();
    const timeSinceLast = now - lastTapTime.current;
    lastTapTime.current = now;

    if (timeSinceLast < 300) {
      // Double-tap: cancel pending single-tap and do nothing (or could seek)
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      return;
    }

    // Single tap: toggle controls visibility
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      if (controlsVisible) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setControlsVisible(false);
      } else {
        showControls();
      }
    }, 200);
  }, [controlsVisible, showControls]);

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

  const handleEnded = () => setPlaying(false);

  const seekTo = (e: React.MouseEvent) => {
    const v = ref.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
    setCurrentTime(v.currentTime);
  };

  const seekToTouch = (e: React.TouchEvent) => {
    const v = ref.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    e.stopPropagation();
    const touch = e.touches[0] ?? e.changedTouches[0];
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
    setCurrentTime(v.currentTime);
  };

  const handleProgressHover = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverPos(pct * 100);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (ref.current) { ref.current.volume = val; ref.current.muted = val === 0; }
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    const next = !muted;
    setMuted(next);
    v.muted = next;
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

  const changeQuality = (q: string) => {
    setQuality(q);
    setShowQuality(false);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      switch (e.key) {
        case ' ':
        case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); skip(-10); break;
        case 'ArrowRight': e.preventDefault(); skip(10); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [playing, muted, togglePlay, skip]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const timelineTicks = markers.filter(m => duration > 0 && m.time_seconds > 0 && m.time_seconds < duration);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black select-none"
      onMouseMove={showControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
      // Desktop click on video background toggles play
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-controls]') || target.closest('[data-center-controls]')) return;
        // Only toggle play on pointer (mouse) clicks, not touch (handled separately)
        if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'touch') return;
        togglePlay();
      }}
      onTouchEnd={handleContainerTouchEnd}
    >
      <video
        ref={ref}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
      />

      {/* ── Centre overlay: skip-back | play/pause | skip-forward ──────────── */}
      <div
        data-center-controls
        className={cn(
          'absolute inset-0 flex items-center justify-center gap-6 sm:gap-8 transition-opacity duration-300',
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Skip back 10s — large touch target */}
        <button
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); skip(-10); showControls(); }}
          onClick={(e) => { e.stopPropagation(); skip(-10); }}
          className="flex flex-col items-center gap-1 rounded-2xl active:bg-white/10 transition-all"
          style={{ padding: '12px', minWidth: '64px', minHeight: '64px', touchAction: 'manipulation' }}
          aria-label="Rewind 10 seconds"
        >
          <div className="w-12 h-12 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60 transition-all">
            <Icon name="replay_10" size={28} className="text-white" />
          </div>
          <span className="text-white/80 text-[11px] font-bold">10s</span>
        </button>

        {/* Centre play / pause */}
        <button
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(); showControls(); }}
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="w-16 h-16 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:bg-black/70 transition-all active:scale-95 hover:scale-110 border border-white/10"
          style={{ touchAction: 'manipulation' }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <Icon
            name={playing ? 'pause' : 'play_arrow'}
            size={34}
            className="text-white"
            fill
            style={!playing ? { marginLeft: 3 } : undefined}
          />
        </button>

        {/* Skip forward 10s — large touch target */}
        <button
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); skip(10); showControls(); }}
          onClick={(e) => { e.stopPropagation(); skip(10); }}
          className="flex flex-col items-center gap-1 rounded-2xl active:bg-white/10 transition-all"
          style={{ padding: '12px', minWidth: '64px', minHeight: '64px', touchAction: 'manipulation' }}
          aria-label="Forward 10 seconds"
        >
          <div className="w-12 h-12 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60 transition-all">
            <Icon name="forward_10" size={28} className="text-white" />
          </div>
          <span className="text-white/80 text-[11px] font-bold">10s</span>
        </button>
      </div>

      {/* ── Skip flash feedback ───────────────────────────────────────────── */}
      <SkipFlash direction="back" visible={skipFlash === 'back'} />
      <SkipFlash direction="forward" visible={skipFlash === 'forward'} />

      {/* ── Bottom controls overlay ───────────────────────────────────────── */}
      <div
        data-controls
        className={cn(
          'absolute inset-x-0 bottom-0 transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-3 pt-12">

          {/* ── Timeline / progress bar ── */}
          <div
            ref={progressRef}
            className="relative h-8 flex items-end cursor-pointer group/bar mb-1"
            onClick={seekTo}
            onTouchStart={(e) => { e.stopPropagation(); seekToTouch(e); }}
            onTouchMove={(e) => { e.stopPropagation(); seekToTouch(e); }}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => { setHoverTime(null); setHoveredMarker(null); }}
          >
            {/* Track */}
            <div className="absolute left-0 right-0 h-1.5 group-hover/bar:h-2 bg-white/20 rounded-full transition-all bottom-0">
              <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full" style={{ width: `${progress}%` }} />

              {timelineTicks.map((marker, i) => {
                const pct = (marker.time_seconds / duration) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-0.5 bg-black/60 z-10"
                    style={{ left: `${pct}%` }}
                  />
                );
              })}
            </div>

            {timelineTicks.map((marker, i) => {
              const pct = (marker.time_seconds / duration) * 100;
              const clampedPct = Math.max(2, Math.min(95, pct));
              return (
                <div
                  key={`label-${i}`}
                  className="absolute bottom-[12px] -translate-x-1/2 pointer-events-none z-20"
                  style={{ left: `${clampedPct}%` }}
                >
                  <span className="text-[9px] text-white/50 font-mono whitespace-nowrap">
                    {formatTime(marker.time_seconds)}
                  </span>
                </div>
              );
            })}

            {timelineTicks.map((marker, i) => {
              const pct = (marker.time_seconds / duration) * 100;
              return (
                <div
                  key={`dot-${i}`}
                  className="absolute w-3 h-3 bg-amber-400 rounded-full border-2 border-white/80 shadow-sm cursor-pointer z-10 active:scale-150 hover:scale-150 transition-transform bottom-[-3px]"
                  style={{ left: `${pct}%`, marginLeft: '-6px' }}
                  onMouseEnter={() => setHoveredMarker(marker)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ref.current) ref.current.currentTime = marker.time_seconds;
                  }}
                />
              );
            })}

            <div
              className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 bottom-[-4px]"
              style={{ left: `${progress}%`, marginLeft: '-8px' }}
            />

            {hoverTime !== null && (
              <div
                className="absolute -translate-x-1/2 pointer-events-none z-30 bottom-[16px]"
                style={{ left: `${hoverPos}%` }}
              >
                <div className="px-2 py-1 bg-gray-900/95 rounded text-white text-[10px] font-mono whitespace-nowrap shadow-xl border border-white/10">
                  {formatTime(hoverTime)}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95 mx-auto" />
              </div>
            )}

            {hoveredMarker && (
              <div
                className="absolute -translate-x-1/2 pointer-events-none z-30 bottom-[16px]"
                style={{ left: `${duration > 0 ? (hoveredMarker.time_seconds / duration) * 100 : 0}%` }}
              >
                <div className="px-2.5 py-1.5 bg-amber-500 rounded text-white text-[10px] font-bold whitespace-nowrap shadow-xl max-w-[140px] truncate">
                  {hoveredMarker.label}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500 mx-auto" />
              </div>
            )}
          </div>

          {/* ── Bottom control bar ── */}
          <div className="flex items-center gap-0.5 sm:gap-1 mt-1">

            {/* Volume */}
            <div className="flex items-center gap-0.5 group/vol">
              <button
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); toggleMute(); showControls(); }}
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="p-2 text-white hover:text-white/80 transition-colors"
                style={{ touchAction: 'manipulation' }}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <Icon name={muted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'} size={20} />
              </button>
              <input
                type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-0 group-hover/vol:w-14 transition-all duration-200 h-1 accent-white cursor-pointer opacity-0 group-hover/vol:opacity-100 hidden sm:block"
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
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowSpeed((v) => !v); setShowQuality(false); showControls(); }}
                onClick={(e) => { e.stopPropagation(); setShowSpeed((v) => !v); setShowQuality(false); }}
                className="px-2 py-1.5 text-white text-[11px] font-bold hover:bg-white/10 active:bg-white/10 rounded transition-colors whitespace-nowrap"
                style={{ touchAction: 'manipulation', minWidth: '40px' }}
              >
                {speed}x
              </button>
              {showSpeed && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50 min-w-[100px]">
                  <div className="px-3 py-2 border-b border-white/8">
                    <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Speed</span>
                  </div>
                  {SPEEDS.map((s) => (
                    <button key={s}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); changeSpeed(s); }}
                      onClick={(e) => { e.stopPropagation(); changeSpeed(s); }}
                      className={cn(
                        'block w-full px-4 py-2.5 text-left text-[12px] font-medium hover:bg-white/10 active:bg-white/10 transition-colors',
                        s === speed ? 'text-red-400 font-bold bg-white/5' : 'text-white'
                      )}
                      style={{ touchAction: 'manipulation' }}
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
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuality((v) => !v); setShowSpeed(false); showControls(); }}
                  onClick={(e) => { e.stopPropagation(); setShowQuality((v) => !v); setShowSpeed(false); }}
                  className="flex items-center gap-1 px-2 py-1.5 text-white text-[11px] font-bold hover:bg-white/10 active:bg-white/10 rounded transition-colors whitespace-nowrap"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Icon name="settings" size={15} />
                  <span className="hidden sm:inline">{quality === 'Auto' ? `Auto (${nativeHeight}p)` : quality}</span>
                </button>
                {showQuality && (
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50 min-w-[110px]">
                    <div className="px-3 py-2 border-b border-white/8">
                      <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Quality</span>
                    </div>
                    {qualityOptions.map((q) => (
                      <button key={q}
                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); changeQuality(q); }}
                        onClick={(e) => { e.stopPropagation(); changeQuality(q); }}
                        className={cn(
                          'block w-full px-4 py-2.5 text-left text-[12px] font-medium hover:bg-white/10 active:bg-white/10 transition-colors',
                          q === quality ? 'text-red-400 font-bold bg-white/5' : 'text-white'
                        )}
                        style={{ touchAction: 'manipulation' }}
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
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); showControls(); }}
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-2 text-white hover:text-white/80 transition-colors"
              style={{ touchAction: 'manipulation' }}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Title top overlay */}
      {title && controlsVisible && (
        <div className="absolute top-0 inset-x-0 pointer-events-none">
          <div className="bg-gradient-to-b from-black/70 to-transparent px-4 pt-3 pb-8">
            <p className="text-white text-sm font-semibold truncate">{title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
