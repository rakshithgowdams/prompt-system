const LOGOS = [
  'Bengaluru Tech', 'AI Society', 'Code Camp', 'Design Hub',
  'Maker\'s Den', 'Hassan College', 'Startup Saturday', 'Build Club',
  'Dev Circles', 'Prompt Labs', 'Creator School', 'Hacker House',
];

function Strip({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <div className={`flex gap-12 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} whitespace-nowrap`}
        style={{ width: 'max-content' }}
      >
        {doubled.map((name, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 flex-shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrustMarquee() {
  return (
    <section className="bg-white border-y border-ink-300 py-8 overflow-hidden">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-500 mb-6">
        Loved by learners building with
      </p>
      <div className="space-y-4">
        <Strip items={LOGOS} />
        <Strip items={[...LOGOS].reverse()} reverse />
      </div>
    </section>
  );
}
