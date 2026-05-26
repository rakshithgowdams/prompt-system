import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, ArrowLeft, ChevronRight } from 'lucide-react';

const sections = [
  { id: 'overview',        label: 'Overview' },
  { id: 'free-tier',       label: 'Free Tier' },
  { id: 'paid-plans',      label: 'Paid Plans' },
  { id: 'courses',         label: 'Course Purchases' },
  { id: 'non-refundable',  label: 'Non-Refundable Situations' },
  { id: 'process',         label: 'How to Request a Refund' },
  { id: 'processing-time', label: 'Processing Time' },
  { id: 'contact',         label: 'Contact' },
];

function SectionNum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-700 text-white text-xs font-bold flex-shrink-0">
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

function CrossItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-700 leading-relaxed">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 3l4 4M7 3L3 7" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      {children}
    </li>
  );
}

export function RefundPolicyPage() {
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
            <span className="text-ink-900 font-medium truncate">Refund Policy</span>
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
      <div className="bg-gradient-to-br from-green-900 via-green-800 to-ink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <IndianRupee size={14} className="text-green-300" />
              <span className="text-xs font-semibold text-white/80">Legal Document</span>
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
              Refund Policy
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              We want you to be completely satisfied. Here's exactly when and how refunds are handled.
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

          {/* Table of contents */}
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
                        ? 'bg-green-700 text-white font-semibold'
                        : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100'
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-xl bg-ink-100 border border-ink-300">
                <p className="text-xs font-semibold text-ink-900 mb-1">Request a refund?</p>
                <p className="text-xs text-ink-500 leading-relaxed">
                  Contact us directly and we'll process eligible refunds within 48 hours.
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

            <section id="overview" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={1} />
                <h2 className="text-xl font-display font-bold text-ink-900">Overview</h2>
              </div>
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">Currently a free platform</p>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      aiwithrakshith.tech is currently provided as a <strong>free service</strong>. This Refund Policy establishes the terms that will govern any future paid features, premium subscriptions, or individual course purchases. We believe in full transparency about our commercial terms before they apply.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="free-tier" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={2} />
                <h2 className="text-xl font-display font-bold text-ink-900">Free Tier</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                All core features of aiwithrakshith.tech — including the Prompt Vault, Project Manager, Todo Manager, Password Vault, and basic Courses — are provided completely free of charge. Since no payment is collected for these features, no refund is applicable for free tier usage.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="paid-plans" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={3} />
                <h2 className="text-xl font-display font-bold text-ink-900">Paid Plans &amp; Subscriptions</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-6">
                When paid plans are introduced, the following refund terms will apply:
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    ),
                    color: 'green',
                    label: '7-Day Money-Back Guarantee',
                    desc: 'New subscribers may request a full refund within 7 calendar days of their first payment — no questions asked, no reason required.',
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    ),
                    color: 'red',
                    label: 'No Partial Refunds',
                    desc: 'After the 7-day window closes, no partial refunds will be issued for unused days remaining in a billing period.',
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-3" />
                      </svg>
                    ),
                    color: 'blue',
                    label: 'Subscription Cancellation',
                    desc: 'You may cancel your subscription at any time from your account settings. Access to paid features continues until the end of the current billing period.',
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    ),
                    color: 'amber',
                    label: 'Annual Plans',
                    desc: 'Annual subscribers are eligible for a prorated refund for unused complete months if the request is made within 30 days of purchase.',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 p-5 rounded-xl border border-ink-300 bg-ink-100 hover:border-ink-500 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.color === 'green' ? 'bg-green-100 text-green-700' :
                      item.color === 'red' ? 'bg-red-100 text-red-600' :
                      item.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900 mb-1">{item.label}</p>
                      <p className="text-sm text-ink-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="courses" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={4} />
                <h2 className="text-xl font-display font-bold text-ink-900">Course Purchases</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-5">
                For individual paid course purchases (when applicable), the following terms apply:
              </p>
              <ul className="space-y-3">
                {[
                  'Full refunds are available within 30 days of purchase, provided less than 30% of the course content has been consumed.',
                  'Partial refunds (50%) may be issued if you have consumed between 30–60% of the course content and request a refund within 30 days.',
                  'No refund will be issued once a completion certificate has been generated for that course.',
                  'Refunds will be processed to the original payment method within 5–10 business days.',
                  'In the event of course withdrawal by us, a full refund will be issued regardless of consumption.',
                ].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
              </ul>
            </section>

            <div className="border-t border-ink-300" />

            <section id="non-refundable" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={5} />
                <h2 className="text-xl font-display font-bold text-ink-900">Non-Refundable Situations</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-5">
                Refunds will not be issued in the following circumstances:
              </p>
              <ul className="space-y-3">
                {[
                  'Accounts that have been terminated due to violation of our Terms of Service.',
                  'Refund requests made after the applicable refund window has expired.',
                  'Dissatisfaction with features available on the free tier.',
                  'Failure to use the Service during a paid subscription period.',
                  'Requests citing issues caused by your own hardware, software, or internet connection.',
                  'Purchases made using free credits, discount codes, or promotional offers (unless otherwise stated).',
                ].map((item, i) => <CrossItem key={i}>{item}</CrossItem>)}
              </ul>
            </section>

            <div className="border-t border-ink-300" />

            <section id="process" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={6} />
                <h2 className="text-xl font-display font-bold text-ink-900">How to Request a Refund</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-6">
                To request a refund, follow these steps:
              </p>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Contact us on Instagram', desc: 'Send a direct message to @aiwithrakshith on Instagram from the account associated with your purchase.' },
                  { step: '02', title: 'Provide your details', desc: 'Include your registered email address, the date of purchase, the plan or course name, and a brief reason for your refund request.' },
                  { step: '03', title: 'Await confirmation', desc: 'We will review your request and respond within 2 business days with either a confirmation or a request for additional information.' },
                  { step: '04', title: 'Receive your refund', desc: 'Approved refunds are processed to your original payment method. Please allow 5–10 business days for the amount to appear in your account.' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <span className="font-display font-black text-2xl text-ink-300 flex-shrink-0 w-10 text-right leading-none mt-1">
                      {item.step}
                    </span>
                    <div className="flex-1 p-4 rounded-xl bg-ink-100 border border-ink-300">
                      <p className="text-sm font-bold text-ink-900 mb-1">{item.title}</p>
                      <p className="text-sm text-ink-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="processing-time" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={7} />
                <h2 className="text-xl font-display font-bold text-ink-900">Processing Time</h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Review', value: '1–2 business days', desc: 'We review your request and confirm eligibility.' },
                  { label: 'Approval', value: '2–3 business days', desc: 'Approved refunds are initiated with our payment processor.' },
                  { label: 'Receipt', value: '5–10 business days', desc: 'Funds appear in your original payment account.' },
                ].map((item) => (
                  <div key={item.label} className="p-5 rounded-xl border border-ink-300 bg-white text-center">
                    <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">{item.label}</p>
                    <p className="text-base font-display font-bold text-ink-900 mb-2">{item.value}</p>
                    <p className="text-xs text-ink-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="contact" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={8} />
                <h2 className="text-xl font-display font-bold text-ink-900">Contact</h2>
              </div>
              <div className="p-6 rounded-2xl bg-ink-900 text-white">
                <p className="text-sm leading-relaxed text-white/70 mb-4">
                  For all refund requests or questions about this policy, please contact us directly:
                </p>
                <a
                  href="https://www.instagram.com/aiwithrakshith"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  @aiwithrakshith on Instagram
                </a>
                <p className="text-xs text-white/40 mt-4">
                  We aim to respond to all refund requests within 2 business days.
                </p>
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
            <Link to="/privacy" className="text-xs text-ink-500 hover:text-ink-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-ink-500 hover:text-ink-900 transition-colors">Terms</Link>
            <Link to="/refund" className="text-xs text-brand-500 font-semibold">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
