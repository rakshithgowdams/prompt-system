import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import {
  useAllFolders, useMoveFileToFolder, useMoveFolder, useBulkMoveFiles,
  type Folder,
} from '../../hooks/useProjectFiles';

interface MoveTarget {
  type: 'file' | 'folder';
  id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  targets: MoveTarget[];
  forbiddenIds: string[];
}

export function MoveToModal({ open, onClose, projectId, targets, forbiddenIds }: Props) {
  const { data: allFolders = [] } = useAllFolders(projectId);
  const moveFile = useMoveFileToFolder();
  const moveFolder = useMoveFolder();
  const bulkMove = useBulkMoveFiles();
  const [destId, setDestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const rootFolders = allFolders.filter((f) => !f.parent_folder_id);
  const childrenOf = (parentId: string) => allFolders.filter((f) => f.parent_folder_id === parentId);

  const handleMove = async () => {
    setBusy(true);
    try {
      const fileTargets = targets.filter((t) => t.type === 'file');
      const folderTargets = targets.filter((t) => t.type === 'folder');

      if (fileTargets.length > 1) {
        await bulkMove.mutateAsync({ projectId, fileIds: fileTargets.map((t) => t.id), folderId: destId });
      } else if (fileTargets.length === 1) {
        await moveFile.mutateAsync({ id: fileTargets[0].id, projectId, folderId: destId });
      }

      for (const ft of folderTargets) {
        await moveFolder.mutateAsync({ id: ft.id, projectId, newParentId: destId });
      }

      toast.success(`Moved ${targets.length} ${targets.length === 1 ? 'item' : 'items'}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Move failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-ink-200">
          <h3 className="font-display font-bold text-ink-900">Move to…</h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {targets.length} {targets.length === 1 ? 'item' : 'items'} selected
          </p>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 space-y-0.5">
          <DestRow
            label="Project root"
            icon="home"
            selected={destId === null}
            onClick={() => setDestId(null)}
            depth={0}
          />
          {rootFolders.map((f) => (
            <FolderTreeRow
              key={f.id}
              folder={f}
              depth={0}
              destId={destId}
              setDestId={setDestId}
              childrenOf={childrenOf}
              forbiddenIds={forbiddenIds}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-ink-200 bg-ink-50">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleMove} disabled={busy} loading={busy}>
            Move here
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function FolderTreeRow({
  folder, depth, destId, setDestId, childrenOf, forbiddenIds,
}: {
  folder: Folder;
  depth: number;
  destId: string | null;
  setDestId: (id: string | null) => void;
  childrenOf: (id: string) => Folder[];
  forbiddenIds: string[];
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isForbidden = forbiddenIds.includes(folder.id);
  const kids = childrenOf(folder.id);

  return (
    <>
      <DestRow
        label={folder.name}
        icon={expanded && kids.length > 0 ? 'folder_open' : 'folder'}
        selected={destId === folder.id}
        onClick={() => !isForbidden && setDestId(folder.id)}
        depth={depth}
        disabled={isForbidden}
        expandable={kids.length > 0}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
      />
      {expanded && kids.map((k) => (
        <FolderTreeRow
          key={k.id}
          folder={k}
          depth={depth + 1}
          destId={destId}
          setDestId={setDestId}
          childrenOf={childrenOf}
          forbiddenIds={forbiddenIds}
        />
      ))}
    </>
  );
}

function DestRow({
  label, icon, selected, onClick, depth, disabled, expandable, expanded, onToggleExpand,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
  depth: number;
  disabled?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none ${
        selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-ink-100 text-ink-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
      style={{ paddingLeft: 12 + depth * 16 }}
      onClick={disabled ? undefined : onClick}
    >
      {expandable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
        >
          <Icon name={expanded ? 'expand_more' : 'chevron_right'} size={14} />
        </button>
      ) : (
        <span className="w-4" />
      )}
      <Icon name={icon} size={16} className={selected ? 'text-emerald-600' : 'text-ink-500'} />
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      {selected && <Icon name="check" size={16} className="text-emerald-600 flex-shrink-0" />}
    </div>
  );
}
