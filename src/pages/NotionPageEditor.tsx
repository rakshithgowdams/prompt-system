import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNotionPage, useUpdateNotionPage, useDeleteNotionPage } from '../hooks/useNotionPages';
import { useProject } from '../hooks/useProjects';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';

// ── Block types ───────────────────────────────────────────────────────────────

type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;    // for todo
  language?: string;    // for code
  calloutIcon?: string; // for callout
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Write something, or type '/' for commands…",
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bullet: 'List item',
  numbered: 'List item',
  todo: 'To-do',
  quote: 'Quote',
  code: '// Code',
  divider: '',
  callout: 'Callout',
};

// Slash-command menu items
const BLOCK_COMMANDS = [
  { type: 'paragraph'  as BlockType, label: 'Text',       icon: 'subject',         desc: 'Plain paragraph' },
  { type: 'heading1'   as BlockType, label: 'Heading 1',  icon: 'title',           desc: 'Large heading' },
  { type: 'heading2'   as BlockType, label: 'Heading 2',  icon: 'format_h2',       desc: 'Medium heading' },
  { type: 'heading3'   as BlockType, label: 'Heading 3',  icon: 'format_h3',       desc: 'Small heading' },
  { type: 'bullet'     as BlockType, label: 'Bullet List',icon: 'format_list_bulleted', desc: 'Unordered list' },
  { type: 'numbered'   as BlockType, label: 'Numbered',   icon: 'format_list_numbered', desc: 'Ordered list' },
  { type: 'todo'       as BlockType, label: 'To-do',      icon: 'check_box',       desc: 'Checkbox task' },
  { type: 'quote'      as BlockType, label: 'Quote',      icon: 'format_quote',    desc: 'Block quote' },
  { type: 'code'       as BlockType, label: 'Code',       icon: 'code',            desc: 'Code block' },
  { type: 'callout'    as BlockType, label: 'Callout',    icon: 'lightbulb',       desc: 'Highlighted callout' },
  { type: 'divider'    as BlockType, label: 'Divider',    icon: 'horizontal_rule', desc: 'Horizontal line' },
];

// ── BlockRow ──────────────────────────────────────────────────────────────────

function BlockRow({
  block,
  index,
  focused,
  onChange,
  onKeyDown,
  onFocus,
  onAddAfter,
  onDelete,
  onTypeChange,
  inputRef,
}: {
  block: Block;
  index: number;
  focused: boolean;
  onChange: (id: string, content: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, index: number) => void;
  onFocus: (id: string) => void;
  onAddAfter: (id: string) => void;
  onDelete: (id: string) => void;
  onTypeChange: (id: string, type: BlockType) => void;
  inputRef: (el: HTMLElement | null) => void;
}) {
  const baseInput =
    'w-full bg-transparent outline-none resize-none text-gray-100 leading-relaxed placeholder:text-gray-600 transition-colors';

  const setRef = (el: HTMLElement | null) => inputRef(el);

  if (block.type === 'divider') {
    return (
      <div className="group relative flex items-center gap-3 py-1">
        <hr className="flex-1 border-gray-700" />
        <button
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    );
  }

  const sharedProps = {
    'data-block-id': block.id,
    onFocus: () => onFocus(block.id),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => onKeyDown(e, block.id, index),
  };

  let content: React.ReactNode;

  switch (block.type) {
    case 'heading1':
      content = (
        <div
          ref={setRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(baseInput, 'text-3xl font-bold')}
          onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
          data-placeholder={BLOCK_PLACEHOLDERS.heading1}
          {...sharedProps}
        >
          {block.content}
        </div>
      );
      break;
    case 'heading2':
      content = (
        <div
          ref={setRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(baseInput, 'text-2xl font-semibold')}
          onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
          data-placeholder={BLOCK_PLACEHOLDERS.heading2}
          {...sharedProps}
        >
          {block.content}
        </div>
      );
      break;
    case 'heading3':
      content = (
        <div
          ref={setRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(baseInput, 'text-xl font-semibold text-gray-200')}
          onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
          data-placeholder={BLOCK_PLACEHOLDERS.heading3}
          {...sharedProps}
        >
          {block.content}
        </div>
      );
      break;
    case 'bullet':
      content = (
        <div className="flex gap-3 items-start">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
          <div
            ref={setRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseInput, 'flex-1')}
            onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
            data-placeholder={BLOCK_PLACEHOLDERS.bullet}
            {...sharedProps}
          >
            {block.content}
          </div>
        </div>
      );
      break;
    case 'numbered':
      content = (
        <div className="flex gap-3 items-start">
          <span className="mt-[3px] text-sm text-gray-400 font-medium flex-shrink-0 min-w-[1.2rem] text-right">
            {index + 1}.
          </span>
          <div
            ref={setRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseInput, 'flex-1')}
            onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
            data-placeholder={BLOCK_PLACEHOLDERS.numbered}
            {...sharedProps}
          >
            {block.content}
          </div>
        </div>
      );
      break;
    case 'todo':
      content = (
        <div className="flex gap-3 items-start">
          <button
            type="button"
            onClick={() => onChange(block.id, block.content)}
            className="mt-[3px] flex-shrink-0"
          >
            <Icon
              name={block.checked ? 'check_box' : 'check_box_outline_blank'}
              size={18}
              className={block.checked ? 'text-blue-400' : 'text-gray-500'}
            />
          </button>
          <div
            ref={setRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseInput, 'flex-1', block.checked && 'line-through text-gray-500')}
            onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
            data-placeholder={BLOCK_PLACEHOLDERS.todo}
            {...sharedProps}
          >
            {block.content}
          </div>
        </div>
      );
      break;
    case 'quote':
      content = (
        <div className="flex gap-3 items-start border-l-4 border-gray-500 pl-4">
          <div
            ref={setRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseInput, 'italic text-gray-300')}
            onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
            data-placeholder={BLOCK_PLACEHOLDERS.quote}
            {...sharedProps}
          >
            {block.content}
          </div>
        </div>
      );
      break;
    case 'code':
      content = (
        <div className="rounded-xl bg-gray-800/80 border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-800">
            <Icon name="code" size={13} className="text-gray-500" />
            <span className="text-xs text-gray-500 font-mono">{block.language ?? 'code'}</span>
          </div>
          <div
            ref={setRef}
            contentEditable
            suppressContentEditableWarning
            className="px-4 py-3 font-mono text-sm text-emerald-300 outline-none min-h-[60px] whitespace-pre-wrap"
            onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
            spellCheck={false}
            {...sharedProps}
          >
            {block.content}
          </div>
        </div>
      );
      break;
    case 'callout':
      content = (
        <div className="flex gap-3 items-start rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3">
          <span className="text-xl flex-shrink-0">{block.calloutIcon ?? '💡'}</span>
          <div
            ref={setRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseInput, 'flex-1 text-blue-200')}
            onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
            data-placeholder={BLOCK_PLACEHOLDERS.callout}
            {...sharedProps}
          >
            {block.content}
          </div>
        </div>
      );
      break;
    default: // paragraph
      content = (
        <div
          ref={setRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(baseInput)}
          onInput={(e) => onChange(block.id, e.currentTarget.textContent ?? '')}
          data-placeholder={BLOCK_PLACEHOLDERS.paragraph}
          {...sharedProps}
        >
          {block.content}
        </div>
      );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        'group relative',
        block.type !== 'code' && block.type !== 'callout' && 'py-0.5',
      )}
    >
      {/* Left action bar */}
      <div className="absolute -left-12 top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onAddAfter(block.id)}
          className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          title="Add block"
        >
          <Icon name="add" size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-800 transition-colors"
          title="Delete block"
        >
          <Icon name="drag_indicator" size={15} />
        </button>
      </div>
      {content}
    </motion.div>
  );
}

