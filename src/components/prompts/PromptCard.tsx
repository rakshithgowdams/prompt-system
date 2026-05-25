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
      {/* Clickable area */}
      <button onClick={() => navigate(`/prompts/${prompt.id}`)} className="w-full text-left">
      {/* Thumbnail — shorter on mobile, taller on sm+ */}
      <div className="h-36 sm:h-44 bg-gray-800 relative overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={prompt.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <Icon name="image" size={32} weight={200} />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <StatusBadge status={prompt.status} />
        </div>
        {/* Share button overlay */}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(e, prompt); }}
            className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/60 hover:bg-blue-600/80 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            title="Share"
          >
            <Icon name="share" size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-2">
        <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-blue-300 transition-colors leading-snug">
          {prompt.title}
        </h3>

        {/* Prompt preview hidden on the smallest phones to save space */}
        <p className="hidden sm:block text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {prompt.prompt_text}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <PlatformBadge platform={prompt.platform} />
          {prompt.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
          {prompt.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{prompt.tags.length - 2}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Icon name="calendar_today" size={11} />
          {formatRelative(prompt.created_at)}
        </div>
      </div>
      </button>
    </div>
  );
}
