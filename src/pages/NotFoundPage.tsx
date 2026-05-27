import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <img
            src="/aiwithrakshith-tech-logo.webp"
            alt="aiwithrakshith"
            className="h-9 w-9 object-contain"
          />
          <span
            className="font-display font-black text-ink-900 tracking-tight"
            style={{ fontSize: '16px', letterSpacing: '-0.02em' }}
          >
            aiwithrakshith
          </span>
        </div>

        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ duration: 1.6, delay: 0.4, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-ink-100 mb-6"
        >
          <Compass className="w-10 h-10 text-ink-400" />
        </motion.div>

        {/* Heading */}
        <h1
          className="font-display font-black text-ink-900 tracking-tight mb-3"
          style={{ fontSize: 'clamp(48px, 12vw, 80px)', letterSpacing: '-0.04em', lineHeight: 1 }}
        >
          404
        </h1>

        <p className="text-lg font-semibold text-ink-800 mb-2">Page not found</p>
        <p className="text-sm text-ink-500 leading-relaxed mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 bg-ink-900 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-ink-700 transition-colors w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 border border-ink-300 text-ink-700 font-semibold text-sm px-6 py-3 rounded-xl hover:border-ink-700 hover:text-ink-900 transition-colors w-full sm:w-auto justify-center"
          >
            Go to dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
