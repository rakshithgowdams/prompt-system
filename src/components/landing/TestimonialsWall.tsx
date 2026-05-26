import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Reveal } from './motion';

const TESTIMONIALS = [
  {
    name: 'Aditi Sharma',
    role: 'AI student',
    initials: 'AS',
    color: 'bg-brand-400',
    quote: 'I finally have a home for every prompt I\'ve ever written. PromptVault is the second brain I always wanted.',
    stars: 5,
  },
  {
    name: 'Karthik Iyer',
    role: 'Indie creator',
    initials: 'KI',
    color: 'bg-blue-500',
    quote: 'I built my first course in 40 minutes. The certificate page made my mum cry.',
    stars: 5,
  },
  {
    name: 'Priya Menon',
    role: 'Freelance designer',
    initials: 'PM',
    color: 'bg-emerald-500',
    quote: 'The encrypted vault alone is worth it. Add the prompts and projects and it\'s a no-brainer.',
    stars: 5,
  },
  {
    name: 'Rohan Gupta',
    role: 'College senior',
    initials: 'RG',
    color: 'bg-amber-500',
    quote: 'It feels like Notion and Udemy had a baby — and that baby is fast.',
    stars: 5,
  },
  {
    name: 'Sneha Reddy',
    role: 'Growth marketer',
    initials: 'SR',
    color: 'bg-rose-500',
    quote: 'I run my entire freelance studio out of PromptVault. Clients are confused how I\'m this organized.',
    stars: 5,
  },
  {
    name: 'Arjun Nair',
    role: 'AI engineer',
    initials: 'AN',
    color: 'bg-violet-500',
    quote: 'I shared one prompt with 50 friends in a day. The sharing flow is butter.',
    stars: 5,
  },
  {
    name: 'Meera Joshi',
    role: 'Team lead',
    initials: 'MJ',
    color: 'bg-teal-500',
    quote: 'The course player is so clean. My team finally watches the trainings I make.',
    stars: 5,
  },
  {
    name: 'Vikram Patel',
    role: 'Coding bootcamp',
    initials: 'VP',
    color: 'bg-sky-500',
    quote: 'Free forever for students is the move. PromptVault has my full loyalty.',
    stars: 5,
  },
];

function TestimonialCard({ t, i }: { t: typeof TESTIMONIALS[0]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: i % 2 === 0 ? -1 : 1 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
      className="bg-white border border-ink-300 rounded-2xl p-6 break-inside-avoid mb-5 hover:shadow-card-hover transition-shadow duration-300"
    >
      <div className="flex gap-1 mb-3">
        {[...Array(t.stars)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-rating text-rating" />
        ))}
      </div>
      <p className="text-sm text-ink-700 leading-relaxed mb-5">"{t.quote}"</p>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {t.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-ink-900">{t.name}</p>
          <p className="text-xs text-ink-500">{t.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsWall() {
  const col1 = TESTIMONIALS.filter((_, i) => i % 3 === 0);
  const col2 = TESTIMONIALS.filter((_, i) => i % 3 === 1);
  const col3 = TESTIMONIALS.filter((_, i) => i % 3 === 2);

  return (
    <section className="bg-ink-100 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
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

        {/* Desktop masonry */}
        <div className="hidden md:grid md:grid-cols-3 gap-5">
          <div>{col1.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}</div>
          <div className="mt-8">{col2.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}</div>
          <div>{col3.map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}</div>
        </div>

        {/* Mobile single column */}
        <div className="md:hidden space-y-4">
          {TESTIMONIALS.slice(0, 4).map((t, i) => <TestimonialCard key={t.name} t={t} i={i} />)}
        </div>
      </div>
    </section>
  );
}
