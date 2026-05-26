import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { StatusBadge, PlatformBadge, TagChip } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { formatRelative } from '../../lib/utils';
import type { Prompt, MediaFile } from '../../lib/database.types';

interface PromptCardProps {
  prompt: Prompt;
  onShare?: (e: React.MouseEvent, prompt: Prompt) => void;
}

function useThumbnail(promptId: string) {
  return useQuery({
    queryKey: ['thumbnail', promptId],
    queryFn: async () => {
      const { data } = await supabase
        .from('media_files')
        .select('*')
        .eq('prompt_id', promptId)
        .eq('file_type', 'image')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      const { data: urlData } = await supabase.storage
        .from('prompt-media')
        .createSignedUrl((data as MediaFile).file_path, 600);
      return urlData?.signedUrl ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function PromptCard({ prompt, onShare }: PromptCardProps) {
  const navigate = useNavigate();
  const { data: thumbnail } = useThumbnail(prompt.id);

  return (
    <div className="group relative text-left w-full bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 transition-all duration-200">
      <button onClick={() => navigate(`/prompts/${prompt.id}`)} className="w-full text-left block">

        {/* Thumbnail — natural aspect ratio, never cropped */}
        <div className="relative bg-gray-800 w-full">
          {thumbnail ? (
            <>
              {/* Invisible spacer that takes the image's natural ratio */}
              <img
                src={thumbnail}
                alt=""
                aria-hidden
                className="w-full block invisible"
                loading="lazy"
              />
              {/* Actual visible image, absolutely positioned over the spacer */}
              <img
                src={thumbnail}
                alt={prompt.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
              />
            </>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-gray-700">
              <Icon name="image" size={36} weight={200} />
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 z-10">
            <StatusBadge status={prompt.status} />
          </div>
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(e, prompt); }}
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 bg-black/60 hover:bg-blue-600/80 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
              title="Share"
            >
              <Icon name="share" size={13} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-2">
          <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-blue-300 transition-colors leading-snug">
            {prompt.title}
          </h3>

          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {prompt.prompt_text}
          </p>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <PlatformBadge platform={prompt.platform} />
              {prompt.tags[0] && <TagChip tag={prompt.tags[0]} />}
              {prompt.tags.length > 1 && (
                <span className="text-xs text-gray-600">+{prompt.tags.length - 1}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
              <Icon name="calendar_today" size={10} />
              <span className="whitespace-nowrap">{formatRelative(prompt.created_at)}</span>
            </div>
          </div>
        </div>

      </button>
    </div>
  );
}
