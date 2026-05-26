import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus, Clock } from 'lucide-react';
import { MarketingShell } from '../../components/landing/MarketingShell';
import { FAQ } from '../../components/landing/FAQ';
import { FinalCTA } from '../../components/landing/FinalCTA';
import { NotifyMeModal } from '../../components/landing/NotifyMeModal';
import { Reveal, TiltCard, MagneticButton } from '../../components/landing/motion';

type Billing = 'monthly' | 'half-yearly' | 'yearly';

function calc(baseMonthly: number) {
  return {
    monthly: {
      perMo: baseMonthly,
      billed: 'Billed monthly',
    },
    'half-yearly': {
      perMo: Math.round(baseMonthly * 0.85),
      billed: `Billed ₹${Math.round(baseMonthly * 0.85 * 6).toLocaleString('en-IN')} every 6 months`,
    },
    yearly: {
      perMo: Math.round(baseMonthly * 0.75),
      billed: `Billed ₹${Math.round(baseMonthly * 0.75 * 12).toLocaleString('en-IN')} every year`,
    },
  };
}

const standardPricing = calc(999);
const premiumPricing = calc(1999);

function BillingToggle({ value, onChange }: { value: Billing; onChange: (v: Billing) => void }) {
  const options: { id: Billing; label: string; badge?: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'half-yearly', label: '6 Months', badge: 'Save 15%' },
    { id: 'yearly', label: 'Yearly', badge: 'Save 25%' },
  ];

  return (
    <div
      className="inline-flex bg-ink-100 rounded-full p-1.5 gap-1"
      role="radiogroup"
      aria-label="Billing cycle"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
            value === opt.id
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {opt.label}
          {opt.badge && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              opt.id === 'yearly' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {opt.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function AnimatedPrice({ value, suffix = '/mo' }: { value: number; suffix?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="font-display font-extrabold"
        style={{ fontSize: 'clamp(48px, 6vw, 72px)', lineHeight: 1 }}
      >
        ₹{value.toLocaleString('en-IN')}
        <span className="text-xl font-semibold text-ink-500">{suffix}</span>
      </motion.span>
    </AnimatePresence>
  );
}

function AnimatedBilled({ value }: { value: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="text-xs text-ink-500 block mt-1"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Comparison table data ───────────────────────────────────────────────────

type Cell = string | boolean;

interface TableRow {
  feature: string;
  free: Cell;
  standard: Cell;
  premium: Cell;
  group?: string;
}

const TABLE_ROWS: TableRow[] = [
  // Prompts
  { feature: 'Saved prompts', free: 'Unlimited', standard: 'Unlimited', premium: 'Unlimited', group: 'Prompts' },
  { feature: 'Tagging', free: true, standard: true, premium: true },
  { feature: 'Variables', free: true, standard: true, premium: true },
  { feature: 'Folders', free: '3 folders', standard: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Version history', free: false, standard: true, premium: true },
  { feature: 'AI suggestions', free: false, standard: false, premium: true },
  // Projects
  { feature: 'Max projects', free: '3', standard: 'Unlimited', premium: 'Unlimited', group: 'Projects' },
  { feature: 'Pages per project', free: '5', standard: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Cover images', free: true, standard: true, premium: true },
  { feature: 'Project sharing', free: true, standard: true, premium: true },
  // Courses
  { feature: 'Max courses', free: '1', standard: '10', premium: 'Unlimited', group: 'Courses' },
  { feature: 'Course sections', free: 'Unlimited', standard: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Certificate generation', free: true, standard: true, premium: true },
  { feature: 'Custom branding', free: false, standard: true, premium: true },
  { feature: 'Analytics', free: 'Basic', standard: 'Advanced', premium: 'Advanced' },
  // Files
  { feature: 'Storage', free: '500 MB', standard: '10 GB', premium: '100 GB', group: 'Files' },
  { feature: 'Max file size', free: '25 MB', standard: '500 MB', premium: '2 GB' },
  { feature: 'Folder nesting', free: true, standard: true, premium: true },
  { feature: 'Drag-drop upload', free: true, standard: true, premium: true },
  // Vault
  { feature: 'Max items', free: '10', standard: 'Unlimited', premium: 'Unlimited', group: 'Vault' },
  { feature: 'Encryption', free: true, standard: true, premium: true },
  { feature: 'Auto-fill', free: false, standard: true, premium: true },
  { feature: 'Recovery codes', free: true, standard: true, premium: true },
  // Sharing
  { feature: 'Public links', free: true, standard: true, premium: true, group: 'Sharing' },
  { feature: 'Password-protected links', free: false, standard: true, premium: true },
  { feature: 'Custom domains', free: false, standard: true, premium: true },
  { feature: 'Expiry dates', free: false, standard: true, premium: true },
  // Support
  { feature: 'Support type', free: 'Community', standard: 'Priority email', premium: 'Dedicated', group: 'Support' },
  { feature: 'Response time', free: 'Best effort', standard: '< 24h', premium: '< 4h' },
  { feature: 'Dedicated manager', free: false, standard: false, premium: true },
];

function CellValue({ val }: { val: Cell }) {
  if (val === true) return <Check className="w-4 h-4 text-success mx-auto" />;
  if (val === false) return <Minus className="w-4 h-4 text-ink-300 mx-auto" />;
  return <span className="text-xs font-medium text-ink-700 text-center block">{val}</span>;
}

function ComparisonTable() {
  let lastGroup = '';

  return (
    <div className="max-w-5xl mx-auto mt-20">
      <h2 className="font-display font-extrabold text-3xl text-ink-900 text-center mb-10">
        Full feature comparison
      </h2>
      <div className="bg-white border border-ink-300 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="bg-ink-100 border-b border-ink-300">
              <th className="text-left py-4 px-6 text-sm font-bold text-ink-900 w-1/2 sticky left-0 bg-ink-100">Feature</th>
              <th className="text-center py-4 px-4 text-sm font-bold text-ink-900 w-1/6">Free</th>
              <th className="text-center py-4 px-4 text-sm font-bold text-ink-900 w-1/6">Standard</th>
              <th className="text-center py-4 px-4 text-sm font-bold text-brand-500 w-1/6">Premium</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row) => {
              const isNewGroup = row.group && row.group !== lastGroup;
              if (row.group) lastGroup = row.group;
              return [
                isNewGroup && (
                  <tr key={`group-${row.group}`} className="bg-ink-100/60">
                    <td colSpan={4} className="py-2.5 px-6 text-xs font-bold uppercase tracking-widest text-ink-500">
                      {row.group}
                    </td>
                  </tr>
                ),
                <tr key={row.feature} className="border-t border-ink-300/60 hover:bg-ink-100/30 transition-colors">
                  <td className="py-3 px-6 text-sm text-ink-700 sticky left-0 bg-white">{row.feature}</td>
                  <td className="py-3 px-4 text-center"><CellValue val={row.free} /></td>
                  <td className="py-3 px-4 text-center"><CellValue val={row.standard} /></td>
                  <td className="py-3 px-4 text-center"><CellValue val={row.premium} /></td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main PricingPage ─────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [notifyTier, setNotifyTier] = useState<'standard' | 'premium' | null>(null);

  return (
    <MarketingShell>
      {notifyTier && (
        <NotifyMeModal tier={notifyTier} onClose={() => setNotifyTier(null)} />
      )}

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 text-center">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-4">Pricing</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink-900 tracking-tight leading-tight">
            Simple pricing.{' '}
            <em className="font-serif italic font-medium text-brand-400">Free forever</em>
            {' '}for students.
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-5 text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed">
            Standard and Premium are coming soon. For now, every feature is free.
            Sign up and lock in your username.
          </p>
        </Reveal>
      </section>

      {/* Billing toggle */}
      <div className="flex justify-center px-4 sm:px-6 mb-8 sm:mb-12">
        <Reveal>
          <BillingToggle value={billing} onChange={setBilling} />
        </Reveal>
      </div>

      {/* Cards */}
      <section className="px-4 sm:px-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">

          {/* Free */}
          <TiltCard>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ boxShadow: '0 24px 60px -12px rgba(0,0,0,0.12)' }}
              className="bg-white border border-ink-300 rounded-2xl p-8 flex flex-col h-full"
            >
              <motion.span
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block text-xs font-bold uppercase tracking-wide text-success bg-success/10 px-3 py-1 rounded-full mb-5 w-fit"
              >
                Available now
              </motion.span>
              <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Free</h2>
              <p className="text-sm text-ink-500 mb-6">For students getting started.</p>
              <div className="mb-1">
                <span className="font-display font-extrabold text-ink-900" style={{ fontSize: '72px', lineHeight: 1 }}>
                  ₹0
                </span>
              </div>
              <span className="text-sm text-ink-500 mb-8 block">forever</span>

              <MagneticButton as="a" href="/signup" className="w-full bg-ink-900 text-white text-sm font-bold py-3.5 rounded-xl text-center hover:bg-brand-400 transition-colors mb-6 block cursor-pointer">
                Get started free
              </MagneticButton>

              <hr className="border-ink-300 mb-6" />

              <motion.ul
                className="space-y-3 flex-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } }, hidden: {} }}
              >
                {[
                  'Unlimited prompts',
                  'Up to 3 projects',
                  'Up to 1 course',
                  'Encrypted password vault (10 items)',
                  'Public share links',
                  'Community support',
                  '500 MB file storage',
                ].map((f) => (
                  <motion.li
                    key={f}
                    variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                    className="flex items-start gap-2.5 text-sm text-ink-700"
                  >
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <p className="mt-5 text-xs text-ink-500">No credit card required.</p>
            </motion.div>
          </TiltCard>

          {/* Standard */}
          <TiltCard>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ boxShadow: '0 24px 60px -12px rgba(0,0,0,0.10)' }}
              className="bg-white border border-ink-300 rounded-2xl p-8 flex flex-col h-full"
            >
              <motion.span
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-5 w-fit"
              >
                <Clock className="w-3 h-3" /> Coming Soon
              </motion.span>
              <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Standard</h2>
              <p className="text-sm text-ink-500 mb-6">For serious creators and freelancers.</p>
              <div className="mb-1"><AnimatedPrice value={standardPricing[billing].perMo} /></div>
              <AnimatedBilled value={standardPricing[billing].billed} />
              <div className="my-6 h-px bg-transparent" />

              <motion.button
                onClick={() => setNotifyTier('standard')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-ink-100 text-ink-700 text-sm font-bold py-3.5 rounded-xl hover:bg-ink-200 transition-colors mb-6"
              >
                Notify me when it launches
              </motion.button>

              <hr className="border-ink-300 mb-6" />

              <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">Everything in Free, plus:</p>
              <motion.ul
                className="space-y-3 flex-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } }, hidden: {} }}
              >
                {['Unlimited projects', 'Up to 10 courses', 'Encrypted vault (unlimited items)', 'Custom domain for share pages', 'Remove "PromptVault" branding', 'Priority email support', '10 GB file storage', 'Advanced analytics'].map((f) => (
                  <motion.li
                    key={f}
                    variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                    className="flex items-start gap-2.5 text-sm text-ink-700"
                  >
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </TiltCard>

          {/* Premium */}
          <TiltCard>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ boxShadow: '0 32px 80px -12px rgba(164,53,240,0.25)' }}
              className="relative bg-white border-2 border-brand-400 rounded-2xl p-8 flex flex-col h-full shadow-2xl shadow-brand-200/40 lg:scale-[1.02] overflow-hidden"
            >
              <div
                className="absolute top-5 right-[-28px] bg-brand-400 text-white text-xs font-bold px-10 py-1"
                style={{ transform: 'rotate(35deg)', transformOrigin: 'right' }}
              >
                Most Popular
              </div>
              <motion.span
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-5 w-fit"
              >
                <Clock className="w-3 h-3" /> Coming Soon
              </motion.span>
              <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Premium</h2>
              <p className="text-sm text-ink-500 mb-6">For teams and power users.</p>
              <div className="mb-1"><AnimatedPrice value={premiumPricing[billing].perMo} /></div>
              <AnimatedBilled value={premiumPricing[billing].billed} />
              <div className="my-6 h-px bg-transparent" />

              <motion.button
                onClick={() => setNotifyTier('premium')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-brand-400 text-white text-sm font-bold py-3.5 rounded-xl hover:bg-brand-500 transition-colors mb-6"
              >
                Notify me when it launches
              </motion.button>

              <hr className="border-brand-200 mb-6" />

              <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">Everything in Standard, plus:</p>
              <motion.ul
                className="space-y-3 flex-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } }, hidden: {} }}
              >
                {['Team workspaces (up to 10 seats)', 'Unlimited courses', 'AI prompt suggestions', 'White-label certificates', 'Webhooks and API access', 'Dedicated account manager', '100 GB file storage', 'SSO & SAML', 'SLA-backed uptime'].map((f) => (
                  <motion.li
                    key={f}
                    variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                    className="flex items-start gap-2.5 text-sm text-ink-700"
                  >
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </TiltCard>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20">
        <ComparisonTable />
      </section>

      {/* Pricing FAQ */}
      <FAQ variant="pricing" />

      <FinalCTA />
    </MarketingShell>
  );
}
