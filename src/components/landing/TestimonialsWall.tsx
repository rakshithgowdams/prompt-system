import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star } from 'lucide-react';
import { TiltCard, Reveal } from './motion';

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  { name: 'Aditi Sharma', role: 'AI student', initials: 'AS', color: 'bg-brand-400', quote: 'I finally have a home for every prompt I\'ve ever written. PromptVault is the second brain I always wanted.', stars: 5 },
  { name: 'Karthik Iyer', role: 'Indie creator', initials: 'KI', color: 'bg-blue-500', quote: 'I built my first course in 40 minutes. The certificate page made my mum cry.', stars: 5 },
  { name: 'Priya Menon', role: 'Freelance designer', initials: 'PM', color: 'bg-emerald-500', quote: 'The encrypted vault alone is worth it. Add the prompts and projects and it\'s a no-brainer.', stars: 5 },
  { name: 'Rohan Gupta', role: 'College senior', initials: 'RG', color: 'bg-amber-500', quote: 'It feels like Notion and Udemy had a baby — and that baby is fast.', stars: 5 },
  { name: 'Sneha Reddy', role: 'Growth marketer', initials: 'SR', color: 'bg-rose-500', quote: 'I run my entire freelance studio out of PromptVault. Clients are confused how I\'m this organized.', stars: 5 },
  { name: 'Arjun Nair', role: 'AI engineer', initials: 'AN', color: 'bg-violet-500', quote: 'I shared one prompt with 50 friends in a day. The sharing flow is butter.', stars: 5 },
  { name: 'Meera Joshi', role: 'Team lead', initials: 'MJ', color: 'bg-teal-500', quote: 'The course player is so clean. My team finally watches the trainings I make.', stars: 5 },
  { name: 'Vikram Patel', role: 'Coding bootcamp', initials: 'VP', color: 'bg-sky-500', quote: 'Free forever for students is the move. PromptVault has my full loyalty.', stars: 5 },
];

function StarRating({ count }: { count: number }) {
  return (
    <motion.div
      className="flex gap-1 mb-3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
    >
      {[...Array(count)].map((_, i) => (
        <motion.span
          key={i}
          variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1 } }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          <Star className="w-4 h-4 fill-rating text-rating" />
        </motion.span>
      ))}
    </motion.div>
  );
}

function TestimonialCard({ t, i }: { t: typeof TESTIMONIALS[0]; i: number }) {
  return (
    <TiltCard className="mb-5 break-inside-avoid">
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: i % 2 === 0 ? -1.5 : 1.5 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -6, boxShadow: '0 24px 60px -12px rgba(0,0,0,0.12)' }}
        className="bg-white border border-ink-300 rounded-2xl p-6 h-full"
      >
        <StarRating count={t.stars} />
        <motion.p
          className="text-sm text-ink-700 leading-relaxed mb-5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + (i % 3) * 0.08 }}
        >
          "{t.quote}"
        </motion.p>
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
            whileHover={{ scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {t.initials}
          </motion.div>
          <div>
            <p className="text-sm font-bold text-ink-900">{t.name}</p>
            <p className="text-xs text-ink-500">{t.role}</p>
          </div>
        </div>
      </motion.div>
    </TiltCard>
  );
}

export function TestimonialsWall() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const heading = sectionRef.current.querySelector('.testimonials-heading');
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(heading, {
        y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: heading, start: 'top 85%', once: true },
      });
    });
    return () => mm.revert();
  }, []);

  const col1 = TESTIMONIALS.filter((_, i) => i % 3 === 0);
  const col2 = TESTIMONIALS.filter((_, i) => i % 3 === 1);
  const col3 = TESTIMONIALS.filter((_, i) => i % 3 === 2);

  return (
    <section ref={sectionRef} className="bg-ink-100 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="testimonials-heading text-center mb-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
              Loved by 10,000+ students
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight">
              Don't take our word for it.
            </h2>
          </Reveal>
        </div>

        {/* Desktop masonry — 3 columns */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            {col1.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-8">
            {col2.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
            {col3.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}
          </motion.div>
        </div>

        {/* Tablet — 2 columns */}
        <div className="hidden sm:grid lg:hidden grid-cols-2 gap-5">
          {TESTIMONIALS.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}
        </div>

        {/* Mobile single column */}
        <div className="sm:hidden space-y-4">
          {TESTIMONIALS.slice(0, 5).map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}
        </div>
      </div>
    </section>
  );
}
