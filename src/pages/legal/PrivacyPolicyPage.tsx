import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-ink-100">
      <header className="bg-white border-b border-ink-300 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            to="/signup"
            className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
          >
            <Icon name="arrow_back" size={16} />
            Back to Sign up
          </Link>
          <span className="text-ink-300">|</span>
          <span className="text-sm font-semibold text-ink-900">Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white border border-ink-300 rounded-lg p-8 md:p-12 shadow-sm">
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
              <Icon name="shield" size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-extrabold text-ink-900 tracking-tight mb-2">Privacy Policy</h1>
            <p className="text-ink-500 text-sm">Last updated: May 26, 2026</p>
          </div>

          <div className="space-y-8 text-ink-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                Information We Collect
              </h2>
              <p className="mb-3">We collect the following types of information:</p>
              <div className="space-y-3">
                {[
                  { label: 'Account Information', desc: 'Your email address and password (hashed) when you register.' },
                  { label: 'Profile Information', desc: 'Display name and avatar image you optionally provide.' },
                  { label: 'User Content', desc: 'Prompts, projects, notes, todos, course data, and any files you upload.' },
                  { label: 'Usage Data', desc: 'Log data including IP address, browser type, pages visited, and actions taken within the Service.' },
                  { label: 'Device Information', desc: 'Device type, operating system, and browser version.' },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-ink-100 rounded-md border border-ink-300">
                    <p className="font-semibold text-ink-900 text-xs mb-1">{item.label}</p>
                    <p className="text-ink-500 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                How We Use Your Information
              </h2>
              <ul className="space-y-2 list-none">
                {[
                  'Provide, operate, and maintain the Service.',
                  'Send transactional emails such as account verification and password resets.',
                  'Improve and personalize your experience.',
                  'Monitor and analyze usage trends to improve the Service.',
                  'Detect and prevent fraudulent or unauthorized activity.',
                  'Communicate important updates or changes to the Service.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="check_circle" size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                Data Storage &amp; Security
              </h2>
              <p className="mb-3">
                Your data is stored securely using Supabase, which provides enterprise-grade infrastructure with encryption at rest and in transit (TLS). Passwords are stored as bcrypt hashes and are never readable by our team.
              </p>
              <p>
                Password vault entries are encrypted client-side using AES-256-GCM with PBKDF2 key derivation before being stored, meaning we cannot read your saved passwords even if we wanted to.
              </p>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                Data Sharing
              </h2>
              <p className="mb-3">We do not sell your personal data. We may share information with:</p>
              <ul className="space-y-2 list-none">
                {[
                  'Service providers who assist in operating the platform (Supabase for storage, Resend for email).',
                  'Law enforcement when required by applicable law or to protect rights and safety.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="info" size={15} className="text-ink-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">5</span>
                Cookies &amp; Tracking
              </h2>
              <p>
                We use session cookies and local storage tokens to keep you signed in. We do not use third-party advertising cookies. You can clear these through your browser settings, which will sign you out of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">6</span>
                Your Rights
              </h2>
              <p className="mb-3">Depending on your location, you may have the right to:</p>
              <ul className="space-y-2 list-none">
                {[
                  'Access the personal data we hold about you.',
                  'Request correction of inaccurate data.',
                  'Request deletion of your account and associated data.',
                  'Object to or restrict processing of your data.',
                  'Export your data in a portable format.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="check_circle" size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at{' '}
                <a
                  href="https://www.instagram.com/aiwithrakshith"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-500 font-medium transition-colors"
                >
                  @aiwithrakshith
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">7</span>
                Data Retention
              </h2>
              <p>
                We retain your data for as long as your account is active. Upon account deletion, your personal data and user content are permanently removed within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">8</span>
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a notice on the Service. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.
              </p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