// ── SlashMenu ─────────────────────────────────────────────────────────────────

function SlashMenu({
  query,
  onSelect,
  position,
}: {
  query: string;
  onSelect: (type: BlockType) => void;
  position: { top: number; left: number };
}) {
  const filtered = BLOCK_COMMANDS.filter(
    (c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase()),
  );

  if (!filtered.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-72"
      style={{ top: position.top + 24, left: position.left }}
    >
      <div className="px-3 pt-3 pb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blocks</p>
      </div>
      <div className="p-2 max-h-72 overflow-y-auto">
        {filtered.map((cmd) => (
          <button
            key={cmd.type}
            type="button"
            onClick={() => onSelect(cmd.type)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
              <Icon name={cmd.icon} size={16} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200">{cmd.label}</p>
              <p className="text-xs text-gray-500 truncate">{cmd.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function NotionPageEditor() {
  const { pageId, slug } = useParams<{ pageId: string; slug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = useNotionPage(pageId ?? '');
  const { data: project } = useProject(slug ?? '');
  const updatePage = useUpdateNotionPage();
  const deletePage = useDeleteNotionPage();

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📄');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saved, setSaved] = useState(true);

  // Slash-command state
  const [slashActive, setSlashActive] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);

  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate from DB
  useEffect(() => {
    if (!page) return;
    setTitle(page.title);
    setIcon(page.icon);
    const raw = page.content as Block[];
    if (Array.isArray(raw) && raw.length > 0) {
      setBlocks(raw);
    } else {
      setBlocks([{ id: genId(), type: 'paragraph', content: '' }]);
    }
  }, [page]);

  // Auto-save debounced
  const scheduleSave = useCallback((newTitle: string, newBlocks: Block[]) => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!pageId) return;
      try {
        await updatePage.mutateAsync({ id: pageId, title: newTitle, content: newBlocks as unknown as import('../lib/database.types').Json });
        setSaved(true);
      } catch {
        toast.error('Auto-save failed');
      }
    }, 1200);
  }, [pageId, updatePage]);

  const setTitleAndSave = (v: string) => {
    setTitle(v);
    scheduleSave(v, blocks);
  };

  const setBlocksAndSave = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    scheduleSave(title, newBlocks);
  };

  const changeBlock = (id: string, content: string) => {
    // Detect slash command
    if (content.startsWith('/')) {
      const el = blockRefs.current[id];
      if (el) {
        const rect = el.getBoundingClientRect();
        setSlashPos({ top: rect.top, left: rect.left });
      }
      setSlashActive(true);
      setSlashQuery(content.slice(1));
      setSlashBlockId(id);
    } else {
      setSlashActive(false);
    }
    setBlocksAndSave(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const selectSlashCommand = (type: BlockType) => {
    setSlashActive(false);
    if (!slashBlockId) return;
    setBlocksAndSave(blocks.map((b) =>
      b.id === slashBlockId ? { ...b, type, content: '', calloutIcon: '💡' } : b,
    ));
    setTimeout(() => blockRefs.current[slashBlockId]?.focus(), 50);
  };

  const addBlockAfter = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlock: Block = { id: genId(), type: 'paragraph', content: '' };
    const next = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    setBlocksAndSave(next);
    setTimeout(() => blockRefs.current[newBlock.id]?.focus(), 50);
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) return;
    const idx = blocks.findIndex((b) => b.id === id);
    const next = blocks.filter((b) => b.id !== id);
    setBlocksAndSave(next);
    const prevId = next[Math.max(0, idx - 1)]?.id;
    if (prevId) setTimeout(() => blockRefs.current[prevId]?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, idx: number) => {
    if (slashActive && (e.key === 'Escape')) {
      setSlashActive(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setSlashActive(false);
      addBlockAfter(id);
    }
    if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === id);
      if (block && !block.content && blocks.length > 1) {
        e.preventDefault();
        deleteBlock(id);
      }
    }
    if (e.key === 'ArrowUp' && idx > 0) {
      blockRefs.current[blocks[idx - 1].id]?.focus();
    }
    if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
      blockRefs.current[blocks[idx + 1].id]?.focus();
    }
  };

  const handleDelete = async () => {
    if (!pageId || !project) return;
    try {
      await deletePage.mutateAsync({ id: pageId, projectId: project.id });
      toast.success('Page deleted');
      navigate(`/projects/${slug}`);
    } catch {
      toast.error('Failed to delete page');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }

  if (!page) {
    return <div className="p-8 text-center text-gray-400">Page not found.</div>;
  }

  return (
    <div className="min-h-full">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 h-14 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/projects/${slug}`)}
            className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400 min-w-0">
            <span className="truncate hidden xs:block">{project?.name}</span>
            <span className="text-gray-600 hidden xs:block">/</span>
            <span className="text-gray-200 truncate max-w-[180px]">{title || 'Untitled'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {!saved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-gray-500 hidden sm:block"
              >
                Saving…
              </motion.span>
            )}
            {saved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-500 hidden sm:block"
              >
                Saved
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
            title="Delete page"
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-12 py-10 sm:py-16">
        {/* Icon */}
        <div className="mb-4">
          <button className="text-5xl hover:scale-110 transition-transform" title="Change icon">
            {icon}
          </button>
        </div>

        {/* Title */}
        <div
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setTitleAndSave(e.currentTarget.textContent ?? '')}
          data-placeholder="Untitled"
          className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-bold text-white outline-none leading-tight mb-8',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-700',
          )}
        >
          {title}
        </div>

        {/* Blocks */}
        <div className="space-y-1 pl-12">
          <AnimatePresence mode="popLayout">
            {blocks.map((block, idx) => (
              <BlockRow
                key={block.id}
                block={block}
                index={idx}
                focused={focusedId === block.id}
                onChange={(id, content) => {
                  // Toggle checkbox for todo
                  if (block.type === 'todo' && block.id === id) {
                    setBlocksAndSave(blocks.map((b) => b.id === id ? { ...b, checked: !b.checked } : b));
                    return;
                  }
                  changeBlock(id, content);
                }}
                onKeyDown={handleKeyDown}
                onFocus={setFocusedId}
                onAddAfter={addBlockAfter}
                onDelete={deleteBlock}
                onTypeChange={(id, type) =>
                  setBlocksAndSave(blocks.map((b) => b.id === id ? { ...b, type, content: '' } : b))
                }
                inputRef={(el) => { blockRefs.current[block.id] = el; }}
              />
            ))}
          </AnimatePresence>

          {/* Add block button at bottom */}
          <button
            type="button"
            onClick={() => {
              const last = blocks[blocks.length - 1];
              if (last) addBlockAfter(last.id);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors text-sm py-2 w-full text-left"
          >
            <Icon name="add" size={16} />
            Add a block
          </button>
        </div>
      </div>

      {/* Slash menu */}
      <AnimatePresence>
        {slashActive && (
          <SlashMenu
            query={slashQuery}
            onSelect={selectSlashCommand}
            position={slashPos}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Page"
        message={`Delete "${title || 'Untitled'}"? This cannot be undone.`}
        loading={deletePage.isPending}
      />

      {/* CSS for placeholder */}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #4b5563;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
