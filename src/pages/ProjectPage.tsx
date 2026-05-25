import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../hooks/useProjects';
import { usePrompts } from '../hooks/usePrompts';
import { useNotionPages, useDeleteNotionPage } from '../hooks/useNotionPages';
import { PromptCard } from '../components/prompts/PromptCard';
import { FileShareModal } from '../components/files/FileShareModal';
import { PromptCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { ProjectActionModal } from '../components/projects/ProjectActionModal';
import { cn, PROJECT_COLORS, formatRelative } from '../lib/utils';
import { PLATFORMS, STATUSES } from '../lib/database.types';
import { toast } from 'sonner';
import type { NotionPage } from '../lib/database.types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'A → Z' },
  { value: 'modified', label: 'Recently modified' },
];

type Tab = 'prompts' | 'pages';

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(slug ?? '');
  const { data: allPrompts, isLoading: promptsLoading } = usePrompts(project?.id);
  const { data: pages = [], isLoading: pagesLoading } = useNotionPages(project?.id ?? '');
  const deletePage = useDeleteNotionPage();

  const [tab, setTab] = useState<Tab>('prompts');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!allPrompts) return [];
    let list = [...allPrompts];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.prompt_text.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (platformFilter) list = list.filter((p) => p.platform === platformFilter);

    list.sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'az') return a.title.localeCompare(b.title);
      if (sort === 'modified') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return 0;
    });

    return list;
  }, [allPrompts, search, statusFilter, platformFilter, sort]);

  const handleDeletePage = async (page: NotionPage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project) return;
    try {
      await deletePage.mutateAsync({ id: page.id, projectId: project.id });
      toast.success('Page deleted');
    } catch {
      toast.error('Failed to delete page');
    }
  };

  if (projectLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="h-32 bg-gray-800 rounded-2xl animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center"><p className="text-gray-400">Project not found.</p></div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Project header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-5 sm:p-6 rounded-2xl bg-gradient-to-br text-white relative overflow-hidden',
          PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray,
        )}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl sm:text-3xl">{project.icon}</span>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">@{project.name}</h1>
                  <p className="text-white/70 text-xs sm:text-sm">
                    {allPrompts?.length ?? 0} prompt{(allPrompts?.length ?? 0) !== 1 ? 's' : ''} · {pages.length} page{pages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setActionOpen(true)}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white border-white/20"
              variant="outline"
              size="sm"
            >
              <Icon name="add" size={16} />
              <span className="hidden xs:inline">New</span>
            </Button>
          </div>

          {/* Quick nav pills */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate(`/projects/${slug}/files`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <Icon name="folder_open" size={13} />
              Files
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <Icon name="share" size={13} />
              Share
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['prompts', 'pages'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:text-white',
            )}
          >
            {t === 'prompts' ? `Prompts${allPrompts ? ` (${allPrompts.length})` : ''}` : `Pages${pages.length ? ` (${pages.length})` : ''}`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'prompts' ? (
          <motion.div
            key="prompts"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <Icon name="search" size={17} />
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search prompts..."
                    className="w-full h-11 pl-9 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-600 transition-colors"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'h-11 w-11 flex items-center justify-center rounded-xl border text-sm transition-colors',
                    showFilters
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600',
                  )}
                >
                  <Icon name="tune" size={17} />
                </button>
                <div className="hidden sm:flex items-center gap-2">
                  <Icon name="swap_vert" size={15} className="text-gray-500" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-11 px-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {showFilters && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-3">
                  <Select
                    options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 min-w-32 h-9 text-xs"
                  />
                  <Select
                    options={[{ value: '', label: 'All platforms' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]}
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="flex-1 min-w-32 h-9 text-xs"
                  />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="sm:hidden flex-1 min-w-32 h-9 px-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xs focus:outline-none"
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </motion.div>
              )}
            </div>

            {promptsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <PromptCardSkeleton key={i} />)}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((prompt, i) => (
                  <motion.div key={prompt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <PromptCard prompt={prompt} onShare={() => setShareOpen(true)} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Icon name="description" size={24} className="text-gray-500" />}
                title={search || statusFilter || platformFilter ? 'No prompts match your filters' : 'No prompts yet'}
                description={search || statusFilter || platformFilter ? 'Try adjusting your search or filters.' : 'Create your first prompt for this channel.'}
                action={!search && !statusFilter && !platformFilter ? {
                  label: '+ New Prompt',
                  onClick: () => setActionOpen(true),
                } : undefined}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="pages"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
          >
            {pagesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : pages.length === 0 ? (
              <EmptyState
                icon={<Icon name="article" size={24} className="text-gray-500" />}
                title="No pages yet"
                description="Create a Notion-style page to write notes, docs, and more."
                action={{ label: '+ New Page', onClick: () => setActionOpen(true) }}
              />
            ) : (
              <div className="space-y-2">
                {pages.map((page, i) => (
                  <motion.button
                    key={page.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/projects/${slug}/pages/${page.id}`)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-600 hover:bg-gray-800/50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {page.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{page.title || 'Untitled'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Updated {formatRelative(page.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeletePage(page, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete page"
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                    <Icon name="chevron_right" size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </motion.button>
                ))}
                <button
                  onClick={() => setActionOpen(true)}
                  className="w-full flex items-center gap-3 p-4 border border-dashed border-gray-700 hover:border-gray-500 rounded-2xl text-gray-500 hover:text-gray-300 transition-all text-sm"
                >
                  <Icon name="add" size={18} />
                  New page
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB on mobile */}
      <button
        onClick={() => setActionOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl shadow-blue-900/40 flex items-center justify-center transition-all active:scale-95 z-10"
        aria-label="New item"
      >
        <Icon name="add" size={24} />
      </button>

      {project && (
        <ProjectActionModal
          open={actionOpen}
          onClose={() => setActionOpen(false)}
          project={project}
        />
      )}

      {project && (
        <FileShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={project.id}
        />
      )}
    </div>
  );
}
