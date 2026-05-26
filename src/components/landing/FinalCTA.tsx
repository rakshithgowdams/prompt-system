import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative bg-ink-900 text-white py-32 px-6 overflow-hidden">
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '3s' }} />
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

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-extrabold leading-none text-white mb-8"
          style={{ fontSize: 'clamp(52px, 8vw, 110px)' }}
        >
          Your second{' '}
          <em className="font-serif italic font-medium text-brand-300">brain</em>{' '}
          awaits.
        </motion.h2>

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
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/signup"
            className="group flex items-center gap-2 bg-brand-400 text-white font-bold text-base h-14 px-10 rounded-xl hover:bg-brand-500 transition-all duration-300 shadow-lg shadow-brand-500/30"
          >
            Get started free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/pricing"
            className="flex items-center gap-2 text-sm font-bold text-white/80 border border-white/20 h-14 px-10 rounded-xl hover:border-white/50 hover:text-white transition-all"
          >
            View pricing
          </Link>
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
