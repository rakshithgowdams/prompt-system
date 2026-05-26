import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Clock } from 'lucide-react';
import { TiltCard, MagneticButton, Reveal } from './motion';

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  }),
};

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

const FREE_FEATURES = ['Unlimited prompts', '3 projects', '1 course', 'Encrypted vault', 'Public sharing', '500 MB storage'];
const STD_FEATURES = ['Unlimited projects', '10 courses', 'Custom domains', 'Priority support', '10 GB storage', 'Remove branding'];
const PRE_FEATURES = ['Everything in Standard', 'Team workspaces', 'Unlimited courses', 'API access', '100 GB storage', 'Dedicated manager'];

export function PricingTeaser() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-ink-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">Pricing</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight">
              Simple, honest pricing.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 text-lg text-ink-500 max-w-xl mx-auto">
              Start for free. Upgrade when you're ready — paid plans are coming soon.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <TiltCard className="md:col-span-1">
            <motion.div
              custom={0}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white border border-ink-300 rounded-2xl p-8 flex flex-col h-full hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-xs font-bold uppercase tracking-wide text-success bg-success/10 px-3 py-1 rounded-full"
                >
                  Available now
                </motion.span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Free</h3>
              <p className="text-sm text-ink-500 mb-6">For students getting started.</p>
              <div className="mb-8">
                <span className="font-display font-extrabold text-6xl text-ink-900">₹0</span>
                <span className="text-ink-500 ml-2">forever</span>
              </div>
              <motion.ul
                className="space-y-2.5 mb-8 flex-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
              >
                {FREE_FEATURES.map((f, i) => (
                  <motion.li
                    key={f}
                    custom={i}
                    variants={listItemVariants}
                    className="flex items-center gap-2.5 text-sm text-ink-700"
                  >
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <MagneticButton
                as="a"
                href="/signup"
                className="w-full bg-ink-900 text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-brand-400 transition-colors block"
              >
                Get started free
              </MagneticButton>
            </motion.div>
          </TiltCard>

          {/* Standard */}
          <TiltCard className="md:col-span-1">
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white border border-ink-300 rounded-2xl p-8 flex flex-col h-full opacity-80"
            >
              <div className="flex items-center justify-between mb-4">
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5"
                >
                  <Clock className="w-3 h-3" /> Coming Soon
                </motion.span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Standard</h3>
              <p className="text-sm text-ink-500 mb-6">For creators and freelancers.</p>
              <div className="mb-8">
                <span className="font-display font-extrabold text-5xl text-ink-900">₹999</span>
                <span className="text-ink-500 ml-1 text-sm">/mo</span>
              </div>
              <motion.ul
                className="space-y-2.5 mb-8 flex-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
              >
                {STD_FEATURES.map((f, i) => (
                  <motion.li key={f} custom={i} variants={listItemVariants} className="flex items-center gap-2.5 text-sm text-ink-700">
                    <Check className="w-4 h-4 text-ink-300 flex-shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <button disabled className="w-full bg-ink-100 text-ink-500 text-sm font-bold py-3 rounded-xl cursor-not-allowed">
                Notify me
              </button>
            </motion.div>
          </TiltCard>

          {/* Premium */}
          <TiltCard className="md:col-span-1">
            <motion.div
              custom={2}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white border-2 border-brand-200 rounded-2xl p-8 flex flex-col h-full opacity-80"
            >
              <div className="flex items-center justify-between mb-4">
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5"
                >
                  <Clock className="w-3 h-3" /> Coming Soon
                </motion.span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Premium</h3>
              <p className="text-sm text-ink-500 mb-6">For teams and power users.</p>
              <div className="mb-8">
                <span className="font-display font-extrabold text-5xl text-ink-900">₹1,999</span>
                <span className="text-ink-500 ml-1 text-sm">/mo</span>
              </div>
              <motion.ul
                className="space-y-2.5 mb-8 flex-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
              >
                {PRE_FEATURES.map((f, i) => (
                  <motion.li key={f} custom={i} variants={listItemVariants} className="flex items-center gap-2.5 text-sm text-ink-700">
                    <Check className="w-4 h-4 text-ink-300 flex-shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <button disabled className="w-full bg-ink-100 text-ink-500 text-sm font-bold py-3 rounded-xl cursor-not-allowed">
                Notify me
              </button>
            </motion.div>
          </TiltCard>
        </div>

        <div className="text-center mt-10">
          <motion.div whileHover={{ x: 4 }}>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors"
            >
              See all plans and features
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
