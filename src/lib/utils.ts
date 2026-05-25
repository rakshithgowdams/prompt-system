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
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  ready: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  posted: 'bg-green-500/20 text-green-300 border-green-500/30',
  archived: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

export const PROJECT_COLORS: Record<string, string> = {
  blue: 'from-blue-600 to-blue-800',
  purple: 'from-purple-600 to-purple-800',
  green: 'from-green-600 to-green-800',
  red: 'from-red-600 to-red-800',
  orange: 'from-orange-600 to-orange-800',
  pink: 'from-pink-600 to-pink-800',
  gray: 'from-gray-600 to-gray-800',
};

export const PROJECT_BORDER_COLORS: Record<string, string> = {
  blue: 'border-blue-500/40 hover:border-blue-400',
  purple: 'border-purple-500/40 hover:border-purple-400',
  green: 'border-green-500/40 hover:border-green-400',
  red: 'border-red-500/40 hover:border-red-400',
  orange: 'border-orange-500/40 hover:border-orange-400',
  pink: 'border-pink-500/40 hover:border-pink-400',
  gray: 'border-gray-500/40 hover:border-gray-400',
};
