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
  const { data, isLoading, error } = useLessonVideoUrl(lessonId);

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
        watermarkSrc="/aiwithrakshith-tech-logo.webp"
      />
    </div>
  );
}
