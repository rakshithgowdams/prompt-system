import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Sparkles, BookOpen, Folder, Lock, Share2, ChevronDown } from 'lucide-react';
import { MagneticButton, Reveal } from './motion';

gsap.registerPlugin(ScrollTrigger);

const PILL_FEATURES = [
  { icon: Sparkles, label: 'AI Prompts' },
  { icon: BookOpen, label: 'Courses' },
  { icon: Folder, label: 'Projects' },
  { icon: Lock, label: 'Vault' },
  { icon: Share2, label: 'Sharing' },
];

const charVariants = {
  hidden: { opacity: 0, y: 60, rotateX: -60 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.65, delay: i * 0.016, ease: [0.22, 1, 0.36, 1] },
  }),
};

function SplitHeadline() {
  const lines = [
    { text: 'Your prompts, projects,', serif: false },
    { text: 'and ', serif: false, serifPart: 'learning', rest: ' —' },
    { text: 'all in one vault.', serif: false },
  ];

  let charIndex = 0;

  return (
    <motion.h1
      className="font-display font-extrabold tracking-tight text-ink-900 leading-[1.05]"
      style={{
        perspective: '800px',
        fontSize: 'clamp(32px, 8vw, 96px)',
      }}
      aria-label="Your prompts, projects, and learning — all in one vault."
    >
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.serifPart ? (
            <>
              {line.text.split('').map((ch) => {
                const i = charIndex++;
                return (
                  <motion.span
                    key={i}
                    custom={i}
                    variants={charVariants}
                    initial="hidden"
                    animate="visible"
                    style={{ display: 'inline-block', whiteSpace: ch === ' ' ? 'pre' : undefined }}
                  >
                    {ch === ' ' ? '\u00a0' : ch}
                  </motion.span>
                );
              })}
              <motion.em
                style={{ fontStyle: 'italic', color: '#A435F0' }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: charIndex * 0.016, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {line.serifPart}
              </motion.em>
              {line.rest?.split('').map((ch) => {
                const i = charIndex++;
                return (
                  <motion.span
                    key={`r${i}`}
                    custom={i}
                    variants={charVariants}
                    initial="hidden"
                    animate="visible"
                    style={{ display: 'inline-block' }}
                  >
                    {ch}
                  </motion.span>
                );
              })}
            </>
          ) : (
            line.text.split('').map((ch) => {
              const i = charIndex++;
              return (
                <motion.span
                  key={i}
                  custom={i}
                  variants={charVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ display: 'inline-block', whiteSpace: ch === ' ' ? 'pre' : undefined }}
                >
                  {ch === ' ' ? '\u00a0' : ch}
                </motion.span>
              );
            })
          )}
        </span>
      ))}
    </motion.h1>
  );
}

function DeviceMockup() {
  const deviceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deviceRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', () => {
      gsap.fromTo(
        deviceRef.current,
        { rotateX: 18, scale: 0.94, y: 60 },
        {
          rotateX: 0, scale: 1, y: 0,
          scrollTrigger: {
            trigger: deviceRef.current,
            start: 'top 85%',
            end: 'top 30%',
            scrub: 1,
          },
        }
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <motion.div
      ref={deviceRef}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-12 sm:mt-16 w-full max-w-3xl px-0 sm:px-4 lg:px-0"
      style={{ perspective: '1200px' }}
    >
      <div className="rounded-xl sm:rounded-2xl border border-ink-300 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Tab bar */}
        <div className="bg-ink-100 border-b border-ink-300 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2">
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-2 sm:mx-4 min-w-0">
            <div className="bg-white rounded-md border border-ink-300 px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 max-w-xs mx-auto">
              <Lock className="w-3 h-3 text-success flex-shrink-0" />
              <span className="text-xs text-ink-500 truncate">aiwithrakshith.tech</span>
            </div>
          </div>
        </div>
        {/* Dashboard */}
        <div className="bg-white p-3 sm:p-6 grid grid-cols-3 gap-3 sm:gap-4 min-h-[240px] sm:min-h-[320px]">
          <div className="col-span-1 border-r border-ink-300 pr-2 sm:pr-4 space-y-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="h-6 sm:h-7 bg-brand-50 rounded-lg flex items-center px-1.5 sm:px-2 gap-1.5"
            >
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-brand-400 flex-shrink-0" />
              <div className="h-2 bg-brand-200 rounded flex-1 min-w-0" />
            </motion.div>
            {['bg-ink-100', 'bg-ink-100', 'bg-ink-100', 'bg-ink-100'].map((bg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.05 + i * 0.07 }}
                className={`h-6 sm:h-7 ${bg} rounded-lg flex items-center px-1.5 sm:px-2 gap-1.5`}
              >
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-ink-300 flex-shrink-0" />
                <div className="h-2 bg-ink-300 rounded flex-1 min-w-0" />
              </motion.div>
            ))}
          </div>
          <div className="col-span-2 space-y-3 sm:space-y-4 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex items-center justify-between gap-2"
            >
              <div className="h-3 sm:h-4 w-20 sm:w-32 bg-ink-900 rounded-full flex-shrink-0" />
              <div className="h-6 sm:h-7 w-16 sm:w-24 bg-brand-400 rounded-lg flex-shrink-0" />
            </motion.div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { color: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-400' },
                { color: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-400' },
                { color: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-400' },
                { color: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-400' },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={`${card.color} border ${card.border} rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-1.5 sm:space-y-2`}
                >
                  <div className={`w-5 h-5 sm:w-8 sm:h-8 ${card.accent} rounded-md sm:rounded-lg`} />
                  <div className="h-2 bg-ink-300 rounded w-3/4" />
                  <div className="h-1.5 bg-ink-200 rounded w-1/2" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating orbs — hidden on mobile, visible md+ */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.05 }}
        className="hidden md:flex absolute -left-8 top-1/4 bg-white border border-ink-300 rounded-xl shadow-card px-3 py-2.5 items-center gap-2 text-xs font-semibold text-ink-900 cursor-default"
      >
        <Sparkles className="w-4 h-4 text-brand-400" />
        42 prompts saved
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        whileHover={{ scale: 1.05 }}
        className="hidden md:flex absolute -right-6 top-1/3 bg-white border border-ink-300 rounded-xl shadow-card px-3 py-2.5 items-center gap-2 text-xs font-semibold text-ink-900 cursor-default"
      >
        <BookOpen className="w-4 h-4 text-blue-500" />
        Course published
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        whileHover={{ scale: 1.05 }}
        className="hidden md:flex absolute -left-4 bottom-8 bg-white border border-ink-300 rounded-xl shadow-card px-3 py-2.5 items-center gap-2 text-xs font-semibold text-ink-900 cursor-default"
      >
        <Share2 className="w-4 h-4 text-emerald-500" />
        Link shared with 50+
      </motion.div>
    </motion.div>
  );
}

