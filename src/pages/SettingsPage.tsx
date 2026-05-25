import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { supabase } from '../lib/supabase';
import { uploadProjectCover, getSignedUrl } from '../lib/storage';
import { cn, PROJECT_COLORS } from '../lib/utils';
import type { Project } from '../lib/database.types';
import { ProjectActionModal } from '../components/projects/ProjectActionModal';

const pwSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const projectSchema = z.object({
  name: z.string().min(1, 'Name required').max(50).regex(/^[a-z0-9_-]+$/i, 'Letters, numbers, hyphens only'),
  color: z.enum(['blue', 'green', 'red', 'orange', 'pink', 'gray']),
});

type PwForm = z.infer<typeof pwSchema>;
type ProjectForm = z.infer<typeof projectSchema>;

const COLOR_OPTIONS = ['blue', 'green', 'red', 'orange', 'pink', 'gray'] as const;

function ProjectCoverThumb({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    getSignedUrl(path, 300).then(setUrl).catch(() => {});
  }, [path]);
  if (!url) return null;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}

// ── Edit-project modal ──────────────────────────────────────────────────────
interface EditProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const updateProject = useUpdateProject();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverDragging, setCoverDragging] = useState(false);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      color: (project?.color as ProjectForm['color']) ?? 'blue',
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (!project) return;
    form.reset({ name: project.name, color: (project.color as ProjectForm['color']) ?? 'blue' });
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(false);
  }, [project?.id]);

  // Load existing cover
  useEffect(() => {
    if (!project?.cover_image) { setExistingCoverUrl(null); return; }
    getSignedUrl(project.cover_image, 3600).then(setExistingCoverUrl).catch(() => {});
  }, [project?.cover_image]);

  const handleCoverFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setCoverFile(file);
    setRemoveCover(false);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (data: ProjectForm) => {
    if (!project) return;
    try {
      let coverPath = project.cover_image;

      if (removeCover) {
        coverPath = null;
      } else if (coverFile && user) {
        coverPath = await uploadProjectCover(user.id, project.id, coverFile);
      }

      await updateProject.mutateAsync({
        id: project.id,
        name: data.name,
        color: data.color,
        cover_image: coverPath,
      });

      toast.success('Project updated!');
      onClose();
    } catch {
      toast.error('Failed to update project');
    }
  };

  const displayPreview = coverPreview ?? (removeCover ? null : existingCoverUrl);

  return (
    <Modal open={!!project} onClose={onClose} title={`Edit "${project?.name}"`}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Cover image */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 block">Cover Image</label>
          <div
            onDrop={(e) => { e.preventDefault(); setCoverDragging(false); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f); }}
            onDragOver={(e) => { e.preventDefault(); setCoverDragging(true); }}
            onDragLeave={() => setCoverDragging(false)}
            onClick={() => coverInputRef.current?.click()}
            className={cn(
              'relative w-full h-36 sm:h-44 rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-200',
              coverDragging ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-800/50',
            )}
          >
            <AnimatePresence mode="wait">
              {displayPreview ? (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <img src={displayPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-sm text-white font-medium bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                      <Icon name="edit" size={15} /> Change image
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                  <div className="w-10 h-10 rounded-2xl bg-gray-700 flex items-center justify-center">
                    <Icon name="add_photo_alternate" size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">Upload cover image</p>
                  <p className="text-xs text-gray-500 hidden sm:block">Drag & drop or click to browse</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {displayPreview && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); setRemoveCover(true); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              <Icon name="delete" size={13} /> Remove image
            </button>
          )}

          <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ''; }}
          />
        </div>

        {/* Name */}
        <Input
          label="Project Name"
          placeholder="e.g. myproject"
          error={form.formState.errors.name?.message}
          hint="Letters, numbers, and hyphens only"
          {...form.register('name')}
        />

        {/* Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 block">
            Accent Color <span className="text-gray-500 font-normal">(fallback when no cover)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => form.setValue('color', color)}
                className={cn(
                  'w-8 h-8 rounded-full bg-gradient-to-br transition-all',
                  PROJECT_COLORS[color],
                  form.watch('color') === color ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={updateProject.isPending}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [actionProject, setActionProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverDragging, setCoverDragging] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const pwForm = useForm<PwForm>({ resolver: zodResolver(pwSchema) });
  const projectForm = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { color: 'blue' },
  });

  const handlePasswordChange = async (data: PwForm) => {
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated!');
    pwForm.reset();
  };

  const handleCoverFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateProject = async (data: ProjectForm) => {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-');
    try {
      const project = await createProject.mutateAsync({
        name: data.name, slug, icon: '📁', color: data.color, cover_image: null,
      });
      if (coverFile && user) {
        const path = await uploadProjectCover(user.id, project.id, coverFile);
        await supabase.from('projects').update({ cover_image: path }).eq('id', project.id);
      }
      toast.success('Project created!');
      closeNewProject();
      setActionProject(project);
    } catch {
      toast.error('Failed to create project');
    }
  };

  const closeNewProject = () => {
    setNewProjectOpen(false);
    setCoverFile(null);
    setCoverPreview(null);
    projectForm.reset({ color: 'blue' });
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(deleteTarget.id);
      toast.success('Project deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Cannot delete this project');
    }
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white"
        >
          Settings
        </motion.h1>

        {/* ── Profile ─────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
            <Icon name="person" size={18} className="text-blue-400 flex-shrink-0" fill />
            <h2 className="font-semibold text-white">Profile</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white text-sm sm:text-base truncate">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Change Password ──────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
            <Icon name="key" size={18} className="text-blue-400 flex-shrink-0" />
            <h2 className="font-semibold text-white">Change Password</h2>
          </div>
          <form onSubmit={pwForm.handleSubmit(handlePasswordChange)} className="space-y-4">
            <div className="relative">
              <Input
                label="New Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                error={pwForm.formState.errors.newPassword?.message}
                className="pr-11"
                {...pwForm.register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 bottom-0 h-11 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
              >
                <Icon name={showPw ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat your password"
              error={pwForm.formState.errors.confirmPassword?.message}
              {...pwForm.register('confirmPassword')}
            />
            <Button type="submit" loading={pwForm.formState.isSubmitting} className="w-full sm:w-auto">
              Update Password
            </Button>
          </form>
        </section>

        {/* ── Projects ────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-800">
            <h2 className="font-semibold text-white">Projects</h2>
            <Button variant="outline" size="sm" onClick={() => setNewProjectOpen(true)}>
              <Icon name="add" size={14} />
              New Project
            </Button>
          </div>

          <div className="space-y-2">
            {(projects ?? []).map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors w-full min-w-0 group"
              >
                {/* Thumbnail */}
                <div className={cn(
                  'w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br',
                  !project.cover_image && (PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray),
                )}>
                  {project.cover_image
                    ? <ProjectCoverThumb path={project.cover_image} />
                    : <Icon name="photo" size={16} className="text-white/70" />
                  }
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">@{project.name}</p>
                  {project.is_default && (
                    <p className="text-xs text-gray-500">Default project</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Edit — available for all projects */}
                  <button
                    onClick={() => setEditProject(project)}
                    className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    aria-label={`Edit ${project.name}`}
                    title="Edit project"
                  >
                    <Icon name="edit" size={15} />
                  </button>

                  {/* Delete — only non-default projects */}
                  {!project.is_default && (
                    <button
                      onClick={() => setDeleteTarget(project)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label={`Delete ${project.name}`}
                      title="Delete project"
                    >
                      <Icon name="delete" size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {projects?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No projects yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* ── New project modal ──────────────────────────────────────── */}
      <Modal open={newProjectOpen} onClose={closeNewProject} title="New Project">
        <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 block">Project Cover Image</label>
            <div
              onDrop={(e) => { e.preventDefault(); setCoverDragging(false); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setCoverDragging(true); }}
              onDragLeave={() => setCoverDragging(false)}
              onClick={() => coverInputRef.current?.click()}
              className={cn(
                'relative w-full h-36 sm:h-44 rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-200',
                coverDragging ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-800/50',
              )}
            >
              <AnimatePresence mode="wait">
                {coverPreview ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-sm text-white font-medium bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                        <Icon name="edit" size={15} /> Change image
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-700 flex items-center justify-center">
                      <Icon name="add_photo_alternate" size={22} className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-300">Upload cover image</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Drag & drop or click to browse</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {coverPreview && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
                <Icon name="delete" size={13} /> Remove image
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ''; }}
            />
          </div>

          <Input
            label="Project Name"
            placeholder="e.g. myproject"
            error={projectForm.formState.errors.name?.message}
            hint="Letters, numbers, and hyphens only"
            {...projectForm.register('name')}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 block">
              Accent Color <span className="text-gray-500 font-normal">(fallback when no cover)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button key={color} type="button" onClick={() => projectForm.setValue('color', color)}
                  className={cn('w-8 h-8 rounded-full bg-gradient-to-br transition-all', PROJECT_COLORS[color],
                    projectForm.watch('color') === color ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100')}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" loading={createProject.isPending}>Create Project</Button>
        </form>
      </Modal>

      {/* ── Edit project modal ─────────────────────────────────────── */}
      <EditProjectModal project={editProject} onClose={() => setEditProject(null)} />

      {/* ── Delete confirm ─────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Delete "@${deleteTarget?.name}" and all its prompts? This cannot be undone.`}
        loading={deleteProject.isPending}
      />

      {/* ── Post-creation action modal ─────────────────────────────── */}
      {actionProject && (
        <ProjectActionModal
          open={!!actionProject}
          onClose={() => setActionProject(null)}
          project={actionProject}
        />
      )}
    </>
  );
}
