import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CountUp, ScrambleText } from './motion';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { target: 10000, suffix: '+', label: 'Active learners' },
  { target: 50000, suffix: '+', label: 'Prompts saved' },
  { target: 1200,  suffix: '+', label: 'Courses created' },
  { target: 99,    suffix: '.9%', label: 'Uptime' },
];

export function StatsRow() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const items = sectionRef.current.querySelectorAll('.stat-item');
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(items, {
        y: 50, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', once: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white py-20 px-6 border-b border-ink-300">
      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-10">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="stat-item text-center group"
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="relative inline-block">
              <CountUp
                target={s.target}
                suffix={s.suffix}
                className="block font-display text-5xl lg:text-6xl font-extrabold text-ink-900 leading-none"
              />
              <motion.div
                className="absolute -bottom-1 left-0 h-0.5 bg-brand-400 rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-500 group-hover:text-brand-500 transition-colors">
              <ScrambleText text={s.label} />
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
