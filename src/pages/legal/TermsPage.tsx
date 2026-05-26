import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

export function TermsPage() {
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
          <span className="text-sm font-semibold text-ink-900">Terms of Service</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white border border-ink-300 rounded-lg p-8 md:p-12 shadow-sm">
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
              <Icon name="gavel" size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-ink-900 mb-2">Terms of Service</h1>
            <p className="text-ink-500 text-sm">Last updated: May 26, 2026</p>
          </div>

          <div className="prose-content space-y-8 text-ink-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                Acceptance of Terms
              </h2>
              <p>
                By accessing or using aiwithrakshith.tech ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to all of the terms and conditions, you must not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                Description of Service
              </h2>
              <p>
                aiwithrakshith.tech provides an AI prompt management platform that allows users to create, store, organize, and share AI prompts, manage projects, track tasks, and access educational courses.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                User Accounts
              </h2>
              <ul className="space-y-2 list-none">
                {[
                  'You must be at least 13 years old to use the Service.',
                  'You are responsible for maintaining the confidentiality of your account credentials.',
                  'You are responsible for all activity that occurs under your account.',
                  'You must provide accurate and complete information when creating your account.',
                  'You may not transfer your account to another person without our prior written consent.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="check_circle" size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                Acceptable Use
              </h2>
              <p className="mb-3">You agree not to use the Service to:</p>
              <ul className="space-y-2 list-none">
                {[
                  'Violate any applicable laws or regulations.',
                  'Upload or share content that is illegal, harmful, threatening, or abusive.',
                  'Impersonate any person or entity.',
                  'Attempt to gain unauthorized access to any portion of the Service.',
                  'Interfere with or disrupt the Service or servers connected to it.',
                  'Scrape, crawl, or spider any content from the Service without express written consent.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="cancel" size={15} className="text-danger flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">5</span>
                Intellectual Property
              </h2>
              <p>
                The Service and its original content, features, and functionality are owned by aiwithrakshith.tech and are protected by international copyright, trademark, and other intellectual property laws. Content you create and store on the platform remains your property; however, you grant us a limited license to store and display it solely for the purpose of providing the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">6</span>
                Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without cause or notice, if we believe you have violated these Terms of Service. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">7</span>
                Limitation of Liability
              </h2>
              <p>
                To the fullest extent permitted by law, aiwithrakshith.tech shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, or goodwill, arising from your use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">8</span>
                Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of material changes via email or a prominent notice on the Service. Continued use of the Service after such notification constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">9</span>
                Contact
              </h2>
              <p>
                If you have any questions about these Terms, please contact us via Instagram at{' '}
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

          </div>
        </div>
      </main>
    </div>
  );
}
