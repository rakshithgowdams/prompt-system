import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, BookOpen, Folder, Lock, Share2, FileText } from 'lucide-react';
import { Reveal } from './motion';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Prompt Library',
    desc: 'Save, tag, and reuse every prompt that ever worked. Never lose a great idea again.',
    color: 'text-brand-400',
    bg: 'bg-brand-50',
    hoverBg: 'group-hover:bg-brand-400',
  },
  {
    icon: BookOpen,
    title: 'Mini-Course Builder',
    desc: 'Turn your knowledge into beautiful courses with certificates. Students love it.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    hoverBg: 'group-hover:bg-blue-500',
  },
  {
    icon: Folder,
    title: 'Project Workspaces',
    desc: 'Group prompts, files, and notes into focused workspaces. Ship faster, think clearer.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    hoverBg: 'group-hover:bg-amber-500',
  },
  {
    icon: Lock,
    title: 'Encrypted Vault',
    desc: 'Store passwords and secrets, encrypted client-side. Only you can read them.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    hoverBg: 'group-hover:bg-emerald-500',
  },
  {
    icon: Share2,
    title: 'Shareable Links',
    desc: 'Share any prompt, course, or file with a public link. One click, done.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    hoverBg: 'group-hover:bg-rose-500',
  },
  {
    icon: FileText,
    title: 'Notion-Style Pages',
    desc: 'Write docs that feel like Notion. Live inside your projects, no extra tab needed.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    hoverBg: 'group-hover:bg-violet-500',
  },
];

export function FeatureGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.feature-card');
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.batch(cards, {
        onEnter: (batch) => gsap.from(batch, { y: 60, opacity: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out' }),
        start: 'top 88%',
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="features" className="bg-ink-100 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
              Everything you need
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-extrabold text-ink-900 tracking-tight text-4xl md:text-5xl lg:text-6xl leading-[1.1]">
              Built for the{' '}
              <em className="font-serif italic font-medium text-brand-400">modern student</em>.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-5 text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed">
              Every tool you need to capture ideas, build knowledge, and share your work —
              all under one roof.
            </p>
          </Reveal>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              className="feature-card bg-white border border-ink-300 rounded-2xl p-8 group cursor-default hover:shadow-card-hover transition-all duration-300"
              whileHover={{ y: -6 }}
            >
              <div className={`w-12 h-12 ${f.bg} ${f.hoverBg} group-hover:text-white rounded-xl flex items-center justify-center mb-5 transition-all duration-300`}>
                <f.icon className={`w-5 h-5 ${f.color} group-hover:text-white transition-colors`} />
              </div>
              <h3 className="font-display font-bold text-lg text-ink-900 mb-2">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
