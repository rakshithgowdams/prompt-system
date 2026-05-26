import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTodos, useCreateTodo, useUpdateTodo, useToggleTodo, useDeleteTodo } from '../hooks/useTodos';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { TodoCardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import type { Todo } from '../lib/database.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(Date.now() + 86400000));
  if (dateKey === today) return 'Today';
  if (dateKey === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

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
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${mins}m`;
  else if (mins > 0) text = `${mins}m ${secs}s`;
  else text = `${secs}s`;
  return { text: overdue ? `${text} overdue` : text, urgent: !overdue && ms < 3600000, overdue };
}

function CountdownBadge({ dueAt }: { dueAt: string | null }) {
  const diff = useCountdown(dueAt);
  if (diff === null || dueAt === null) return null;
  const { text, urgent, overdue } = formatCountdown(diff);
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded font-medium',
      overdue ? 'bg-red-50 text-danger border border-red-200'
        : urgent ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
        : 'bg-ink-100 text-ink-500 border border-ink-300',
    )}>
      <Icon name={overdue ? 'warning' : 'timer'} size={10} fill={overdue} />
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

// ── Calendar ──────────────────────────────────────────────────────────────────

interface CalendarProps {
  selectedDate: string;
  onSelectDate: (key: string) => void;
  todoDates: Map<string, { total: number; completed: number; overdue: boolean }>;
}

function Calendar({ selectedDate, onSelectDate, todoDates }: CalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = toDateKey(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = startOfMonth(cursor).getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);
  const totalCells = Math.ceil((firstDow + totalDays) / 7) * 7;

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(toDateKey(now));
  };

  return (
    <div className="bg-white border border-ink-300 rounded-xl overflow-hidden shadow-sm">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-200">
        <button
          onClick={prev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600 transition-colors"
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-ink-900 text-sm">{formatMonthYear(cursor)}</span>
          <button
            onClick={goToday}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-500 hover:bg-brand-100 transition-colors border border-brand-200"
          >
            Today
          </button>
        </div>
        <button
          onClick={next}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600 transition-colors"
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-ink-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-ink-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDow + 1;
          if (dayNum < 1 || dayNum > totalDays) {
            return <div key={i} className="h-12 border-b border-r border-ink-100 last:border-r-0" />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isToday = dateKey === today;
          const isSelected = dateKey === selectedDate;
          const meta = todoDates.get(dateKey);
          const col = (i % 7);
          const isSun = col === 0;
          const isSat = col === 6;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                'relative h-12 flex flex-col items-center justify-center gap-0.5 text-sm font-medium transition-all border-b border-r border-ink-100',
                !isSelected && 'hover:bg-ink-50',
                isSat && 'border-r-0',
                isSelected && 'bg-brand-400 text-white',
                !isSelected && isToday && 'text-brand-500',
                !isSelected && !isToday && (isSun || isSat ? 'text-ink-400' : 'text-ink-700'),
              )}
            >
              <span className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full text-sm leading-none',
                isToday && !isSelected && 'ring-2 ring-brand-400 ring-offset-1',
              )}>
                {dayNum}
              </span>
              {meta && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(meta.total, 3) }, (_, di) => (
                    <span
                      key={di}
                      className={cn(
                        'w-1 h-1 rounded-full',
                        isSelected ? 'bg-white/70'
                          : meta.overdue ? 'bg-danger'
                          : di < meta.completed ? 'bg-success'
                          : 'bg-brand-400',
                      )}
                    />
                  ))}
                  {meta.total > 3 && (
                    <span className={cn('text-[9px] leading-none', isSelected ? 'text-white/70' : 'text-ink-400')}>
                      +{meta.total - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Todo form ─────────────────────────────────────────────────────────────────

interface TodoFormProps {
  initial?: Partial<Todo>;
  defaultDate?: string;
  onSubmit: (data: { title: string; notes: string; due_at: string | null; priority: 'low' | 'medium' | 'high' }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function TodoForm({ initial, defaultDate, onSubmit, onCancel, loading }: TodoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [dueDate, setDueDate] = useState(
    initial?.due_at
      ? new Date(initial.due_at).toISOString().slice(0, 10)
      : (defaultDate ?? ''),
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
      className="bg-white border border-ink-300 rounded-xl p-5 space-y-4 shadow-card"
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
        className="w-full bg-ink-100 border border-ink-300 rounded-lg px-3 py-2.5 text-sm text-ink-700 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 resize-none transition-colors"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Icon name="calendar_today" size={14} className="text-ink-400 flex-shrink-0" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 min-w-0 bg-ink-100 border border-ink-300 rounded-lg px-2.5 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Icon name="schedule" size={14} className="text-ink-400 flex-shrink-0" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className="flex-1 min-w-0 bg-ink-100 border border-ink-300 rounded-lg px-2.5 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-40 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-400 font-medium">Priority:</span>
        {(['high', 'medium', 'low'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
              priority === p ? PRIORITY_CONFIG[p].color : 'bg-white border-ink-300 text-ink-500 hover:border-ink-500',
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
          className="px-3 py-1.5 rounded-lg text-sm text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.form>
  );
}

// ── Todo card ─────────────────────────────────────────────────────────────────

function TodoCard({ todo, onToggle, onEdit, onDelete }: {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  const p = PRIORITY_CONFIG[todo.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={cn(
        'group flex gap-3.5 p-4 rounded-xl border transition-all duration-200',
        todo.completed
          ? 'bg-ink-50 border-ink-200 opacity-60'
          : 'bg-white border-ink-300 hover:border-ink-400 hover:shadow-sm',
      )}
    >
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className="flex-shrink-0 mt-0.5"
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          todo.completed ? 'bg-success border-success' : 'border-ink-400 hover:border-success',
        )}>
          <AnimatePresence>
            {todo.completed && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Icon name="check" size={11} className="text-white" weight={600} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <p className={cn(
            'text-sm font-medium leading-snug flex-1',
            todo.completed ? 'line-through text-ink-400' : 'text-ink-900',
          )}>
            {todo.title}
          </p>
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', p.dot)} title={p.label} />
        </div>
        {todo.notes && <p className="text-xs text-ink-500 leading-relaxed">{todo.notes}</p>}
        <div className="flex items-center flex-wrap gap-2 pt-0.5">
          {!todo.completed && <CountdownBadge dueAt={todo.due_at} />}
          {todo.due_at && (
            <span className="text-[11px] text-ink-400">
              {new Date(todo.due_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {todo.completed && todo.completed_at && (
            <span className="text-[11px] text-success">
              Done {new Date(todo.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!todo.completed && (
          <button
            onClick={() => onEdit(todo)}
            className="p-1.5 rounded-lg text-ink-400 hover:text-brand-400 hover:bg-brand-50 transition-colors"
          >
            <Icon name="edit" size={13} />
          </button>
        )}
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-lg text-ink-400 hover:text-danger hover:bg-red-50 transition-colors"
        >
          <Icon name="delete" size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TodoPage() {
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const today = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showAllDates, setShowAllDates] = useState(false);

  // Build a map of date -> { total, completed, overdue } for calendar dots
  const todoDates = new Map<string, { total: number; completed: number; overdue: boolean }>();
  for (const t of todos) {
    if (!t.due_at) continue;
    const key = toDateKey(new Date(t.due_at));
    const existing = todoDates.get(key) ?? { total: 0, completed: 0, overdue: false };
    existing.total++;
    if (t.completed) existing.completed++;
    if (!t.completed && new Date(t.due_at) < new Date()) existing.overdue = true;
    todoDates.set(key, existing);
  }
  // Also include todos with no due_at in "no date" bucket — skip for calendar

  // Todos for the selected date
  const todosForDate = showAllDates
    ? todos
    : todos.filter((t) => {
        if (!t.due_at) return selectedDate === today; // no-date todos show under today
        return toDateKey(new Date(t.due_at)) === selectedDate;
      });

  // No-date todos shown under today only
  const noDateTodos = todos.filter((t) => !t.due_at);

  const activeTodos = todos.filter((t) => !t.completed);
  const overdueTodos = activeTodos.filter((t) => t.due_at && new Date(t.due_at) < new Date());
  const completedCount = todos.filter((t) => t.completed).length;

  const handleSelectDate = (key: string) => {
    setSelectedDate(key);
    setShowForm(false);
    setEditingTodo(null);
    setShowAllDates(false);
  };

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
    try { await toggleTodo.mutateAsync({ id, completed }); }
    catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteTodo.mutateAsync(id); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const displayedTodos = showAllDates ? todos : todosForDate;

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight">Todos</h1>
          <p className="text-ink-500 text-sm mt-0.5">
            {activeTodos.length} active
            {overdueTodos.length > 0 && (
              <span className="text-danger ml-2">· {overdueTodos.length} overdue</span>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-500 bg-white border border-ink-300 rounded-lg px-3 py-1.5">
            <Icon name="radio_button_unchecked" size={13} className="text-brand-400" />
            <span className="font-semibold text-ink-900">{activeTodos.length}</span> active
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-500 bg-white border border-ink-300 rounded-lg px-3 py-1.5">
            <Icon name="check_circle" size={13} className="text-success" />
            <span className="font-semibold text-ink-900">{completedCount}</span> done
          </div>
          {overdueTodos.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-danger rounded-lg px-3 py-1.5">
              <Icon name="warning" size={13} fill />
              <span className="font-semibold">{overdueTodos.length}</span> overdue
            </div>
          )}
        </div>
      </motion.div>

      {/* Calendar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          todoDates={todoDates}
        />
      </motion.div>

      {/* Selected date header + Add button */}
      <motion.div
        key={selectedDate}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-display font-bold text-ink-900 text-base leading-tight">
              {showAllDates ? 'All Todos' : formatDayLabel(selectedDate)}
            </span>
            {!showAllDates && selectedDate !== today && (
              <span className="text-xs text-ink-400">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          {todosForDate.length > 0 && !showAllDates && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 border border-brand-200">
              {todosForDate.filter(t => !t.completed).length} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAllDates((v) => !v); setShowForm(false); setEditingTodo(null); }}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
              showAllDates
                ? 'bg-ink-900 border-ink-900 text-white'
                : 'bg-white border-ink-300 text-ink-500 hover:border-ink-500 hover:text-ink-900',
            )}
          >
            {showAllDates ? 'Show date' : 'All todos'}
          </button>
          <Button
            onClick={() => { setShowForm(true); setEditingTodo(null); }}
            size="sm"
          >
            <Icon name="add" size={15} />
            Add
          </Button>
        </div>
      </motion.div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {(showForm || editingTodo) && (
          <TodoForm
            key={editingTodo?.id ?? 'new'}
            initial={editingTodo ?? undefined}
            defaultDate={editingTodo ? undefined : selectedDate}
            onSubmit={editingTodo ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingTodo(null); }}
            loading={createTodo.isPending || updateTodo.isPending}
          />
        )}
      </AnimatePresence>

      {/* Todo list */}
      {isLoading ? (
        <TodoCardSkeleton count={3} />
      ) : displayedTodos.length === 0 ? (
        <motion.div
          key={`empty-${selectedDate}-${showAllDates}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-14 gap-4"
        >
          <div className="w-14 h-14 rounded-xl bg-ink-100 border border-ink-200 flex items-center justify-center">
            <Icon name="event_available" size={26} className="text-ink-400" />
          </div>
          <div className="text-center">
            <p className="text-ink-700 font-semibold">
              {showAllDates ? 'No todos yet' : `Nothing scheduled for ${formatDayLabel(selectedDate).toLowerCase()}`}
            </p>
            <p className="text-ink-400 text-sm mt-0.5">Click Add to create a todo for this day</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
          >
            <Icon name="add" size={16} />
            Add todo for {showAllDates ? 'today' : formatDayLabel(selectedDate).toLowerCase()}
          </button>
        </motion.div>
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayedTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={(t) => { setEditingTodo(t); setShowForm(false); }}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>

          {/* No-date todos shown only on today's view */}
          {!showAllDates && selectedDate === today && noDateTodos.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-ink-200" />
                <span className="text-[11px] text-ink-400 font-medium">No due date</span>
                <div className="flex-1 h-px bg-ink-200" />
              </div>
              <AnimatePresence mode="popLayout">
                {noDateTodos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onEdit={(t) => { setEditingTodo(t); setShowForm(false); }}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      )}

      {/* Bulk clear completed */}
      <AnimatePresence>
        {completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex justify-center pt-2"
          >
            <button
              onClick={async () => {
                const completed = todos.filter((t) => t.completed);
                await Promise.all(completed.map((t) => deleteTodo.mutateAsync(t.id)));
                toast.success(`Cleared ${completed.length} completed`);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-ink-500 hover:text-danger hover:bg-red-50 border border-ink-300 hover:border-red-200 transition-all"
            >
              <Icon name="delete_sweep" size={15} />
              Clear {completedCount} completed
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
