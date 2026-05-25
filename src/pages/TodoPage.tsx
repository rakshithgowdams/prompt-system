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
        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
        : urgent
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
          : 'bg-gray-700/60 text-gray-400 border border-gray-700',
    )}>
      <Icon name={overdue ? 'warning' : 'timer'} size={11} fill={overdue} />
      {text}
    </span>
  );
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-red-400 bg-red-500/10 border-red-500/30', dot: 'bg-red-400' },
  medium: { label: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400' },
  low: { label: 'Low', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30', dot: 'bg-teal-400' },
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
      className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4 shadow-xl"
    >
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full bg-transparent text-white text-base font-medium placeholder-gray-500 focus:outline-none"
        required
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes (optional)"
        rows={2}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        {/* Due date */}
        <div className="flex items-center gap-2">
          <Icon name="calendar_today" size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
          />
        </div>
        {/* Due time */}
        <div className="flex items-center gap-2">
          <Icon name="schedule" size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Priority */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Priority:</span>
        {(['high', 'medium', 'low'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
              priority === p
                ? PRIORITY_CONFIG[p].color
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300',
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
          className="px-3 py-1.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
        'group flex gap-4 p-4 rounded-2xl border transition-all duration-200',
        todo.completed
          ? 'bg-gray-900/40 border-gray-800/50 opacity-60'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700',
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
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-600 hover:border-emerald-400',
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
            todo.completed ? 'line-through text-gray-500' : 'text-white',
          )}>
            {todo.title}
          </p>
          {/* Priority dot */}
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', p.dot)} title={`${p.label} priority`} />
        </div>

        {todo.notes && (
          <p className="text-xs text-gray-500 leading-relaxed">{todo.notes}</p>
        )}

        <div className="flex items-center flex-wrap gap-2 pt-0.5">
          {/* Countdown timer */}
          {!todo.completed && <CountdownBadge dueAt={todo.due_at} />}

          {/* Due date label */}
          {todo.due_at && (
            <span className="text-xs text-gray-600">
              {new Date(todo.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* Completed timestamp */}
          {todo.completed && todo.completed_at && (
            <span className="text-xs text-emerald-600">
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
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <Icon name="edit" size={14} />
          </button>
        )}
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          <h1 className="text-2xl font-bold text-white">Todos</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {activeTodos.length} remaining
            {overdueTodos.length > 0 && (
              <span className="text-red-400 ml-2">· {overdueTodos.length} overdue</span>
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
          { label: 'Active', value: activeTodos.length, icon: 'radio_button_unchecked', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Overdue', value: overdueTodos.length, icon: 'warning', color: overdueTodos.length > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-gray-500 bg-gray-800 border-gray-700' },
          { label: 'Done', value: completedCount, icon: 'check_circle', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={cn('flex flex-col xs:flex-row items-center xs:items-start gap-1 xs:gap-3 px-2 xs:px-4 py-3 rounded-xl border text-center xs:text-left', stat.color)}>
            <Icon name={stat.icon} size={18} fill={stat.icon !== 'radio_button_unchecked'} className="flex-shrink-0" />
            <div>
              <p className="text-xl font-bold leading-none">{stat.value}</p>
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
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-0.5">
          {(['active', 'all', 'completed'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                filter === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white',
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
                'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                priorityFilter === p
                  ? p === 'all'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : PRIORITY_CONFIG[p].color
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300',
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
          <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
            <Icon name="checklist" size={28} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium">
              {filter === 'completed' ? 'No completed todos yet' : filter === 'active' ? 'All caught up!' : 'No todos yet'}
            </p>
            <p className="text-gray-600 text-sm mt-0.5">
              {filter === 'active' ? 'Add a new todo to get started' : ''}
            </p>
          </div>
          {filter === 'active' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/20 transition-all"
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
