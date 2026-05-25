import { cn, STATUS_COLORS } from '../../lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full border capitalize', STATUS_COLORS[status] ?? STATUS_COLORS.draft)}>
      {status}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-300 border border-gray-600">
      {platform}
    </span>
  );
}

export function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
      #{tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-white ml-0.5 leading-none"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
