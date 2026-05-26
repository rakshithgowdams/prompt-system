import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { useCreateNotionPage } from '../../hooks/useNotionPages';
import { cn } from '../../lib/utils';
import type { Project } from '../../lib/database.types';

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project;
}

const ACTIONS = [
  {
    id: 'prompt',
    icon: 'auto_awesome',
    label: 'Create a Prompt',
    desc: 'Build an AI prompt with media attachments',
    color: 'from-brand-50 to-white border-brand-100 hover:border-brand-300',
    iconColor: 'text-brand-400 bg-brand-50',
  },
  {
    id: 'page',
    icon: 'article',
    label: 'Create a Page',
    desc: 'Write notes, docs, and content like Notion',
    color: 'from-green-50 to-white border-green-200 hover:border-green-400',
    iconColor: 'text-success bg-green-50',
  },
  {
    id: 'folder',
    icon: 'create_new_folder',
    label: 'Upload Files',
    desc: 'Add files, images, videos into your drive',
    color: 'from-amber-50 to-white border-amber-200 hover:border-amber-400',
    iconColor: 'text-amber-600 bg-amber-50',
  },
] as const;

type ActionId = (typeof ACTIONS)[number]['id'];

export function ProjectActionModal({ open, onClose, project }: Props) {
  const navigate = useNavigate();
  const createPage = useCreateNotionPage();
  const [loading, setLoading] = useState<ActionId | null>(null);

  const handleAction = async (id: ActionId) => {
    setLoading(id);
    try {
      if (id === 'prompt') {
        navigate(`/projects/${project.slug}/new`);
        onClose();
      } else if (id === 'page') {
        const page = await createPage.mutateAsync({ projectId: project.id });
        navigate(`/projects/${project.slug}/pages/${page.id}`);
        onClose();
      } else if (id === 'folder') {
        navigate(`/projects/${project.slug}/files`);
        onClose();
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`What would you like to do in "${project.name}"?`} className="sm:max-w-lg">
      <div className="grid gap-3 sm:grid-cols-1">
        {ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => handleAction(action.id)}
            disabled={loading !== null}
            className={cn(
              'relative w-full flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-br text-left transition-all duration-200',
              'hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none',
              action.color,
            )}
          >
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', action.iconColor)}>
              {loading === action.id ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Icon name={action.icon} size={22} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink-900 text-sm">{action.label}</p>
              <p className="text-xs text-ink-500 mt-0.5">{action.desc}</p>
            </div>
            <Icon name="chevron_right" size={18} className="text-ink-400 flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full mt-3 text-sm text-ink-400 hover:text-ink-700 transition-colors py-2"
      >
        Maybe later
      </button>
    </Modal>
  );
}
