import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Sparkles, BookOpen, Folder, Lock, Share2, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

function HeroBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-2 bg-white border border-ink-300 rounded-full px-4 py-1.5 text-xs font-semibold text-ink-700 shadow-sm mb-8"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      Now in public beta — Join 10,000+ early users
    </motion.div>
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
          rotateX: 0,
          scale: 1,
          y: 0,
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
      transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-16 max-w-4xl"
      style={{ perspective: '1200px' }}
    >
      {/* Browser chrome */}
      <div className="rounded-2xl border border-ink-300 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Tab bar */}
        <div className="bg-ink-100 border-b border-ink-300 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md border border-ink-300 px-3 py-1.5 flex items-center gap-2 max-w-sm mx-auto">
              <Lock className="w-3 h-3 text-success" />
              <span className="text-xs text-ink-500">app.aiwithrakshith.tech/dashboard</span>
            </div>
          </div>
        </div>
        {/* Dashboard content */}
        <div className="bg-white p-6 grid grid-cols-3 gap-4 min-h-[340px]">
          {/* Sidebar */}
          <div className="col-span-1 border-r border-ink-300 pr-4 space-y-2">
            <div className="h-7 bg-brand-50 rounded-lg flex items-center px-2 gap-2">
              <div className="w-4 h-4 rounded bg-brand-400" />
              <div className="h-2 bg-brand-200 rounded flex-1" />
            </div>
            {['bg-ink-100', 'bg-ink-100', 'bg-ink-100', 'bg-ink-100'].map((bg, i) => (
              <div key={i} className={`h-7 ${bg} rounded-lg flex items-center px-2 gap-2`}>
                <div className="w-4 h-4 rounded bg-ink-300" />
                <div className="h-2 bg-ink-300 rounded flex-1" />
              </div>
            ))}
          </div>
          {/* Main content */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-ink-900 rounded-full" />
              <div className="h-7 w-24 bg-brand-400 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { color: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-400' },
                { color: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-400' },
                { color: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-400' },
                { color: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-400' },
              ].map((card, i) => (
                <div key={i} className={`${card.color} border ${card.border} rounded-xl p-3 space-y-2`}>
                  <div className={`w-8 h-8 ${card.accent} rounded-lg`} />
                  <div className="h-2.5 bg-ink-300 rounded w-3/4" />
                  <div className="h-2 bg-ink-200 rounded w-1/2" />
                </div>
              ))}
            </div>
            <div className="bg-ink-100 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-400 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-ink-300 rounded w-2/3" />
                <div className="h-2 bg-ink-200 rounded w-1/2" />
              </div>
              <div className="h-6 w-16 bg-success/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-8 top-1/4 bg-white border border-ink-300 rounded-xl shadow-card p-3 flex items-center gap-2 text-xs font-semibold text-ink-900"
      >
        <Sparkles className="w-4 h-4 text-brand-400" />
        42 prompts saved
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-6 top-1/3 bg-white border border-ink-300 rounded-xl shadow-card p-3 flex items-center gap-2 text-xs font-semibold text-ink-900"
      >
        <BookOpen className="w-4 h-4 text-blue-500" />
        Course published
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -left-4 bottom-8 bg-white border border-ink-300 rounded-xl shadow-card p-3 flex items-center gap-2 text-xs font-semibold text-ink-900"
      >
        <Share2 className="w-4 h-4 text-emerald-500" />
        Link shared with 50+
      </motion.div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 px-6">
      {/* Blob background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-brand-200/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-20 -right-20 w-[600px] h-[600px] bg-pink-200/25 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-blue-200/25 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">
        <HeroBadge />

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-extrabold tracking-tight text-ink-900 leading-[1.05] text-5xl sm:text-6xl md:text-7xl xl:text-8xl"
        >
          Your prompts, projects,
          <br />
          and{' '}
          <em className="font-serif font-medium italic text-brand-400 not-italic" style={{ fontStyle: 'italic' }}>
            learning
          </em>{' '}
          —
          <br />
          all in one vault.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-7 text-lg md:text-xl text-ink-500 max-w-2xl mx-auto leading-relaxed"
        >
          PromptVault is the home for every prompt you've written, every course you've built,
          and every file you'll ever share. Free, forever, for students.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-10"
        >
          <Link
            to="/signup"
            className="group flex items-center gap-2 bg-ink-900 text-white font-bold text-base h-14 px-8 rounded-xl hover:bg-brand-400 transition-all duration-300 shadow-lg hover:shadow-brand-400/30"
          >
            Start free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 text-sm font-semibold text-ink-700 border border-ink-300 h-14 px-8 rounded-xl hover:border-ink-700 hover:text-ink-900 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            See how it works
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="mt-4 text-xs text-ink-500"
        >
          No credit card &middot; Forever free for students
        </motion.p>

        {/* Feature pill strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
        >
          {[
            { icon: Sparkles, label: 'AI Prompts' },
            { icon: BookOpen, label: 'Courses' },
            { icon: Folder, label: 'Projects' },
            { icon: Lock, label: 'Vault' },
            { icon: Share2, label: 'Sharing' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-white border border-ink-300 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm">
              <Icon className="w-3.5 h-3.5 text-brand-400" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      <DeviceMockup />
    </section>
  );
}
