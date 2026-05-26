import { useState, useRef, useEffect, useCallback } from 'react';
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

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function VideoPlayer({ src, title, markers = [], onTimeUpdate, initialTime, videoRef: externalRef }: VideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoEl = externalRef?.current ?? internalRef.current;
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
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [seeking, setSeeking] = useState(false);

  const ref = externalRef ?? internalRef;

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setControlsVisible(true);
    else {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (initialTime && initialTime > 0) {
      v.currentTime = initialTime;
    }
  }, [src]);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const skip = (delta: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  };

  const handleTimeUpdate = () => {
    const v = ref.current;
    if (!v || seeking) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
    onTimeUpdate?.(Math.floor(v.currentTime));
  };

  const handleLoadedMetadata = () => {
    const v = ref.current;
    if (!v) return;
    setDuration(v.duration);
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
    if (ref.current) {
      ref.current.volume = val;
      ref.current.muted = val === 0;
    }
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
  }, [playing, muted]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black group select-none"
      onMouseMove={showControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-controls]')) return;
        togglePlay();
      }}
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

      {/* Big center play button (when paused) */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Icon name="play_arrow" size={36} className="text-white ml-1" fill />
          </div>
        </div>
      )}

      {/* Skip indicators (10s) */}
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-0 group-active:opacity-100 transition-opacity">
        <div className="text-white/80 text-xs font-bold">-10s</div>
      </div>
      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-0 group-active:opacity-100 transition-opacity">
        <div className="text-white/80 text-xs font-bold">+10s</div>
      </div>

      {/* Controls overlay */}
      <div
        data-controls
        className={cn(
          'absolute inset-x-0 bottom-0 transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-3 pt-10">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-5 flex items-center cursor-pointer group/bar mb-2"
            onClick={seekTo}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => { setHoverTime(null); setHoveredMarker(null); }}
          >
            {/* Track */}
            <div className="absolute left-0 right-0 h-1 group-hover/bar:h-1.5 bg-white/20 rounded-full transition-all">
              {/* Buffered */}
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
              {/* Progress */}
              <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>

            {/* Timeline markers */}
            {markers.map((marker, i) => {
              const pct = duration > 0 ? (marker.time_seconds / duration) * 100 : 0;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white/80 shadow-sm cursor-pointer z-10 hover:scale-150 transition-transform"
                  style={{ left: `${pct}%`, marginLeft: '-5px' }}
                  onMouseEnter={() => setHoveredMarker(marker)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ref.current) ref.current.currentTime = marker.time_seconds;
                  }}
                />
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity z-20"
              style={{ left: `${progress}%`, marginLeft: '-7px' }}
            />

            {/* Hover tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-8 -translate-x-1/2 px-2 py-1 bg-black/90 rounded text-white text-[10px] font-mono whitespace-nowrap pointer-events-none z-30"
                style={{ left: `${hoverPos}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Marker tooltip */}
            {hoveredMarker && (
              <div
                className="absolute -top-14 -translate-x-1/2 px-2.5 py-1.5 bg-amber-500 rounded text-white text-[10px] font-bold whitespace-nowrap pointer-events-none z-30"
                style={{ left: `${duration > 0 ? (hoveredMarker.time_seconds / duration) * 100 : 0}%` }}
              >
                {hoveredMarker.label}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500" />
              </div>
            )}
          </div>

          {/* Button row */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-1.5 text-white hover:text-white/80 transition-colors">
              <Icon name={playing ? 'pause' : 'play_arrow'} size={24} fill />
            </button>

            {/* Skip back 10s */}
            <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="p-1.5 text-white hover:text-white/80 transition-colors" title="Rewind 10s">
              <Icon name="replay_10" size={22} />
            </button>

            {/* Skip forward 10s */}
            <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="p-1.5 text-white hover:text-white/80 transition-colors" title="Forward 10s">
              <Icon name="forward_10" size={22} />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-1.5 text-white hover:text-white/80 transition-colors">
                <Icon name={muted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'} size={20} />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-0 group-hover/vol:w-16 transition-all duration-200 h-1 accent-white cursor-pointer opacity-0 group-hover/vol:opacity-100"
              />
            </div>

            {/* Time display */}
            <span className="text-white text-[11px] font-mono ml-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Speed control */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSpeed(!showSpeed); }}
                className="px-2 py-1 text-white text-[11px] font-bold hover:bg-white/10 rounded transition-colors"
              >
                {speed}x
              </button>
              {showSpeed && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl border border-white/10 z-50">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); changeSpeed(s); }}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-[12px] font-medium hover:bg-white/10 transition-colors whitespace-nowrap',
                        s === speed ? 'text-red-400 bg-white/5' : 'text-white'
                      )}
                    >
                      {s}x {s === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="p-1.5 text-white hover:text-white/80 transition-colors">
              <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Title overlay */}
      {title && controlsVisible && (
        <div className="absolute top-0 inset-x-0 p-3">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <p className="relative text-white text-sm font-semibold truncate">{title}</p>
        </div>
      )}
    </div>
  );
}
