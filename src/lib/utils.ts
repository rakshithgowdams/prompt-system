export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelative(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(dateString);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-700 border-slate-200',
  ready:    'bg-blue-100 text-blue-700 border-blue-200',
  posted:   'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-orange-100 text-orange-700 border-orange-200',
};

export const PROJECT_COLORS: Record<string, string> = {
  blue:   'from-blue-600 to-blue-800',
  purple: 'from-brand-400 to-brand-700',
  green:  'from-green-600 to-green-800',
  red:    'from-red-600 to-red-800',
  orange: 'from-orange-600 to-orange-800',
  pink:   'from-pink-600 to-pink-800',
  gray:   'from-ink-500 to-ink-700',
};

export const PROJECT_BORDER_COLORS: Record<string, string> = {
  blue:   'border-blue-300 hover:border-blue-500',
  purple: 'border-brand-200 hover:border-brand-400',
  green:  'border-green-300 hover:border-green-500',
  red:    'border-red-300 hover:border-red-500',
  orange: 'border-orange-300 hover:border-orange-500',
  pink:   'border-pink-300 hover:border-pink-500',
  gray:   'border-ink-300 hover:border-ink-500',
};
