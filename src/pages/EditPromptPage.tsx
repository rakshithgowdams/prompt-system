import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { usePrompt, useUpdatePrompt, usePromptMedia, useDeleteMediaFile } from '../hooks/usePrompts';
import { MediaUpload } from '../components/prompts/MediaUpload';
import { TagInput } from '../components/prompts/TagInput';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { PLATFORMS, STATUSES } from '../lib/database.types';
import { Skeleton } from '../components/ui/Skeleton';
import { getSignedUrl, formatFileSize } from '../lib/storage';
import { cn } from '../lib/utils';
import type { MediaFile } from '../lib/database.types';

const schema = z.object({
  title: z.string({ error: 'Title is required' }).min(1, 'Title is required').max(200),
  prompt_text: z.string({ error: 'Prompt text is required' }).min(1, 'Prompt text is required'),
  platform: z.string({ error: 'Select a platform' }).min(1, 'Select a platform'),
  notes: z.string().optional(),
  status: z.enum(['draft', 'ready', 'posted', 'archived']),
});

type FormData = z.infer<typeof schema>;

function MediaFileIcon({ f }: { f: MediaFile }) {
  switch (f.file_type) {
    case 'video': return <Icon name="videocam" size={18} />;
    case 'audio': return <Icon name="music_note" size={18} />;
    case 'document': return <Icon name="description" size={18} />;
    default: return <Icon name="attach_file" size={18} />;
  }
}

function mediaFileColor(f: MediaFile): string {
  switch (f.file_type) {
    case 'video': return 'text-brand-400 bg-brand-50';
    case 'audio': return 'text-pink-500 bg-pink-50';
    case 'document': return 'text-amber-600 bg-amber-50';
    default: return 'text-ink-500 bg-ink-100';
  }
}

export function EditPromptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: prompt, isLoading } = usePrompt(id ?? '');
  const { data: mediaFiles = [], refetch: refetchMedia } = usePromptMedia(id ?? '');
  const updatePrompt = useUpdatePrompt();
  const deleteMedia = useDeleteMediaFile();
  const [tags, setTags] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (prompt) {
      reset({
        title: prompt.title,
        prompt_text: prompt.prompt_text,
        platform: prompt.platform,
        notes: prompt.notes ?? '',
        status: prompt.status,
      });
      setTags(prompt.tags);
    }
  }, [prompt, reset]);

  useEffect(() => {
    const loadThumbnails = async () => {
      const urls: Record<string, string> = {};
      for (const f of mediaFiles) {
        if (f.file_type === 'image') {
          try {
            urls[f.id] = await getSignedUrl(f.file_path, 600);
          } catch { /* skip */ }
        }
      }
      setThumbnails(urls);
    };
    if (mediaFiles.length > 0) loadThumbnails();
  }, [mediaFiles]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    try {
      await updatePrompt.mutateAsync({ id, ...data, tags, notes: data.notes || null });
      toast.success('Prompt updated!');
      navigate(`/prompts/${id}`);
    } catch {
      toast.error('Failed to update prompt');
    }
  };

  const handleDeleteMedia = async (fileId: string, filePath: string) => {
    if (!id) return;
    try {
      await deleteMedia.mutateAsync({ id: fileId, promptId: id, filePath });
      toast.success('File removed');
    } catch {
      toast.error('Failed to remove file');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (!prompt) return <div className="p-8 text-center text-ink-500">Prompt not found.</div>;

  const imageFiles = mediaFiles.filter((f) => f.file_type === 'image');
  const nonImageFiles = mediaFiles.filter((f) => f.file_type !== 'image');

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/prompts/${id}`)}
          className="p-2 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-ink-900">Edit Prompt</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Title *"
          placeholder="Give your prompt a memorable title"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Prompt Text *"
          placeholder="Write your full AI prompt here..."
          rows={8}
          error={errors.prompt_text?.message}
          {...register('prompt_text')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Platform *"
            options={[{ value: '', label: 'Select platform' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]}
            error={errors.platform?.message}
            {...register('platform')}
          />
          <Select
            label="Status"
            options={STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            {...register('status')}
          />
        </div>

        <TagInput tags={tags} onChange={setTags} />

        <Textarea
          label="Notes"
          placeholder="Add any notes, variations, or results..."
          rows={4}
          {...register('notes')}
        />

        {/* Existing files */}
        {mediaFiles.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">
              Current Attachments
              <span className="ml-2 text-xs font-normal text-ink-500">({mediaFiles.length})</span>
            </p>

            {/* Image grid */}
            {imageFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {imageFiles.map((f) => (
                  <div key={f.id} className="relative group aspect-square rounded-md overflow-hidden bg-ink-100 border border-ink-300">
                    {thumbnails[f.id] ? (
                      <img src={thumbnails[f.id]} alt={f.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-400">
                        <Icon name="image" size={24} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(f.id, f.file_path)}
                      className="absolute top-1 right-1 w-6 h-6 bg-danger rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Icon name="close" size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                      <p className="text-xs text-white truncate">{f.file_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Non-image files list */}
            {nonImageFiles.length > 0 && (
              <div className="space-y-1.5">
                {nonImageFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 bg-white border border-ink-300 rounded-md"
                  >
                    <div className={cn('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0', mediaFileColor(f))}>
                      <MediaFileIcon f={f} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-900 truncate">{f.file_name}</p>
                      {f.file_size && (
                        <p className="text-xs text-ink-500">{formatFileSize(f.file_size)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(f.id, f.file_path)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-ink-500 hover:text-danger hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <MediaUpload promptId={id!} existingFiles={mediaFiles} onFilesChange={() => refetchMedia()} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/prompts/${id}`)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