export function HeroSection() {
  const blobRef1 = useRef<HTMLDivElement>(null);
  const blobRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (blobRef1.current) {
        gsap.to(blobRef1.current, {
          y: -60, x: 30, scrollTrigger: { trigger: 'body', start: 'top top', end: '+=600', scrub: 2 },
        });
      }
      if (blobRef2.current) {
        gsap.to(blobRef2.current, {
          y: 40, x: -40, scrollTrigger: { trigger: 'body', start: 'top top', end: '+=600', scrub: 2 },
        });
      }
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
      {/* Blobs — clamped so they don't overflow on mobile */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div ref={blobRef1} className="absolute -top-32 -left-32 w-[280px] sm:w-[400px] lg:w-[500px] h-[280px] sm:h-[400px] lg:h-[500px] bg-brand-200/30 rounded-full blur-3xl animate-blob" />
        <div ref={blobRef2} className="absolute top-20 -right-16 w-[300px] sm:w-[450px] lg:w-[600px] h-[300px] sm:h-[450px] lg:h-[600px] bg-pink-200/25 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/3 w-[200px] sm:w-[300px] lg:w-[400px] h-[200px] sm:h-[300px] lg:h-[400px] bg-blue-200/25 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 bg-white border border-ink-300 rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold text-ink-700 shadow-sm mb-6 sm:mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
          <span>Now in public beta — Join 10,000+ early users</span>
        </motion.div>

        {/* Split-character headline */}
        <SplitHeadline />

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 sm:mt-7 text-base sm:text-lg md:text-xl text-ink-500 max-w-xl sm:max-w-2xl mx-auto leading-relaxed px-2"
        >
          PromptVault is the home for every prompt you've written, every course you've built,
          and every file you'll ever share. Free, forever, for students.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-8 sm:mt-10 w-full sm:w-auto"
        >
          <MagneticButton
            className="group flex items-center justify-center gap-2 bg-ink-900 text-white font-bold text-base h-13 sm:h-14 px-8 rounded-xl hover:bg-brand-400 transition-all duration-300 shadow-lg hover:shadow-brand-400/30 cursor-pointer w-full sm:w-auto"
            as="button"
            onClick={() => { window.location.href = '/signup'; }}
          >
            Start free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>

          <motion.a
            href="#features"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-700 border border-ink-300 h-13 sm:h-14 px-8 rounded-xl hover:border-ink-700 hover:text-ink-900 transition-all w-full sm:w-auto"
          >
            <ChevronDown className="w-4 h-4" />
            See how it works
          </motion.a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-3 text-xs text-ink-500"
        >
          No credit card &middot; Forever free for students
        </motion.p>

        {/* Staggered pill strip */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-8"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.08, delayChildren: 1.05 } },
            hidden: {},
          }}
        >
          {PILL_FEATURES.map(({ icon: Icon, label }) => (
            <motion.div
              key={label}
              variants={{ hidden: { opacity: 0, y: 12, scale: 0.85 }, visible: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.08, y: -2 }}
              className="flex items-center gap-1.5 bg-white border border-ink-300 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm cursor-default"
            >
              <Icon className="w-3.5 h-3.5 text-brand-400" />
              {label}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <DeviceMockup />
    </section>
  );
}
