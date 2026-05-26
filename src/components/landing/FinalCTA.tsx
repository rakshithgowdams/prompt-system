import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { MagneticButton } from './motion';

gsap.registerPlugin(ScrollTrigger);

const headlineWords = ['Your', 'second'];
const serifWord = 'brain';
const tailWords = ['awaits.'];

export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Blob parallax
      if (blobRef.current) {
        gsap.to(blobRef.current, {
          y: -80, scale: 1.2,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 2,
          },
        });
      }

      // Headline chars
      if (headlineRef.current) {
        const chars = headlineRef.current.querySelectorAll('.final-char');
        gsap.from(chars, {
          y: 70, opacity: 0, rotateX: -50, stagger: 0.025, duration: 0.85,
          ease: 'power4.out',
          scrollTrigger: { trigger: headlineRef.current, start: 'top 80%', once: true },
        });
      }
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-ink-900 text-white py-20 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          ref={blobRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-3xl animate-blob"
        />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '3s' }} />
        <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-blue-500/8 rounded-full blur-3xl animate-blob" style={{ animationDelay: '6s' }} />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300 mb-6"
        >
          Ready when you are
        </motion.p>

        {/* Split char headline */}
        <h2
          ref={headlineRef}
          className="font-display font-extrabold leading-none text-white mb-8"
          style={{ fontSize: 'clamp(52px, 8vw, 110px)', perspective: '800px' }}
          aria-label="Your second brain awaits."
        >
          {headlineWords.map((word) =>
            word.split('').map((ch, i) => (
              <motion.span key={`${word}${i}`} className="final-char" style={{ display: 'inline-block' }}>
                {ch}
              </motion.span>
            )).concat([<motion.span key={`${word}-space`} className="final-char" style={{ display: 'inline-block' }}>&nbsp;</motion.span>])
          )}
          {' '}
          <motion.em
            className="font-serif italic font-medium text-brand-300"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {serifWord}
          </motion.em>
          {' '}
          {tailWords[0].split('').map((ch, i) => (
            <motion.span key={`tail${i}`} className="final-char" style={{ display: 'inline-block' }}>
              {ch}
            </motion.span>
          ))}
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg text-white/60 max-w-xl mx-auto mb-12 leading-relaxed"
        >
          Join 10,000+ students who've already made PromptVault their AI home base.
          Free to start. No credit card. No catch.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto"
        >
          <MagneticButton
            className="group flex items-center gap-2 bg-brand-400 text-white font-bold text-base h-14 px-10 rounded-xl hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/30 cursor-pointer"
            as="button"
            onClick={() => { window.location.href = '/signup'; }}
          >
            Get started free
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </MagneticButton>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/pricing"
              className="flex items-center h-14 px-10 text-sm font-bold text-white/80 border border-white/20 rounded-xl hover:border-white/50 hover:text-white transition-all"
            >
              View pricing
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-xs text-white/30"
        >
          No credit card &middot; Always free for students &middot; Cancel paid plans anytime
        </motion.p>
      </div>
    </section>
  );
}
