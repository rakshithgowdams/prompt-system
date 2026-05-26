import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTodos, useCreateTodo, useUpdateTodo, useToggleTodo, useDeleteTodo } from '../hooks/useTodos';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { TodoCardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import type { Todo } from '../lib/database.types';

// ── Countdown ────────────────────────────────────────────────────────────────

function useCountdown(dueAt: string | null) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!dueAt) { setDiff(null); return; }
    const tick = () => setDiff(new Date(dueAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dueAt]);

  return diff;
}

function formatCountdown(ms: number): { text: string; urgent: boolean; overdue: boolean } {
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  let text: string;
  if (days > 0) text = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0) text = `${hours}h ${mins}m ${secs}s`;
  else if (mins > 0) text = `${mins}m ${secs}s`;
  else text = `${secs}s`;

  return { text: overdue ? `${text} overdue` : text, urgent: !overdue && ms < 1000 * 60 * 60, overdue };
}

function CountdownBadge({ dueAt }: { dueAt: string | null }) {
  const diff = useCountdown(dueAt);
  if (diff === null || dueAt === null) return null;

  const { text, urgent, overdue } = formatCountdown(diff);
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md font-medium',
      overdue
        ? 'bg-red-50 text-danger border border-red-200'
        : urgent
          ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
          : 'bg-ink-100 text-ink-500 border border-ink-300',
    )}>
      <Icon name={overdue ? 'warning' : 'timer'} size={11} fill={overdue} />
      {text}
    </span>
  );
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-danger bg-red-50 border-red-200', dot: 'bg-danger' },
  medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  low: { label: 'Low', color: 'text-teal-600 bg-teal-50 border-teal-200', dot: 'bg-teal-500' },
};

// ── Todo form ─────────────────────────────────────────────────────────────────

