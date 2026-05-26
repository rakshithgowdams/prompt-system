import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { Sparkles, Tag, BookOpen, Users, Share2, Monitor, Smartphone } from 'lucide-react';
import { Reveal } from './motion';

gsap.registerPlugin(ScrollTrigger);

function Block1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !cardRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
          end: 'bottom 40%',
          scrub: 1,
        },
      });
      const title = cardRef.current!.querySelector('.mock-title');
      const tags = cardRef.current!.querySelectorAll('.mock-tag');
      const lines = cardRef.current!.querySelectorAll('.mock-line');
      tl.from(title, { width: 0, opacity: 0, duration: 0.4 })
        .from(tags, { scale: 0, opacity: 0, stagger: 0.15, duration: 0.3 }, '-=0.2')
        .from(lines, { opacity: 0, x: -20, stagger: 0.1, duration: 0.3 }, '-=0.1');
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={sectionRef} className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-4">Capture</p>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 leading-tight mb-6">
            Capture every prompt, forever.
          </h2>
          <p className="text-lg text-ink-500 leading-relaxed mb-8">
            Your best prompts disappear into old chats. PromptVault gives every prompt a permanent home — tagged, searchable, and always one click away.
          </p>
          <ul className="space-y-3">
            {['Tag with custom categories', 'Search across all prompts', 'Share with anyone via link', 'Works with any AI tool'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-semibold text-ink-700">
                <span className="w-5 h-5 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-brand-400" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <div ref={cardRef} className="relative">
          <div className="bg-white border border-ink-300 rounded-2xl p-6 shadow-card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand-400" />
              </div>
              <div className="mock-title overflow-hidden">
                <div className="h-3.5 bg-ink-900 rounded-full w-48" />
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['#midjourney', '#portrait', '#cinematic', '#v6'].map((tag) => (
                <span key={tag} className="mock-tag bg-brand-50 border border-brand-200 text-brand-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {[90, 75, 85, 60, 70].map((w, i) => (
                <div key={i} className="mock-line h-2.5 bg-ink-100 rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-ink-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-ink-500" />
                <span className="text-xs text-ink-500">4 tags</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-100 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}

function Block2() {
  return (
    <div className="py-24 px-6 bg-ink-900">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Mock course builder */}
        <div className="order-2 lg:order-1">
          <div className="bg-ink-700 border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 bg-white/20 rounded w-40" />
              <div className="w-20 h-7 bg-brand-400 rounded-lg" />
            </div>
            {[
              { w: '100%', label: 'Introduction' },
              { w: '100%', label: 'Chapter 1: Basics' },
              { w: '80%', label: 'Chapter 2: Advanced' },
              { w: '40%', label: 'Chapter 3: Projects' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold text-white/60">
                  {i + 1}
                </div>
                <div className="flex-1 h-2.5 bg-white/20 rounded" style={{ width: item.w }} />
                <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-success" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Reveal className="order-1 lg:order-2" delay={0.1}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300 mb-4">Build</p>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white leading-tight mb-6">
            Build a course in minutes.
          </h2>
          <p className="text-lg text-white/60 leading-relaxed mb-8">
            You know things worth teaching. PromptVault's course builder gets out of your way — add sections, upload videos, and publish. Certificates included.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <BookOpen className="w-4 h-4 text-brand-300" />
              <span>Unlimited sections</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Users className="w-4 h-4 text-brand-300" />
              <span>Public shareable</span>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Block3() {
  return (
    <div className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-4">Share</p>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 leading-tight mb-6">
            Share your knowledge, instantly.
          </h2>
          <p className="text-lg text-ink-500 leading-relaxed mb-8">
            One link. Accessible from any device. Password-protect it or make it fully public — your choice.
          </p>
          <ul className="space-y-3">
            {['No sign-up required to view', 'Works on mobile and desktop', 'Shareable certificates', 'Custom access controls'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-semibold text-ink-700">
                <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-success" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="relative flex items-center justify-center gap-6">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="bg-white border border-ink-300 rounded-2xl p-4 shadow-card-hover w-48"
          >
            <div className="w-full h-24 bg-gradient-to-br from-brand-100 to-brand-200 rounded-xl mb-3" />
            <div className="h-2.5 bg-ink-900 rounded w-3/4 mb-1.5" />
            <div className="h-2 bg-ink-300 rounded w-1/2" />
          </motion.div>

          <div className="flex flex-col items-center gap-3">
            <Share2 className="w-8 h-8 text-brand-400" />
            <div className="w-px h-16 bg-gradient-to-b from-brand-400 to-transparent" />
          </div>

          <div className="space-y-3">
            {[Monitor, Smartphone].map((Icon, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
                className="bg-ink-100 border border-ink-300 rounded-xl p-3 flex items-center gap-2"
              >
                <Icon className="w-5 h-5 text-ink-500" />
                <div className="h-2 bg-ink-300 rounded w-16" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <div>
      <Block1 />
      <Block2 />
      <Block3 />
    </div>
  );
}
