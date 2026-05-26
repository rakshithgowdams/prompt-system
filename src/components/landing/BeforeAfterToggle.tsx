import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, StickyNote, Folder, BookOpen, Lock, Sparkles } from 'lucide-react';
import { Reveal } from './motion';

const AFTER_ITEMS = [
  { icon: Sparkles, label: '42 Prompts', color: 'bg-brand-50 border-brand-200 text-brand-600' },
  { icon: BookOpen, label: '3 Courses', color: 'bg-blue-50 border-blue-200 text-blue-600' },
  { icon: Folder, label: '5 Projects', color: 'bg-amber-50 border-amber-200 text-amber-600' },
  { icon: Lock, label: 'Vault secure', color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
];

const BEFORE_CARDS = [
  { top: 'top-4 left-4', rotate: '-3deg', bg: 'bg-white border-ink-300', icon: MessageSquare, iconColor: 'text-ink-500', label: 'ChatGPT Export', lines: [80, 60, 70] },
  { top: 'top-8 right-4', rotate: '2deg', bg: 'bg-yellow-50 border-yellow-200', icon: StickyNote, iconColor: 'text-yellow-600', label: 'Notes app', lines: [70, 50] },
  { top: 'bottom-10 left-8', rotate: '1deg', bg: 'bg-blue-50 border-blue-200', icon: MessageSquare, iconColor: 'text-blue-500', label: 'Telegram Saved', lines: [90, 65, 75] },
  { top: 'bottom-4 right-6', rotate: '-1deg', bg: 'bg-white border-ink-300', icon: StickyNote, iconColor: 'text-ink-400', label: 'Saved drafts', lines: [60, 45, 55, 40] },
];

function BeforeContent() {
  return (
    <div className="relative h-72 sm:h-80 overflow-hidden rounded-2xl bg-ink-100 border border-ink-300 p-4">
      {BEFORE_CARDS.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 300 }}
          className={`absolute ${card.top} ${card.bg} border rounded-xl p-2.5 sm:p-3 shadow-sm w-36 sm:w-40`}
          style={{ rotate: card.rotate }}
          whileHover={{ scale: 1.04, zIndex: 10 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`w-4 h-4 ${card.iconColor}`} />
            <span className="text-xs font-semibold text-ink-700">{card.label}</span>
          </div>
          <div className="space-y-1">
            {card.lines.map((w, j) => (
              <div key={j} className="h-1.5 bg-ink-200 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        </motion.div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200"
        >
          Chaos. Lost prompts. No system.
        </motion.span>
      </div>
    </div>
  );
}

function AfterContent() {
  return (
    <div className="relative h-72 sm:h-80 overflow-hidden rounded-2xl bg-white border border-ink-300 p-4">
      <div className="h-full flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-400 rounded-lg flex items-center justify-center">
              <Lock className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-ink-900">aiwithrakshith</span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
            className="w-20 h-5 bg-success/20 rounded-full flex items-center justify-center"
          >
            <span className="text-xs font-semibold text-success">All organized</span>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 flex-1">
          {AFTER_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 350 }}
              whileHover={{ scale: 1.04, y: -2 }}
              className={`${item.color} border rounded-xl p-3 flex items-center gap-2`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{item.label}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-ink-100 rounded-xl p-2.5 flex items-center gap-2"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-6 rounded-lg bg-brand-400 flex items-center justify-center flex-shrink-0"
          >
            <Sparkles className="w-3 h-3 text-white" />
          </motion.div>
          <div className="flex-1 h-1.5 bg-ink-300 rounded" />
          <span className="text-xs text-success font-semibold">Found instantly</span>
        </motion.div>
      </div>
    </div>
  );
}

export function BeforeAfterToggle() {
  const [active, setActive] = useState<'before' | 'after'>('before');

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">The difference</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight">
              Life before vs. after.
            </h2>
          </Reveal>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-ink-100 rounded-full p-1.5 inline-flex gap-1">
            {(['before', 'after'] as const).map((opt) => (
              <motion.button
                key={opt}
                onClick={() => setActive(opt)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-colors ${
                  active === opt ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700'
                }`}
                whileTap={{ scale: 0.97 }}
              >
                {active === opt && (
                  <motion.div
                    layoutId="toggle-pill"
                    className="absolute inset-0 bg-white rounded-full shadow-sm"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">
                  {opt === 'before' ? 'Before PromptVault' : 'After PromptVault'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {active === 'before' ? <BeforeContent /> : <AfterContent />}
          </motion.div>
        </AnimatePresence>

        <motion.div
          key={`caption-${active}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-ink-500">
            {active === 'before'
              ? 'Sound familiar? You\'re not alone. Every AI user faces this.'
              : 'Every prompt, project, and course — exactly where you left it.'}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
