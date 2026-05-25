import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// ── Base shimmer skeleton ────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-gray-800/80',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent',
        'before:animate-[skeleton-sweep_1.8s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

// ── Prompt card skeleton ─────────────────────────────────────────────────────

export function PromptCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
    >
      <Skeleton className="h-3 w-full rounded-none rounded-t-2xl bg-gray-700/50" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Project card skeleton ────────────────────────────────────────────────────

export function ProjectCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Skeleton className="h-52 w-full rounded-2xl" />
    </motion.div>
  );
}

// ── File/folder grid skeleton ────────────────────────────────────────────────

export function FileGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.025 }}
        >
          <Skeleton className="aspect-square rounded-2xl" />
        </motion.div>
      ))}
    </div>
  );
}

// ── List row skeleton ────────────────────────────────────────────────────────

export function ListRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-4 p-3"
        >
          <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-16 hidden sm:block" />
          <Skeleton className="h-3 w-12 hidden sm:block" />
        </motion.div>
      ))}
    </div>
  );
}

// ── Todo card skeleton ───────────────────────────────────────────────────────

export function TodoCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-2xl"
        >
          <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-5 w-28 rounded-md" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Page header skeleton ─────────────────────────────────────────────────────

export function PageHeaderSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </motion.div>
  );
}
