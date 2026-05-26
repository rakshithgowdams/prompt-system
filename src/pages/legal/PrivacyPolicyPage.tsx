import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, ChevronRight } from 'lucide-react';

const sections = [
  { id: 'collection',  label: 'Information We Collect' },
  { id: 'use',         label: 'How We Use Your Data' },
  { id: 'storage',     label: 'Storage & Security' },
  { id: 'sharing',     label: 'Data Sharing' },
  { id: 'cookies',     label: 'Cookies & Tracking' },
  { id: 'rights',      label: 'Your Rights' },
  { id: 'retention',   label: 'Data Retention' },
  { id: 'changes',     label: 'Policy Changes' },
  { id: 'contact',     label: 'Contact Us' },
];

function SectionNum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-400 text-white text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-700 leading-relaxed">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </li>
  );
}

function InfoCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl border border-ink-300 bg-ink-100 hover:border-brand-400/40 hover:bg-brand-50/30 transition-colors">
      <p className="text-xs font-bold text-ink-900 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export function PrivacyPolicyPage() {
  const [activeId, setActiveId] = useState(sections[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    const els = contentRef.current?.querySelectorAll('section[id]');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-ink-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith" className="h-8 w-8 object-contain" />
            <span className="hidden sm:block font-display font-black text-ink-900 tracking-tight" style={{ fontSize: '14px', letterSpacing: '-0.02em' }}>
              aiwithrakshith
            </span>
          </Link>
          <div className="flex items-center gap-1 text-xs text-ink-500 min-w-0">
            <Link to="/" className="hover:text-ink-900 transition-colors whitespace-nowrap">Home</Link>
            <ChevronRight size={12} className="flex-shrink-0" />
            <span className="text-ink-900 font-medium truncate">Privacy Policy</span>
          </div>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Sign up</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-ink-900 via-ink-700 to-ink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <Shield size={14} className="text-brand-400" />
              <span className="text-xs font-semibold text-white/80">Legal Document</span>
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              We believe privacy is a right, not a feature. Here's exactly what we collect, why, and how we protect it.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-8 text-xs text-white/40">
              <span>Last updated: May 26, 2026</span>
              <span>&bull;</span>
              <span>Effective: May 26, 2026</span>
              <span>&bull;</span>
              <span>{sections.length} sections</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex gap-12 xl:gap-16">

          {/* Table of contents — sticky sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-4">On this page</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`block text-sm py-1.5 px-3 rounded-lg transition-all duration-150 leading-snug ${
                      activeId === s.id
                        ? 'bg-brand-50 text-brand-500 font-semibold border-l-2 border-brand-400'
                        : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100'
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-xl bg-ink-100 border border-ink-300">
                <p className="text-xs font-semibold text-ink-900 mb-1">Questions?</p>
                <p className="text-xs text-ink-500 leading-relaxed">
                  Reach out on Instagram and we'll respond within 48 hours.
                </p>
                <a
                  href="https://www.instagram.com/aiwithrakshith"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
                >
                  @aiwithrakshith →
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div ref={contentRef} className="flex-1 min-w-0 space-y-12">

            <section id="collection" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={1} />
                <h2 className="text-xl font-display font-bold text-ink-900">Information We Collect</h2>
              </div>
              <p className="text-sm text-ink-500 leading-relaxed mb-5">
                We collect only what's necessary to provide and improve the Service. Here's a breakdown:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoCard label="Account Information" desc="Your email address and password (stored as a bcrypt hash — we never see your raw password)." />
                <InfoCard label="Profile Information" desc="Display name and avatar image you optionally choose to provide." />
                <InfoCard label="User Content" desc="Prompts, projects, notes, todos, course progress, and any files you upload to the platform." />
                <InfoCard label="Usage Data" desc="Log data including IP address, browser type, pages visited, and actions taken within the Service." />
                <InfoCard label="Device Information" desc="Device type, operating system, and browser version for compatibility and debugging." />
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="use" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={2} />
                <h2 className="text-xl font-display font-bold text-ink-900">How We Use Your Data</h2>
              </div>
              <ul className="space-y-3">
                {[
                  'Provide, operate, and maintain the Service.',
                  'Send transactional emails such as account verification and password resets.',
                  'Personalize your experience and remember your preferences.',
                  'Monitor and analyze usage trends to improve the Service.',
                  'Detect and prevent fraudulent or unauthorized activity.',
                  'Communicate important updates or changes to the Service.',
                ].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
              </ul>
            </section>

            <div className="border-t border-ink-300" />

            <section id="storage" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={3} />
                <h2 className="text-xl font-display font-bold text-ink-900">Storage &amp; Security</h2>
              </div>
              <div className="space-y-4 text-sm text-ink-700 leading-relaxed">
                <p>
                  Your data is stored on Supabase, which provides enterprise-grade infrastructure with encryption at rest (AES-256) and in transit (TLS 1.3). Passwords are stored as bcrypt hashes and are never accessible by our team.
                </p>
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-1">Password Vault Encryption</p>
                  <p className="text-sm text-green-700 leading-relaxed">
                    Vault entries are encrypted <strong>client-side</strong> using AES-256-GCM with PBKDF2 key derivation before being sent to our servers. This means we are mathematically unable to read your saved passwords — even with full database access.
                  </p>
                </div>
                <p>
                  File uploads are stored in private, access-controlled storage buckets. Signed URLs with short expiry times are used to serve files securely.
                </p>
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="sharing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={4} />
                <h2 className="text-xl font-display font-bold text-ink-900">Data Sharing</h2>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-5">
                <p className="text-sm font-semibold text-amber-800">We do not sell your personal data. Full stop.</p>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-4">We may share information with:</p>
              <ul className="space-y-3">
                {[
                  'Supabase — for database storage, file storage, and authentication infrastructure.',
                  'Resend — for sending transactional emails (verification, password reset). Only your email address is shared.',
                  'Law enforcement when required by applicable law or court order, or to protect the rights, safety, and security of users.',
                ].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
              </ul>
            </section>

            <div className="border-t border-ink-300" />

            <section id="cookies" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={5} />
                <h2 className="text-xl font-display font-bold text-ink-900">Cookies &amp; Tracking</h2>
              </div>
              <div className="space-y-4 text-sm text-ink-700 leading-relaxed">
                <p>
                  We use session cookies and localStorage tokens to keep you signed in. These are strictly necessary for the Service to function.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-ink-100 border border-ink-300">
                    <p className="text-xs font-bold text-ink-900 uppercase tracking-wide mb-2">What we use</p>
                    <ul className="space-y-1 text-xs text-ink-500">
                      <li>• Authentication session token</li>
                      <li>• localStorage for auth refresh tokens</li>
                      <li>• No analytics cookies</li>
                      <li>• No advertising cookies</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-ink-100 border border-ink-300">
                    <p className="text-xs font-bold text-ink-900 uppercase tracking-wide mb-2">What we don't use</p>
                    <ul className="space-y-1 text-xs text-ink-500">
                      <li>• No third-party ad trackers</li>
                      <li>• No Google Analytics</li>
                      <li>• No cross-site tracking</li>
                      <li>• No fingerprinting</li>
                    </ul>
                  </div>
                </div>
                <p>
                  You can clear cookies and localStorage through your browser settings, which will sign you out of the Service.
                </p>
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="rights" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={6} />
                <h2 className="text-xl font-display font-bold text-ink-900">Your Rights</h2>
              </div>
              <p className="text-sm text-ink-500 leading-relaxed mb-5">
                Depending on your location (including GDPR for EU residents and CCPA for California residents), you have the following rights:
              </p>
              <ul className="space-y-3">
                {[
                  'Access — request a copy of the personal data we hold about you.',
                  'Correction — request that we correct inaccurate or incomplete data.',
                  'Deletion — request deletion of your account and all associated personal data.',
                  'Restriction — object to or restrict how we process your data.',
                  'Portability — export your data in a structured, machine-readable format.',
                  'Withdraw consent — where processing is based on consent, you may withdraw it at any time.',
                ].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
              </ul>
              <p className="mt-5 text-sm text-ink-500">
                To exercise any right, contact us at{' '}
                <a href="https://www.instagram.com/aiwithrakshith" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-600 font-semibold transition-colors">@aiwithrakshith</a>.
                We will respond within 30 days.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="retention" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={7} />
                <h2 className="text-xl font-display font-bold text-ink-900">Data Retention</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                We retain your data for as long as your account is active. Upon account deletion request, your personal data and user content are permanently deleted within <strong>30 days</strong>, except where retention is required by applicable law (e.g., tax or legal obligations).
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="changes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={8} />
                <h2 className="text-xl font-display font-bold text-ink-900">Policy Changes</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes via the email address associated with your account or via a prominent notice within the Service at least 7 days before the change takes effect. Continued use of the Service after changes are posted constitutes acceptance of the revised policy.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="contact" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={9} />
                <h2 className="text-xl font-display font-bold text-ink-900">Contact Us</h2>
              </div>
              <div className="p-6 rounded-2xl bg-ink-900 text-white">
                <p className="text-sm leading-relaxed text-white/70 mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please reach out:
                </p>
                <a
                  href="https://www.instagram.com/aiwithrakshith"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  @aiwithrakshith on Instagram
                </a>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-ink-300 bg-ink-100 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-500">&copy; 2026 aiwithrakshith.tech. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-xs text-brand-500 font-semibold">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-ink-500 hover:text-ink-900 transition-colors">Terms</Link>
            <Link to="/refund" className="text-xs text-ink-500 hover:text-ink-900 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
