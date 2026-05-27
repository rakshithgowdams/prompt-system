import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../ui/Icon';
import { VideoPlayer } from './VideoPlayer';
import type { TimelineMarker } from './VideoPlayer';

interface Props {
  lessonId: string;
  title?: string;
  markers?: TimelineMarker[];
  videoRef?: React.RefObject<HTMLVideoElement>;
  onTimeUpdate?: (seconds: number) => void;
  initialTime?: number;
  className?: string;
}

interface SignedVideoData {
  signed_url: string;
  expires_in: number;
  watermark: string;
  user_id: string;
}

function useLessonVideoUrl(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lesson-video', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase.functions.invoke('get-lesson-video', {
        body: { lesson_id: lessonId },
      });
      if (error) throw error;
      return data as SignedVideoData;
    },
    enabled: !!lessonId,
    refetchInterval: 4 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    retry: 1,
  });
}

export function WatermarkedVideo({ lessonId, title, markers = [], videoRef, onTimeUpdate, initialTime, className }: Props) {
  const { user } = useAuth();
  const { data, isLoading, error } = useLessonVideoUrl(lessonId);
  const [pos1, setPos1] = useState({ top: '15%', left: '10%' });
  const [pos2, setPos2] = useState({ top: '60%', left: '70%' });

  const watermarkText =
    data?.watermark ?? user?.email ?? user?.id?.slice(0, 8) ?? 'protected';
  const shortId = (data?.user_id ?? user?.id ?? '').slice(0, 8);

  useEffect(() => {
    if (!watermarkText) return;
    const move = () => {
      setPos1({
        top: `${10 + Math.random() * 65}%`,
        left: `${5 + Math.random() * 60}%`,
      });
      setPos2({
        top: `${10 + Math.random() * 65}%`,
        left: `${30 + Math.random() * 60}%`,
      });
    };
    move();
    const interval = setInterval(move, 4000);
    return () => clearInterval(interval);
  }, [watermarkText]);

  if (isLoading) {
    return (
      <div className={`watermarked-video-container flex items-center justify-center bg-black aspect-video ${className ?? ''}`}>
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    const errorMsg = (error as any)?.message ?? '';
    const isForbidden = errorMsg.includes('not_enrolled') ||
                       (error as any)?.context?.status === 403;
    return (
      <div className={`watermarked-video-container flex items-center justify-center bg-black aspect-video p-6 text-white text-center ${className ?? ''}`}>
        <div className="max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon name={isForbidden ? 'lock' : 'error_outline'} size={32} className="text-white/40" />
          </div>
          <p className="font-bold text-lg mb-2">
            {isForbidden ? 'Enrollment Required' : 'Video Unavailable'}
          </p>
          <p className="text-sm text-white/60">
            {isForbidden
              ? 'Enroll in this course to watch this lesson.'
              : 'Could not load this video. Please refresh the page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`watermarked-video-container relative bg-black overflow-hidden ${className ?? ''}`}>
      <VideoPlayer
        src={data.signed_url}
        title={title}
        markers={markers}
        videoRef={videoRef}
        onTimeUpdate={onTimeUpdate}
        initialTime={initialTime}
      />

      {/* Primary moving watermark */}
      <div
        className="absolute pointer-events-none select-none transition-all duration-[2000ms] ease-in-out z-[5]"
        style={{
          top: pos1.top,
          left: pos1.left,
          opacity: 0.45,
          color: 'white',
          fontSize: 'clamp(11px, 1.4vw, 16px)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          textShadow: '0 0 12px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.95), 1px 1px 2px rgba(0,0,0,0.9)',
          mixBlendMode: 'difference',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        {watermarkText}
      </div>

      {/* Secondary watermark */}
      <div
        className="absolute pointer-events-none select-none transition-all duration-[2000ms] ease-in-out z-[5]"
        style={{
          top: pos2.top,
          left: pos2.left,
          opacity: 0.35,
          color: 'white',
          fontSize: 'clamp(9px, 1.1vw, 13px)',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          textShadow: '0 0 10px rgba(0,0,0,0.95), 1px 1px 2px rgba(0,0,0,0.9)',
          mixBlendMode: 'difference',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        aiwithrakshith.tech | {shortId}
      </div>

      {/* Persistent corner watermark */}
      <div
        className="absolute pointer-events-none select-none bottom-14 right-3 z-[5]"
        style={{
          opacity: 0.55,
          color: 'white',
          fontSize: '10px',
          fontFamily: 'ui-monospace, monospace',
          textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        {shortId}
      </div>
    </div>
  );
}
