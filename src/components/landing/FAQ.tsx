import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import { Reveal, ScrambleText } from './motion';

gsap.registerPlugin(ScrollTrigger);

interface FAQItem { q: string; a: string; }

const LANDING_FAQS: FAQItem[] = [
  { q: 'Is PromptVault really free?', a: 'Yes, 100%. The Free plan is free forever — no trial period, no credit card required. You get unlimited prompts, 3 projects, 1 course, encrypted vault access, and public sharing. We will always keep a generous free tier for students and learners.' },
  { q: "What's the difference between Free, Standard, and Premium?", a: 'The Free plan is great for solo learners getting started. Standard unlocks unlimited projects and courses, custom domains, advanced analytics, and priority support. Premium adds team workspaces, API access, white-label certificates, and a dedicated account manager.' },
  { q: 'When will Standard and Premium launch?', a: "We're actively working on it. Standard and Premium are expected to launch in late 2026. Click 'Notify me' on any paid plan to get an email the moment it goes live. Early sign-ups may receive a launch discount." },
  { q: 'Do I own the prompts and courses I create?', a: 'Absolutely. Everything you create on PromptVault belongs to you. We do not claim any ownership over your content. You can export or delete your data at any time.' },
  { q: 'How does the encrypted vault work?', a: 'Your vault entries (passwords, secrets) are encrypted client-side using AES-256 before they leave your browser. We never have access to your plaintext secrets. Not even our engineers can read them.' },
  { q: 'Can I share my course with non-users?', a: 'Yes. Every course gets a public share link that anyone can access — no account needed. Recipients can watch the course, complete it, and even earn a certificate without signing up.' },
  { q: 'Does it work on mobile?', a: 'Yes. PromptVault is fully responsive and designed mobile-first. It works great on any device — phone, tablet, or desktop. A dedicated mobile app is on the roadmap.' },
  { q: 'Is there a desktop app?', a: "Not yet, but it is on our roadmap. For now, the web app works seamlessly on desktop browsers and can be installed as a Progressive Web App (PWA) from your browser's install prompt." },
  { q: 'Who built PromptVault?', a: 'PromptVault was built by Rakshith, an indie developer and AI content creator behind @aiwithrakshith on Instagram and YouTube. It started as a personal tool and grew into a platform for the community.' },
  { q: 'How do I get support?', a: 'You can reach us via the Help Center (coming soon) or by emailing support@aiwithrakshith.tech. Free users get community support, while Standard and Premium users get priority and dedicated support.' },
];

const PRICING_FAQS: FAQItem[] = [
  { q: 'When will Standard and Premium launch?', a: 'Standard and Premium are expected to launch in late 2026. Join the notify list on this page to be first in line — early sign-ups may receive a special launch discount.' },
  { q: 'Will my Free plan ever stop being free?', a: 'No. We are committed to keeping the Free plan free forever. Our business model is to offer premium features at fair prices, not to bait-and-switch our free users.' },
  { q: 'Can I cancel anytime?', a: 'Yes, absolutely. Cancel anytime from your account settings. Your subscription continues until the end of your billing period, after which you revert to the Free plan. Your data is never deleted on cancellation.' },
  { q: 'Do you offer refunds?', a: 'We offer a 7-day no-questions-asked refund on first-time purchases of any paid plan. After that, refunds are handled on a case-by-case basis. Email billing@aiwithrakshith.tech.' },
  { q: 'Is there a student discount on paid tiers?', a: 'Yes — students with a valid .edu email or institutional email get 20% off Standard and Premium plans. Reach out to support@aiwithrakshith.tech with your student email to claim the discount.' },
  { q: 'What payment methods will you accept?', a: 'We will accept UPI, credit cards, debit cards, and net banking. International cards (Visa, Mastercard, Amex) will also be supported. Payments processed via Stripe and Razorpay.' },
  { q: 'Will my data be exported if I cancel?', a: "Yes. You can export all your prompts, projects, notes, and course content at any time from the Settings page. We support JSON and PDF exports. Your data is yours — always." },
  { q: 'Can I switch between billing periods?', a: 'Yes. You can switch between monthly, 6-month, and yearly billing at any time. When upgrading to a longer cycle, you are credited for any unused time on your current plan.' },
];

function AccordionItem({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="border-b border-ink-300 last:border-0"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-sm group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <motion.span
          className="text-base font-semibold text-ink-900 pr-4 group-hover:text-brand-500 transition-colors"
          whileHover={{ x: 2 }}
        >
          {item.q}
        </motion.span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-ink-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <motion.p
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              exit={{ y: -10 }}
              transition={{ duration: 0.3 }}
              className="pb-5 text-sm text-ink-500 leading-relaxed"
            >
              {item.a}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface FAQProps { variant?: 'landing' | 'pricing'; }

export function FAQ({ variant = 'landing' }: FAQProps) {
  const items = variant === 'pricing' ? PRICING_FAQS : LANDING_FAQS;
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        sectionRef.current!.querySelector('.faq-container'),
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', once: true },
        }
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} id="faq" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
              <ScrambleText text="FAQ" />
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-ink-900 tracking-tight">
              Frequently asked questions.
            </h2>
          </Reveal>
        </div>
        <div className="faq-container bg-white border border-ink-300 rounded-2xl px-8 divide-y divide-ink-300">
          {items.map((item, i) => (
            <AccordionItem key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
