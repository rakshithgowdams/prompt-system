import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, ArrowLeft, ChevronRight } from 'lucide-react';

const sections = [
  { id: 'acceptance',    label: 'Acceptance of Terms' },
  { id: 'description',   label: 'Description of Service' },
  { id: 'accounts',      label: 'User Accounts' },
  { id: 'acceptable',    label: 'Acceptable Use' },
  { id: 'ip',            label: 'Intellectual Property' },
  { id: 'content',       label: 'Your Content' },
  { id: 'protection',    label: 'Content Protection' },
  { id: 'disclaimer',    label: 'Disclaimer of Warranties' },
  { id: 'liability',     label: 'Limitation of Liability' },
  { id: 'termination',   label: 'Termination' },
  { id: 'governing',     label: 'Governing Law' },
  { id: 'changes',       label: 'Changes to Terms' },
  { id: 'contact',       label: 'Contact' },
];

function SectionNum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-ink-900 text-white text-xs font-bold flex-shrink-0">
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

export function TermsPage() {
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
            <img src="/aiwithrakshith-tech-logo.webp" alt="aiwithrakshith" className="h-8 w-8 object-contain" />
            <span className="hidden sm:block font-display font-black text-ink-900 tracking-tight" style={{ fontSize: '14px', letterSpacing: '-0.02em' }}>
              aiwithrakshith
            </span>
          </Link>
          <div className="flex items-center gap-1 text-xs text-ink-500 min-w-0">
            <Link to="/" className="hover:text-ink-900 transition-colors whitespace-nowrap">Home</Link>
            <ChevronRight size={12} className="flex-shrink-0" />
            <span className="text-ink-900 font-medium truncate">Terms of Service</span>
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
              <Scale size={14} className="text-white/70" />
              <span className="text-xs font-semibold text-white/80">Legal Document</span>
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              By using aiwithrakshith.tech, you agree to these terms. Please read them carefully — they're written in plain language.
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
                        ? 'bg-ink-900 text-white font-semibold'
                        : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100'
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-xl bg-ink-100 border border-ink-300">
                <p className="text-xs font-semibold text-ink-900 mb-1">Need help?</p>
                <p className="text-xs text-ink-500 leading-relaxed">
                  Questions about these terms? We're happy to clarify.
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

            <section id="acceptance" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={1} />
                <h2 className="text-xl font-display font-bold text-ink-900">Acceptance of Terms</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                By accessing or using aiwithrakshith.tech (the "Service"), you confirm that you have read, understood, and agree to be bound by these Terms of Service and our <Link to="/privacy" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">Privacy Policy</Link>. If you do not agree to all of the terms and conditions herein, you must immediately discontinue use of the Service.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="description" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={2} />
                <h2 className="text-xl font-display font-bold text-ink-900">Description of Service</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-4">
                aiwithrakshith.tech is an AI productivity platform that provides:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Prompt Vault', desc: 'Create, store, organize, and share AI prompts across projects.' },
                  { label: 'Project Management', desc: 'Manage projects with file storage, notes, and folder organization.' },
                  { label: 'Todo Manager', desc: 'Track tasks and to-dos with priority and deadline management.' },
                  { label: 'Courses', desc: 'Access AI-focused educational content and earn completion certificates.' },
                  { label: 'Password Vault', desc: 'Client-side encrypted credential storage for your important accounts.' },
                  { label: 'File Sharing', desc: 'Securely share files and prompts via public or password-protected links.' },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-ink-100 border border-ink-300">
                    <p className="text-xs font-bold text-ink-900 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-xs text-ink-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="accounts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={3} />
                <h2 className="text-xl font-display font-bold text-ink-900">User Accounts</h2>
              </div>
              <ul className="space-y-3">
                {[
                  'You must be at least 13 years old to use the Service.',
                  'You are responsible for maintaining the confidentiality of your account credentials.',
                  'You are responsible for all activity that occurs under your account.',
                  'You must provide accurate and complete information when creating your account.',
                  'You may not create accounts for others without their explicit consent.',
                  'You may not transfer your account to another person without our prior written consent.',
                  'You must notify us immediately of any unauthorized access to your account.',
                ].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
              </ul>
            </section>

            <div className="border-t border-ink-300" />

            <section id="acceptable" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={4} />
                <h2 className="text-xl font-display font-bold text-ink-900">Acceptable Use</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mb-5">
                You agree not to use the Service to:
              </p>
              <ul className="space-y-3">
                {[
                  'Violate any applicable local, national, or international laws or regulations.',
                  'Upload or share content that is illegal, harmful, threatening, abusive, or defamatory.',
                  'Impersonate any person, entity, or the aiwithrakshith.tech team.',
                  'Attempt to gain unauthorized access to any portion of the Service or its infrastructure.',
                  'Interfere with or disrupt the Service, servers, or networks connected to it.',
                  'Scrape, crawl, or spider any content from the Service without express written consent.',
                  'Reverse engineer, decompile, or disassemble any part of the Service.',
                  'Use the Service to send unsolicited communications (spam).',
                ].map((item, i) => <CrossItem key={i}>{item}</CrossItem>)}
              </ul>
            </section>

            <div className="border-t border-ink-300" />

            <section id="ip" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={5} />
                <h2 className="text-xl font-display font-bold text-ink-900">Intellectual Property</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                The Service and its original content, features, branding, and functionality are owned exclusively by aiwithrakshith.tech and are protected by applicable intellectual property laws, including copyright and trademark law. You may not reproduce, distribute, modify, or create derivative works of the Service without our express written permission.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="content" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={6} />
                <h2 className="text-xl font-display font-bold text-ink-900">Your Content</h2>
              </div>
              <div className="space-y-4 text-sm text-ink-700 leading-relaxed">
                <p>
                  Content you create, upload, or store on the platform (prompts, notes, files, projects) remains <strong>your property</strong>. We claim no ownership over your content.
                </p>
                <p>
                  By using the Service, you grant aiwithrakshith.tech a limited, non-exclusive, worldwide, royalty-free license to store, display, and transmit your content solely for the purpose of operating and providing the Service to you. This license terminates when you delete the content or your account.
                </p>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Your Responsibility</p>
                  <p className="text-sm text-amber-700">
                    You are solely responsible for the content you create and share on the platform. Do not upload content you do not have the right to use.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="protection" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={7} />
                <h2 className="text-xl font-display font-bold text-ink-900">Content Protection and Acceptable Use</h2>
              </div>
              <div className="space-y-5 text-sm text-ink-700 leading-relaxed">
                <p>
                  All course videos, written materials, downloadable resources, prompts, and documentation on aiwithrakshith.tech (the "Content") are the intellectual property of aiwithrakshith.tech or its licensors and are protected by Indian and international copyright law.
                </p>

                <div>
                  <p className="font-bold text-ink-900 mb-3">7.1 Prohibited Actions</p>
                  <p className="mb-3">By using the Platform, you agree NOT to:</p>
                  <ul className="space-y-2.5">
                    <CrossItem>Download, copy, record, screenshot, screen-record, or otherwise reproduce any Content except as expressly permitted by the Platform's built-in features (e.g., downloading a certificate you earned).</CrossItem>
                    <CrossItem>Share, re-upload, post, distribute, or make available any Content to any third party, platform, messaging service, or storage service, including but not limited to Telegram, WhatsApp, YouTube, Google Drive, torrents, or any file-sharing service.</CrossItem>
                    <CrossItem>Bypass, attempt to bypass, or assist others in bypassing any technical protection measures, including but not limited to: visible watermarks, signed URL expiry, session-based access controls, enrollment checks, or developer-tool detection.</CrossItem>
                    <CrossItem>Use automated tools (downloaders, scrapers, browser extensions, bots) to access or extract Content in any form.</CrossItem>
                    <CrossItem>Share your account credentials with any other person, or use another person's account to access Content you have not personally paid for.</CrossItem>
                  </ul>
                </div>

                <div>
                  <p className="font-bold text-ink-900 mb-3">7.2 Watermarking and Monitoring</p>
                  <p className="mb-3">You explicitly acknowledge and consent that:</p>
                  <ul className="space-y-2.5">
                    <CheckItem>All video Content displayed to you contains a visible watermark that identifies your account, including your email address and a unique account identifier.</CheckItem>
                    <CheckItem>Every video playback, attempted download, right-click event, developer tool activation, and suspicious page-interaction event is recorded in our audit log with your account identifier, IP address, user agent, and timestamp.</CheckItem>
                    <CheckItem>This information constitutes forensic evidence and may be used in DMCA takedown requests, civil lawsuits, and criminal complaints filed with Indian law enforcement under the Information Technology Act, 2000 and the Indian Copyright Act, 1957.</CheckItem>
                  </ul>
                </div>

                <div>
                  <p className="font-bold text-ink-900 mb-3">7.3 Consequences of Violation</p>
                  <p className="mb-3">Violation of this Section may result in:</p>
                  <ul className="space-y-2.5">
                    <CrossItem>Immediate termination of your account without refund.</CrossItem>
                    <CrossItem>Civil action under the Indian Copyright Act, 1957, with statutory damages of up to Rs. 2,00,000 (Two Lakh Rupees) per infringed work for first-time infringement.</CrossItem>
                    <CrossItem>Criminal complaint under Section 63 of the Copyright Act, 1957 (imprisonment of six months to three years, plus fine).</CrossItem>
                    <CrossItem>DMCA takedown requests filed against any third-party platform hosting infringing copies of the Content.</CrossItem>
                    <CrossItem>Cooperation with Indian law enforcement under Section 43A of the Information Technology Act, 2000 (unauthorized access) or Section 66 (computer-related offenses).</CrossItem>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">Report Infringement</p>
                  <p className="text-sm text-red-700">
                    If you discover Content from aiwithrakshith.tech posted on any third-party platform without authorization, please report it to <strong>legal@aiwithrakshith.tech</strong> with the URL of the infringing content and any visible watermark you can identify. We will issue a takedown promptly and take appropriate action against the source account.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-ink-300" />

            <section id="disclaimer" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={8} />
                <h2 className="text-xl font-display font-bold text-ink-900">Disclaimer of Warranties</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                The Service is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="liability" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={9} />
                <h2 className="text-xl font-display font-bold text-ink-900">Limitation of Liability</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                To the fullest extent permitted by applicable law, aiwithrakshith.tech shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including without limitation loss of profits, data, goodwill, or business interruption — arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="termination" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={10} />
                <h2 className="text-xl font-display font-bold text-ink-900">Termination</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, with or without cause or notice, if we determine that you have violated these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination — including ownership, disclaimer of warranties, and limitation of liability — shall survive.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="governing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={11} />
                <h2 className="text-xl font-display font-bold text-ink-900">Governing Law</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of India.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="changes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={12} />
                <h2 className="text-xl font-display font-bold text-ink-900">Changes to Terms</h2>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or a prominent notice within the Service at least 7 days before they take effect. Your continued use of the Service after notification constitutes your acceptance of the revised Terms. If you do not agree to the new terms, you must stop using the Service.
              </p>
            </section>

            <div className="border-t border-ink-300" />

            <section id="contact" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <SectionNum n={13} />
                <h2 className="text-xl font-display font-bold text-ink-900">Contact</h2>
              </div>
              <div className="p-6 rounded-2xl bg-ink-900 text-white">
                <p className="text-sm leading-relaxed text-white/70 mb-4">
                  If you have any questions about these Terms of Service, please contact us:
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
            <Link to="/privacy" className="text-xs text-ink-500 hover:text-ink-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-brand-500 font-semibold">Terms</Link>
            <Link to="/refund" className="text-xs text-ink-500 hover:text-ink-900 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
