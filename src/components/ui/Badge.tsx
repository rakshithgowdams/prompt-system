import { cn, STATUS_COLORS } from '../../lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full border capitalize', STATUS_COLORS[status] ?? STATUS_COLORS.draft)}>
      {status}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-ink-100 text-ink-700 border border-ink-300">
      {platform}
    </span>
  );
}

export function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-600 border border-brand-100">
      #{tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-brand-900 ml-0.5 leading-none"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