interface TodoFormProps {
  initial?: Partial<Todo>;
  onSubmit: (data: { title: string; notes: string; due_at: string | null; priority: 'low' | 'medium' | 'high' }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function TodoForm({ initial, onSubmit, onCancel, loading }: TodoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [dueDate, setDueDate] = useState(
    initial?.due_at ? new Date(initial.due_at).toISOString().slice(0, 10) : '',
  );
  const [dueTime, setDueTime] = useState(
    initial?.due_at ? new Date(initial.due_at).toTimeString().slice(0, 5) : '',
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initial?.priority ?? 'medium');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let due_at: string | null = null;
    if (dueDate) {
      const time = dueTime || '23:59';
      due_at = new Date(`${dueDate}T${time}`).toISOString();
    }
    await onSubmit({ title: title.trim(), notes: notes.trim(), due_at, priority });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onSubmit={handleSubmit}
      className="bg-white border border-ink-300 rounded-lg p-5 space-y-4 shadow-card"
    >
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full bg-transparent text-ink-900 text-base font-medium placeholder-ink-400 focus:outline-none"
        required
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes (optional)"
        rows={2}
        className="w-full bg-ink-100 border border-ink-300 rounded-md px-3 py-2.5 text-sm text-ink-700 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 resize-none transition-colors"
      />

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Icon name="calendar_today" size={15} className="text-ink-500 flex-shrink-0" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 min-w-0 bg-ink-100 border border-ink-300 rounded-md px-2.5 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Icon name="schedule" size={15} className="text-ink-500 flex-shrink-0" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className="flex-1 min-w-0 bg-ink-100 border border-ink-300 rounded-md px-2.5 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-40 transition-colors"
          />
        </div>
      </div>

      {/* Priority */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-500 font-medium">Priority:</span>
        {(['high', 'medium', 'low'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
              priority === p
                ? PRIORITY_CONFIG[p].color
                : 'bg-white border-ink-300 text-ink-500 hover:text-ink-900 hover:border-ink-500',
            )}
          >
            {PRIORITY_CONFIG[p].label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" loading={loading} disabled={!title.trim()}>
          {initial?.id ? 'Save changes' : 'Add todo'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-sm text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.form>
  );
}

// ── Todo card ─────────────────────────────────────────────────────────────────

interface TodoCardProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

function TodoCard({ todo, onToggle, onEdit, onDelete }: TodoCardProps) {
  const p = PRIORITY_CONFIG[todo.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'group flex gap-4 p-4 rounded-lg border transition-all duration-200',
        todo.completed
          ? 'bg-ink-50 border-ink-200 opacity-60'
          : 'bg-white border-ink-300 hover:border-ink-500 hover:shadow-card',
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className="flex-shrink-0 mt-0.5"
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          todo.completed
            ? 'bg-success border-success'
            : 'border-ink-400 hover:border-success',
        )}>
          <AnimatePresence>
            {todo.completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Icon name="check" size={12} className="text-white" weight={600} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          <p className={cn(
            'text-sm font-medium leading-snug',
            todo.completed ? 'line-through text-ink-400' : 'text-ink-900',
          )}>
            {todo.title}
          </p>
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', p.dot)} title={`${p.label} priority`} />
        </div>

        {todo.notes && (
          <p className="text-xs text-ink-500 leading-relaxed">{todo.notes}</p>
        )}

        <div className="flex items-center flex-wrap gap-2 pt-0.5">
          {!todo.completed && <CountdownBadge dueAt={todo.due_at} />}

          {todo.due_at && (
            <span className="text-xs text-ink-400">
              {new Date(todo.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {todo.completed && todo.completed_at && (
            <span className="text-xs text-success">
              Done {new Date(todo.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!todo.completed && (
          <button
            onClick={() => onEdit(todo)}
            className="p-1.5 rounded-md text-ink-400 hover:text-brand-400 hover:bg-brand-50 transition-colors"
          >
            <Icon name="edit" size={14} />
          </button>
        )}
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-md text-ink-400 hover:text-danger hover:bg-red-50 transition-colors"
        >
          <Icon name="delete" size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'active' | 'completed';

export function TodoPage() {
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filtered = todos.filter((t) => {
    const tabMatch =
      filter === 'all' ? true :
      filter === 'active' ? !t.completed :
      t.completed;
    const priorityMatch = priorityFilter === 'all' || t.priority === priorityFilter;
    return tabMatch && priorityMatch;
  });

  const activeTodos = todos.filter((t) => !t.completed);
  const overdueTodos = activeTodos.filter((t) => t.due_at && new Date(t.due_at) < new Date());
  const completedCount = todos.filter((t) => t.completed).length;

  const handleCreate = async (data: Parameters<typeof createTodo.mutateAsync>[0]) => {
    try {
      await createTodo.mutateAsync(data);
      toast.success('Todo added');
      setShowForm(false);
    } catch {
      toast.error('Failed to add todo');
    }
  };

  const handleUpdate = async (data: { title: string; notes: string; due_at: string | null; priority: 'low' | 'medium' | 'high' }) => {
    if (!editingTodo) return;
    try {
      await updateTodo.mutateAsync({ id: editingTodo.id, ...data });
      toast.success('Updated');
      setEditingTodo(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await toggleTodo.mutateAsync({ id, completed });
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight">Todos</h1>
          <p className="text-ink-500 text-sm mt-0.5">
            {activeTodos.length} remaining
            {overdueTodos.length > 0 && (
              <span className="text-danger ml-2">· {overdueTodos.length} overdue</span>
            )}
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingTodo(null); }} size="sm">
          <Icon name="add" size={16} />
          New Todo
        </Button>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        {[
          { label: 'Active', value: activeTodos.length, icon: 'radio_button_unchecked', color: 'text-brand-400 bg-brand-50 border-brand-100' },
          { label: 'Overdue', value: overdueTodos.length, icon: 'warning', color: overdueTodos.length > 0 ? 'text-danger bg-red-50 border-red-200' : 'text-ink-500 bg-white border-ink-300' },
          { label: 'Done', value: completedCount, icon: 'check_circle', color: 'text-success bg-green-50 border-green-200' },
        ].map((stat) => (
          <div key={stat.label} className={cn('flex flex-col xs:flex-row items-center xs:items-start gap-1 xs:gap-3 px-2 xs:px-4 py-3 rounded-lg border text-center xs:text-left', stat.color)}>
            <Icon name={stat.icon} size={18} fill={stat.icon !== 'radio_button_unchecked'} className="flex-shrink-0" />
            <div>
              <p className="text-xl font-display font-bold leading-none">{stat.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {(showForm || editingTodo) && (
          <TodoForm
            key={editingTodo?.id ?? 'new'}
            initial={editingTodo ?? undefined}
            onSubmit={editingTodo ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingTodo(null); }}
            loading={createTodo.isPending || updateTodo.isPending}
          />
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col xs:flex-row flex-wrap items-start xs:items-center gap-2 xs:gap-3">
        {/* Tab filter */}
        <div className="flex bg-white border border-ink-300 rounded-md p-1 gap-0.5">
          {(['active', 'all', 'completed'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                filter === tab
                  ? 'bg-brand-400 text-white'
                  : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1.5">
          {(['all', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all',
                priorityFilter === p
                  ? p === 'all'
                    ? 'bg-ink-900 border-ink-900 text-white'
                    : PRIORITY_CONFIG[p].color
                  : 'bg-white border-ink-300 text-ink-500 hover:text-ink-900 hover:border-ink-500',
              )}
            >
              {p === 'all' ? 'All priority' : PRIORITY_CONFIG[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Todo list */}
      {isLoading ? (
        <TodoCardSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-16 h-16 rounded-lg bg-ink-100 border border-ink-300 flex items-center justify-center">
            <Icon name="checklist" size={28} className="text-ink-400" />
          </div>
          <div className="text-center">
            <p className="text-ink-700 font-medium">
              {filter === 'completed' ? 'No completed todos yet' : filter === 'active' ? 'All caught up!' : 'No todos yet'}
            </p>
            <p className="text-ink-400 text-sm mt-0.5">
              {filter === 'active' ? 'Add a new todo to get started' : ''}
            </p>
          </div>
          {filter === 'active' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand-400 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <Icon name="add" size={16} />
              Add your first todo
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={(t) => { setEditingTodo(t); setShowForm(false); }}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Bulk clear completed */}
      <AnimatePresence>
        {completedCount > 0 && filter !== 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex justify-center"
          >
            <button
              onClick={async () => {
                const completed = todos.filter((t) => t.completed);
                await Promise.all(completed.map((t) => deleteTodo.mutateAsync(t.id)));
                toast.success(`Cleared ${completed.length} completed todo${completed.length !== 1 ? 's' : ''}`);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-ink-500 hover:text-danger hover:bg-red-50 border border-ink-300 hover:border-red-200 transition-all"
            >
              <Icon name="delete_sweep" size={16} />
              Clear {completedCount} completed
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
