import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, BookOpen, Folder, Lock, Share2, FileText } from 'lucide-react';
import { TiltCard, Reveal } from './motion';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Prompt Library',
    desc: 'Save, tag, and reuse every prompt that ever worked. Never lose a great idea again.',
    color: 'text-brand-400',
    bg: 'bg-brand-50',
    hoverBg: 'group-hover:bg-brand-400',
    glow: 'shadow-brand-200/60',
  },
  {
    icon: BookOpen,
    title: 'Mini-Course Builder',
    desc: 'Turn your knowledge into beautiful courses with certificates. Students love it.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    hoverBg: 'group-hover:bg-blue-500',
    glow: 'shadow-blue-200/60',
  },
  {
    icon: Folder,
    title: 'Project Workspaces',
    desc: 'Group prompts, files, and notes into focused workspaces. Ship faster, think clearer.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    hoverBg: 'group-hover:bg-amber-500',
    glow: 'shadow-amber-200/60',
  },
  {
    icon: Lock,
    title: 'Encrypted Vault',
    desc: 'Store passwords and secrets, encrypted client-side. Only you can read them.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    hoverBg: 'group-hover:bg-emerald-500',
    glow: 'shadow-emerald-200/60',
  },
  {
    icon: Share2,
    title: 'Shareable Links',
    desc: 'Share any prompt, course, or file with a public link. One click, done.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    hoverBg: 'group-hover:bg-rose-500',
    glow: 'shadow-rose-200/60',
  },
  {
    icon: FileText,
    title: 'Notion-Style Pages',
    desc: 'Write docs that feel like Notion. Live inside your projects, no extra tab needed.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    hoverBg: 'group-hover:bg-violet-500',
    glow: 'shadow-violet-200/60',
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
        onEnter: (batch) =>
          gsap.from(batch, { y: 70, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out' }),
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
          {FEATURES.map((f, i) => (
            <TiltCard key={f.title} className="feature-card">
              <motion.div
                className={`bg-white border border-ink-300 rounded-2xl p-8 group cursor-default h-full transition-shadow duration-300 hover:shadow-[0_20px_60px_-15px] hover:${f.glow}`}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Icon */}
                <motion.div
                  className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-5 overflow-hidden relative`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <motion.div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    style={{ background: 'currentColor' }}
                  />
                  <f.icon
                    className={`w-5 h-5 ${f.color} group-hover:text-white transition-colors duration-300 relative z-10`}
                  />
                  {/* Ripple on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    initial={false}
                    whileHover={{
                      boxShadow: ['0 0 0 0px rgba(164,53,240,0.3)', '0 0 0 12px rgba(164,53,240,0)'],
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.div>

                <motion.h3
                  className="font-display font-bold text-lg text-ink-900 mb-2"
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {f.title}
                </motion.h3>
                <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>

                {/* Bottom accent line */}
                <motion.div
                  className="mt-6 h-0.5 bg-ink-200 rounded-full overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand-400 to-pink-400 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.div>
              </motion.div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
