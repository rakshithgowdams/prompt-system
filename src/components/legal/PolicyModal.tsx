import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';

export type PolicyType = 'terms' | 'privacy' | 'refund';

const POLICY_META: Record<PolicyType, { title: string; icon: string }> = {
  terms:   { title: 'Terms of Service',  icon: 'gavel'           },
  privacy: { title: 'Privacy Policy',    icon: 'shield'          },
  refund:  { title: 'Refund Policy',     icon: 'currency_rupee'  },
};

// ── Terms Content ─────────────────────────────────────────────────────────────
function TermsContent() {
  return (
    <div className="space-y-6 text-ink-700 text-sm leading-relaxed">
      <Section n={1} title="Acceptance of Terms">
        By accessing or using aiwithrakshith.tech ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to all of the terms and conditions, you must not use the Service.
      </Section>
      <Section n={2} title="Description of Service">
        aiwithrakshith.tech provides an AI prompt management platform that allows users to create, store, organize, and share AI prompts, manage projects, track tasks, and access educational courses.
      </Section>
      <Section n={3} title="User Accounts">
        <BulletList icon="check_circle" color="text-brand-400" items={[
          'You must be at least 13 years old to use the Service.',
          'You are responsible for maintaining the confidentiality of your account credentials.',
          'You are responsible for all activity that occurs under your account.',
          'You must provide accurate and complete information when creating your account.',
        ]} />
      </Section>
      <Section n={4} title="Acceptable Use">
        <p className="mb-2">You agree not to use the Service to:</p>
        <BulletList icon="cancel" color="text-danger" items={[
          'Violate any applicable laws or regulations.',
          'Upload or share content that is illegal, harmful, threatening, or abusive.',
          'Impersonate any person or entity.',
          'Attempt to gain unauthorized access to any portion of the Service.',
          'Interfere with or disrupt the Service or servers connected to it.',
        ]} />
      </Section>
      <Section n={5} title="Intellectual Property">
        The Service and its original content are owned by aiwithrakshith.tech and protected by international copyright laws. Content you create remains your property; you grant us a limited license to store and display it to provide the Service.
      </Section>
      <Section n={6} title="Termination">
        We reserve the right to suspend or terminate your account at any time if we believe you have violated these Terms. Upon termination, your right to use the Service will immediately cease.
      </Section>
      <Section n={7} title="Limitation of Liability">
        To the fullest extent permitted by law, aiwithrakshith.tech shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
      </Section>
      <Section n={8} title="Changes to Terms">
        We reserve the right to modify these terms at any time. Continued use of the Service after notification of changes constitutes acceptance.
      </Section>
    </div>
  );
}

