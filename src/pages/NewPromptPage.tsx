import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Icon } from '../components/ui/Icon';
import { useProject } from '../hooks/useProjects';
import { useCreatePrompt } from '../hooks/usePrompts';
import { MediaUpload } from '../components/prompts/MediaUpload';
import { TagInput } from '../components/prompts/TagInput';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { PLATFORMS, STATUSES } from '../lib/database.types';

const schema = z.object({
  title: z.string({ error: 'Title is required' }).min(1, 'Title is required').max(200),
  prompt_text: z.string({ error: 'Prompt text is required' }).min(1, 'Prompt text is required'),
  platform: z.string({ error: 'Select a platform' }).min(1, 'Select a platform'),
  notes: z.string().optional(),
  status: z.enum(['draft', 'ready', 'posted', 'archived']),
});

type FormData = z.infer<typeof schema>;

export function NewPromptPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(slug ?? '');
  const createPrompt = useCreatePrompt();
  const [tags, setTags] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', platform: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (!project) return;
    try {
      const prompt = await createPrompt.mutateAsync({
        ...data,
        project_id: project.id,
        tags,
        notes: data.notes || null,
      });
      setCreatedId(prompt.id);
      toast.success('Prompt created!');
    } catch (err) {
      toast.error('Failed to create prompt');
    }
  };

  const handleFinish = () => {
    if (createdId) navigate(`/prompts/${createdId}`);
    else navigate(`/projects/${slug}`);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/projects/${slug}`)}
          className="p-2 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">New Prompt</h1>
          {project && <p className="text-sm text-ink-500">in @{project.name}</p>}
        </div>
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

        {!createdId ? (
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Create Prompt
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-success text-sm font-medium text-center">Prompt created! You can now add media files below.</p>
            </div>
            <MediaUpload promptId={createdId} existingFiles={[]} />
            <Button type="button" onClick={handleFinish} className="w-full" size="lg" variant="secondary">
              Done — View Prompt
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
