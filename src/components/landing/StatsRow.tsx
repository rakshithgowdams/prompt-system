import { CountUp, Reveal } from './motion';

const STATS = [
  { target: 10000, suffix: '+', label: 'Active learners' },
  { target: 50000, suffix: '+', label: 'Prompts saved' },
  { target: 1200,  suffix: '+', label: 'Courses created' },
  { target: 99,    suffix: '.9%', label: 'Uptime' },
];

export function StatsRow() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-10">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} className="text-center">
            <CountUp
              target={s.target}
              suffix={s.suffix}
              className="block font-display text-5xl lg:text-6xl font-extrabold text-ink-900 leading-none"
            />
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              {s.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
