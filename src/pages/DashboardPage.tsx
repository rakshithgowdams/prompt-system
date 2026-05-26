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
  const [coverLoading, setCoverLoading] = useState(!!project.cover_image);

  useEffect(() => {
    if (!project.cover_image) { setCoverLoading(false); return; }
    setCoverLoading(true);
    getSignedUrl(project.cover_image, 3600)
      .then(setCoverUrl)
      .catch(() => {})
      .finally(() => setCoverLoading(false));
  }, [project.cover_image]);

  const hasCover = !!coverUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer border',
        'hover:shadow-card-hover transition-shadow duration-150',
        PROJECT_BORDER_COLORS[project.color] ?? PROJECT_BORDER_COLORS.gray,
      )}
      onClick={onClick}
    >
      <div className="relative w-full h-48">
        {coverLoading ? (
          <div className="absolute inset-0 overflow-hidden bg-ink-200 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[skeleton-sweep_1.8s_ease-in-out_infinite]" />
        ) : hasCover ? (
          <>
            <img
              src={coverUrl!}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br', PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray)}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight truncate">@{project.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-white/70">
                  <Icon name="auto_awesome" size={11} />
                  {promptCount} prompt{promptCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onFilesClick}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[11px] font-medium transition-all"
              >
                <Icon name="folder_open" size={12} />
                Files
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[11px] font-medium transition-all"
              >
                <Icon name="share" size={12} />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const PAGE_SIZE = 6;

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: recentPrompts, isLoading: promptsLoading } = usePrompts();
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [promptPage, setPromptPage] = useState(0);

  useEffect(() => { setPromptPage(0); }, [recentPrompts?.length]);

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
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <h1 className="text-2xl lg:text-3xl font-display font-extrabold text-ink-900 tracking-tight">
            {greeting()}, <span className="text-brand-400">{userName}</span>
          </h1>
          <p className="text-ink-500 mt-1 text-sm">Manage your AI prompts across your channels</p>
        </motion.div>

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-ink-900">Projects</h2>
            <button
              onClick={() => navigate('/settings')}
              className="text-sm text-brand-400 hover:text-brand-500 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Icon name="settings" size={14} />
              Manage
            </button>
          </div>

          {projectsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, i) => {
                const count = recentPrompts?.filter((p) => p.project_id === project.id).length ?? 0;
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
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
              icon={<Icon name="photo_library" size={24} />}
              title="No projects yet"
              description="Projects are created automatically when you sign up."
            />
          )}
        </section>

        {/* Recent Prompts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-bold text-ink-900">Recent Prompts</h2>
              {recentPrompts && recentPrompts.length > 0 && (
                <span className="text-xs text-ink-500 bg-ink-100 border border-ink-300 px-2 py-0.5 rounded-full">
                  {recentPrompts.length}
                </span>
              )}
            </div>
            {recentPrompts && recentPrompts.length > PAGE_SIZE && (
              <span className="text-xs text-ink-500">
                Page {promptPage + 1} of {Math.ceil(recentPrompts.length / PAGE_SIZE)}
              </span>
            )}
          </div>

          {promptsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <PromptCardSkeleton key={i} />)}
            </div>
          ) : recentPrompts && recentPrompts.length > 0 ? (
            <>
              <motion.div
                key={promptPage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {recentPrompts
                  .slice(promptPage * PAGE_SIZE, (promptPage + 1) * PAGE_SIZE)
                  .map((prompt, i) => {
                    const proj = projects?.find((p) => p.id === prompt.project_id) ?? null;
                    return (
                      <motion.div
                        key={prompt.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <PromptCard
                          prompt={prompt}
                          onShare={(e) => { e.stopPropagation(); if (proj) setShareProject(proj); }}
                        />
                      </motion.div>
                    );
                  })}
              </motion.div>

              {recentPrompts.length > PAGE_SIZE && (() => {
                const totalPages = Math.ceil(recentPrompts.length / PAGE_SIZE);
                return (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => setPromptPage((p) => Math.max(0, p - 1))}
                      disabled={promptPage === 0}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-ink-300"
                    >
                      <Icon name="chevron_left" size={18} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPromptPage(idx)}
                          className={cn(
                            'rounded-full transition-all duration-200',
                            idx === promptPage
                              ? 'w-5 h-2 bg-brand-400'
                              : 'w-2 h-2 bg-ink-300 hover:bg-ink-500',
                          )}
                          aria-label={`Page ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setPromptPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={promptPage === totalPages - 1}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-ink-300"
                    >
                      <Icon name="chevron_right" size={18} />
                    </button>
                  </div>
                );
              })()}
            </>
          ) : (
            <EmptyState
              icon={<Icon name="add_circle" size={24} />}
              title="No prompts yet"
              description="Select a project and create your first prompt."
            />
          )}
        </section>
      </div>

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