// ── Privacy Content ───────────────────────────────────────────────────────────
function PrivacyContent() {
  return (
    <div className="space-y-6 text-ink-700 text-sm leading-relaxed">
      <Section n={1} title="Information We Collect">
        <p className="mb-2">We collect the following types of information:</p>
        <div className="space-y-2">
          {[
            { label: 'Account Information', desc: 'Email address and hashed password when you register.' },
            { label: 'Profile Information', desc: 'Display name and avatar image you optionally provide.' },
            { label: 'User Content', desc: 'Prompts, projects, notes, todos, courses, and uploaded files.' },
            { label: 'Usage Data', desc: 'Log data including IP address, browser type, and actions within the Service.' },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-ink-100 rounded-md border border-ink-300">
              <p className="font-semibold text-ink-900 text-xs mb-1">{item.label}</p>
              <p className="text-ink-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section n={2} title="How We Use Your Information">
        <BulletList icon="check_circle" color="text-brand-400" items={[
          'Provide, operate, and maintain the Service.',
          'Send transactional emails such as OTP verification.',
          'Improve and personalize your experience.',
          'Detect and prevent fraudulent or unauthorized activity.',
        ]} />
      </Section>
      <Section n={3} title="Data Storage & Security">
        Your data is stored securely using Supabase with encryption at rest and in transit. Passwords are stored as bcrypt hashes. Password vault entries are encrypted client-side with AES-256-GCM before storage — we cannot read them.
      </Section>
      <Section n={4} title="Data Sharing">
        We do not sell your personal data. We share data only with service providers necessary to operate the platform (Supabase, Resend) and law enforcement when required by law.
      </Section>
      <Section n={5} title="Your Rights">
        <BulletList icon="check_circle" color="text-brand-400" items={[
          'Access the personal data we hold about you.',
          'Request correction or deletion of your data.',
          'Export your data in a portable format.',
          'Object to or restrict processing of your data.',
        ]} />
      </Section>
      <Section n={6} title="Data Retention">
        We retain your data while your account is active. Upon deletion, data is permanently removed within 30 days, except where retention is required by law.
      </Section>
    </div>
  );
}

// ── Refund Content ────────────────────────────────────────────────────────────
function RefundContent() {
  return (
    <div className="space-y-6 text-ink-700 text-sm leading-relaxed">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-3">
        <Icon name="info" size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-xs">
          aiwithrakshith.tech is currently a <span className="font-semibold">free service</span>. This policy covers any future paid features or course purchases.
        </p>
      </div>
      <Section n={1} title="Free Tier">
        The core features of aiwithrakshith.tech are provided free of charge. No payment is required, and therefore no refund is applicable for the free tier.
      </Section>
      <Section n={2} title="Paid Plans & Subscriptions">
        <div className="space-y-2 mt-2">
          {[
            { icon: 'calendar_today', label: '7-Day Money-Back Guarantee', desc: 'New subscribers may request a full refund within 7 days of their first payment.' },
            { icon: 'block',          label: 'No Partial Refunds',         desc: 'After the 7-day window, no partial refunds for unused days in a billing period.' },
            { icon: 'autorenew',      label: 'Cancellation',               desc: 'Cancel at any time. Access continues until the end of the current billing period.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-ink-100 border border-ink-300 rounded-md">
              <Icon name={item.icon} size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink-900 text-xs mb-0.5">{item.label}</p>
                <p className="text-ink-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section n={3} title="Course Purchases">
        <BulletList icon="check_circle" color="text-brand-400" items={[
          'Refunds within 30 days if less than 30% of course content consumed.',
          'No refund once a completion certificate has been generated.',
          'Refunds processed to original payment method within 5-10 business days.',
        ]} />
      </Section>
      <Section n={4} title="Non-Refundable Situations">
        <BulletList icon="cancel" color="text-danger" items={[
          'Accounts terminated for Terms of Service violations.',
          'Requests after the applicable refund window.',
          'Failure to use the Service during a paid period.',
        ]} />
      </Section>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-ink-900 mb-2 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-brand-400 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {n}
        </span>
        {title}
      </h3>
      {typeof children === 'string' ? <p>{children}</p> : children}
    </section>
  );
}

function BulletList({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  return (
    <ul className="space-y-1.5 list-none">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <Icon name={icon} size={14} className={`${color} flex-shrink-0 mt-0.5`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface PolicyModalProps {
  type: PolicyType | null;
  onClose: () => void;
  onAccept?: () => void;
}

export function PolicyModal({ type, onClose, onAccept }: PolicyModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Trap scroll and focus within modal
  useEffect(() => {
    if (!type) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [type]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const meta = type ? POLICY_META[type] : null;

  return (
    <AnimatePresence>
      {type && meta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-300 flex-shrink-0">
              <div className="w-8 h-8 rounded-md bg-brand-400 flex items-center justify-center flex-shrink-0">
                <Icon name={meta.icon} size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-extrabold text-ink-900 truncate">{meta.title}</h2>
                <p className="text-[11px] text-ink-500">Last updated: May 26, 2026</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-500 hover:text-ink-900 transition-colors flex-shrink-0"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              {type === 'terms'   && <TermsContent   />}
              {type === 'privacy' && <PrivacyContent />}
              {type === 'refund'  && <RefundContent  />}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-ink-300 flex-shrink-0 bg-ink-100 rounded-b-xl">
              <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
                Close
              </Button>
              {onAccept && (
                <Button variant="primary" size="sm" onClick={() => { onAccept(); onClose(); }} className="flex-1">
                  <Icon name="check" size={15} />
                  Got it
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
