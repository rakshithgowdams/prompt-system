import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, StickyNote, Folder, BookOpen, Lock, Sparkles } from 'lucide-react';
import { Reveal } from './motion';

function BeforeContent() {
  return (
    <div className="relative h-72 overflow-hidden rounded-2xl bg-ink-100 border border-ink-300 p-4">
      <div className="absolute top-4 left-4 bg-white border border-ink-300 rounded-xl p-3 shadow-sm rotate-[-3deg] w-40">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-ink-500" />
          <span className="text-xs font-semibold text-ink-700">ChatGPT Export</span>
        </div>
        <div className="space-y-1">
          {[80, 60, 70].map((w, i) => <div key={i} className="h-1.5 bg-ink-300 rounded" style={{ width: `${w}%` }} />)}
        </div>
      </div>
      <div className="absolute top-8 right-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 shadow-sm rotate-[2deg] w-36">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="w-4 h-4 text-yellow-600" />
          <span className="text-xs font-semibold text-yellow-700">Notes app</span>
        </div>
        <div className="space-y-1">
          {[70, 50].map((w, i) => <div key={i} className="h-1.5 bg-yellow-200 rounded" style={{ width: `${w}%` }} />)}
        </div>
      </div>
      <div className="absolute bottom-10 left-8 bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-sm rotate-[1deg] w-40">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-blue-700">Telegram Saved</span>
        </div>
        <div className="space-y-1">
          {[90, 65, 75].map((w, i) => <div key={i} className="h-1.5 bg-blue-200 rounded" style={{ width: `${w}%` }} />)}
        </div>
      </div>
      <div className="absolute bottom-4 right-6 bg-white border border-ink-300 rounded-xl p-3 shadow-sm rotate-[-1deg] w-32">
        <div className="text-xs text-ink-500 space-y-1">
          {[60, 45, 55, 40].map((w, i) => <div key={i} className="h-1.5 bg-ink-300 rounded" style={{ width: `${w}%` }} />)}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
          Chaos. Lost prompts. No system.
        </span>
      </div>
    </div>
  );
}

function AfterContent() {
  return (
    <div className="relative h-72 overflow-hidden rounded-2xl bg-white border border-ink-300 p-4">
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-400 rounded-lg flex items-center justify-center">
              <Lock className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-ink-900">PromptVault</span>
          </div>
          <div className="w-20 h-5 bg-success/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-success">All organized</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[
            { icon: Sparkles, label: '42 Prompts', color: 'bg-brand-50 border-brand-200 text-brand-600' },
            { icon: BookOpen, label: '3 Courses', color: 'bg-blue-50 border-blue-200 text-blue-600' },
            { icon: Folder, label: '5 Projects', color: 'bg-amber-50 border-amber-200 text-amber-600' },
            { icon: Lock, label: 'Vault secure', color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
          ].map((item) => (
            <div key={item.label} className={`${item.color} border rounded-xl p-3 flex items-center gap-2`}>
              <item.icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="bg-ink-100 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 h-1.5 bg-ink-300 rounded" />
          <span className="text-xs text-success font-semibold">Found instantly</span>
        </div>
      </div>
    </div>
  );
}

export function BeforeAfterToggle() {
  const [active, setActive] = useState<'before' | 'after'>('before');

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
              The difference
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight">
              Life before vs. after PromptVault.
            </h2>
          </Reveal>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-ink-100 rounded-full p-1.5 inline-flex gap-1">
            {(['before', 'after'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setActive(opt)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                  active === opt
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {opt === 'before' ? 'Before PromptVault' : 'After PromptVault'}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {active === 'before' ? <BeforeContent /> : <AfterContent />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 text-center">
          <p className="text-sm text-ink-500">
            {active === 'before'
              ? 'Sound familiar? You\'re not alone. Every AI user faces this.'
              : 'Every prompt, project, and course — exactly where you left it.'}
          </p>
        </div>
      </div>
    </section>
  );
}
