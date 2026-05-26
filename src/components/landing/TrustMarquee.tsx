import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LOGOS = [
  'Bengaluru Tech', 'AI Society', 'Code Camp', 'Design Hub',
  "Maker's Den", 'Hassan College', 'Startup Saturday', 'Build Club',
  'Dev Circles', 'Prompt Labs', 'Creator School', 'Hacker House',
];

function Strip({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-12 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} whitespace-nowrap`}
        style={{ width: 'max-content' }}
      >
        {doubled.map((name, i) => (
          <motion.span
            key={i}
            whileHover={{ scale: 1.15, color: '#A435F0' }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 flex-shrink-0 cursor-default"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-ink-300 flex-shrink-0"
              whileHover={{ scale: 1.8, backgroundColor: '#A435F0' }}
            />
            {name}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

export function TrustMarquee() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', once: true },
        }
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white border-y border-ink-300 py-8 overflow-hidden">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-500 mb-6"
      >
        Loved by learners building with
      </motion.p>
      <div className="space-y-4">
        <Strip items={LOGOS} />
        <Strip items={[...LOGOS].reverse()} reverse />
      </div>
    </section>
  );
}
