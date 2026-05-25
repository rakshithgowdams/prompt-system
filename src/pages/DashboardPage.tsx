import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { usePrompts } from '../hooks/usePrompts';
import { ProjectCardSkeleton, PromptCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PromptCard } from '../components/prompts/PromptCard';
import { FileShareModal } from '../components/files/FileShareModal';
import { Icon } from '../components/ui/Icon';
import { getSignedUrl } from '../lib/storage';
import { cn, PROJECT_COLORS, PROJECT_BORDER_COLORS } from '../lib/utils';
import type { Project } from '../lib/database.types';

function ProjectCard({ project, promptCount, onClick, onFilesClick, onShare }: {
  project: Project;
  promptCount: number;
  onClick: () => void;
  onFilesClick: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
}) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!project.cover_image) return;
    getSignedUrl(project.cover_image, 3600).then(setCoverUrl).catch(() => {});
  }, [project.cover_image]);

  const hasCover = !!coverUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-black/50 transition-shadow duration-300"
      onClick={onClick}
    >
      {/* Background */}
      <div className="relative w-full h-52">
        {hasCover ? (
          <>
            <img
              src={coverUrl!}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient scrim for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        ) : (
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br',
            PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray,
          )}>
            {/* Subtle pattern for no-image state */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        )}

        {/* Glassmorphism info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-3.5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white leading-tight truncate">
                  @{project.name}
                </h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-white/70">
                    <Icon name="auto_awesome" size={12} className="text-white/60" />
                    {promptCount} prompt{promptCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/70">
                    <Icon name="schedule" size={12} className="text-white/60" />
                    {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={onFilesClick}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium transition-all active:scale-95"
                >
                  <Icon name="folder_open" size={13} />
                  Files
                </button>
                <button
                  onClick={onShare}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium transition-all active:scale-95"
                  title="Share project files"
                >
                  <Icon name="share" size={13} />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top-right badge when no cover */}
        {!hasCover && (
          <div className="absolute top-3 right-3 w-9 h-9 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 flex items-center justify-center">
            <Icon name="photo" size={18} className="text-white/60" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: recentPrompts, isLoading: promptsLoading } = usePrompts();
  const [shareProject, setShareProject] = useState<Project | null>(null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.email?.split('@')[0] ?? 'there';

  return (
    <>
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          {greeting()}, <span className="text-blue-400">{userName}</span>
        </h1>
        <p className="text-gray-400 mt-1">Manage your AI prompts across your channels</p>
      </motion.div>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <Icon name="settings" size={14} />
            Manage
          </button>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project, i) => {
              const count = recentPrompts?.filter((p) => p.project_id === project.id).length ?? 0;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <ProjectCard
                    project={project}
                    promptCount={count}
                    onClick={() => navigate(`/projects/${project.slug}`)}
                    onFilesClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.slug}/files`); }}
                    onShare={(e) => { e.stopPropagation(); setShareProject(project); }}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="photo_library" size={24} className="text-gray-500" />}
            title="No projects yet"
            description="Projects are created automatically when you sign up."
          />
        )}
      </section>

      {/* Recent Prompts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Prompts</h2>
        </div>

        {promptsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
          </div>
        ) : recentPrompts && recentPrompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPrompts.slice(0, 6).map((prompt, i) => {
              const proj = projects?.find((p) => p.id === prompt.project_id) ?? null;
              return (
                <motion.div key={prompt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <PromptCard
                    prompt={prompt}
                    onShare={(e) => { e.stopPropagation(); if (proj) setShareProject(proj); }}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="add_circle" size={24} className="text-gray-500" />}
            title="No prompts yet"
            description="Select a project and create your first prompt."
          />
        )}
      </section>
    </div>

    {/* Project share modal */}
    {shareProject && (
      <FileShareModal
        open={!!shareProject}
        onClose={() => setShareProject(null)}
        projectId={shareProject.id}
      />
    )}
  </>
  );
}
