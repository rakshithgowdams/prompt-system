import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, Lock, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePublishedPrompts } from '../hooks/usePrompts';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import type { Prompt } from '../lib/database.types';

const PLATFORMS = ['All', 'Veo 3', 'Seedance 2.0', 'Midjourney', 'ChatGPT', 'Claude', 'Other'] as const;
const PLATFORM_COLORS: Record<string, string> = {
  'Veo 3':        'bg-blue-100 text-blue-700 border-blue-200',
  'Seedance 2.0': 'bg-amber-100 text-amber-700 border-amber-200',
  'Midjourney':   'bg-rose-100 text-rose-700 border-rose-200',
  'ChatGPT':      'bg-green-100 text-green-700 border-green-200',
  'Claude':       'bg-orange-100 text-orange-700 border-orange-200',
  'Other':        'bg-ink-100 text-ink-700 border-ink-200',
};

function PromptCard({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopied(true);
      toast.success('Prompt copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const platformColor = PLATFORM_COLORS[prompt.platform] ?? PLATFORM_COLORS['Other'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-white border border-ink-300 rounded-2xl p-5 hover:border-ink-500 hover:shadow-card-hover transition-all duration-200 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-ink-900 text-base leading-snug line-clamp-2 mb-1.5">
            {prompt.title}
          </h3>
          <div className="flex items-center flex-wrap gap-1.5">
            <span className={cn('inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border', platformColor)}>
              {prompt.platform}
            </span>
            {prompt.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-500 border border-ink-300">
                #{tag}
              </span>
            ))}
            {prompt.tags.length > 2 && (
              <span className="text-[11px] text-ink-400">+{prompt.tags.length - 2}</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            <Globe size={10} />
            Public
          </span>
        </div>
      </div>

      {/* Prompt text preview */}
      <div className="relative">
        <div className="bg-ink-100 rounded-xl p-4 border border-ink-300">
          <p className="text-sm text-ink-700 leading-relaxed line-clamp-4 font-mono whitespace-pre-wrap">
            {prompt.prompt_text}
          </p>
          {prompt.prompt_text.length > 200 && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-ink-100 to-transparent rounded-b-xl pointer-events-none" />
          )}
        </div>
      </div>

      {/* Notes preview */}
      {prompt.notes && (
        <p className="text-xs text-ink-500 leading-relaxed line-clamp-2 border-l-2 border-ink-300 pl-3">
          {prompt.notes}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-ink-300">
        <p className="text-xs text-ink-500">
          {new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <button
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150',
            copied
              ? 'bg-green-50 text-green-700 border-green-300'
              : 'bg-white text-ink-700 border-ink-300 hover:bg-ink-900 hover:text-white hover:border-ink-900',
          )}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-ink-300 rounded-2xl p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="flex justify-between pt-1 border-t border-ink-300">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function ExplorePromptsPage() {
  const navigate = useNavigate();
  const { data: prompts = [], isLoading } = usePublishedPrompts();
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('All');

  const filtered = useMemo(() => {
    let list = prompts;
    if (activePlatform !== 'All') {
      list = list.filter((p) => p.platform === activePlatform);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.prompt_text.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.platform.toLowerCase().includes(q),
      );
    }
    return list;
  }, [prompts, search, activePlatform]);

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Hero */}
      <div className="bg-white border-b border-ink-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold text-ink-500 uppercase tracking-wider">Community</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink-900 tracking-tight mb-2">
              Explore Prompts
            </h1>
            <p className="text-ink-500 text-base max-w-lg leading-relaxed">
              Discover and copy AI prompts published by the community. Use them directly or as inspiration.
            </p>

            <div className="flex items-center gap-3 mt-6 text-sm text-ink-500">
              <span className="flex items-center gap-1.5 font-semibold text-ink-900">
                <Globe size={14} className="text-green-600" />
                {isLoading ? '—' : prompts.length} public prompt{prompts.length !== 1 ? 's' : ''}
              </span>
              <span>·</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 hover:text-ink-900 transition-colors"
              >
                <Lock size={13} />
                Manage your private prompts
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-white border-b border-ink-300 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts, tags, platforms..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-ink-300 rounded-lg bg-ink-100 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent placeholder:text-ink-500 text-ink-900"
            />
          </div>

          {/* Platform pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={cn(
                  'whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 flex-shrink-0',
                  activePlatform === p
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white text-ink-700 border-ink-300 hover:border-ink-700',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white border border-ink-300 flex items-center justify-center mb-4">
              <Globe size={28} className="text-ink-400" />
            </div>
            <p className="text-lg font-display font-bold text-ink-900 mb-2">
              {search || activePlatform !== 'All' ? 'No matching prompts' : 'No published prompts yet'}
            </p>
            <p className="text-sm text-ink-500 max-w-xs leading-relaxed">
              {search || activePlatform !== 'All'
                ? 'Try a different search term or filter.'
                : 'Be the first! Open any prompt you own and toggle it to Published.'}
            </p>
            {!(search || activePlatform !== 'All') && (
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-6 bg-ink-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-ink-700 transition-colors"
              >
                Go to my prompts
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-ink-500">
                {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
                {(search || activePlatform !== 'All') && ' found'}
              </p>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filtered.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
