import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

export function RefundPolicyPage() {
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
          <span className="text-sm font-semibold text-ink-900">Refund Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white border border-ink-300 rounded-lg p-8 md:p-12 shadow-sm">
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
              <Icon name="currency_rupee" size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-ink-900 mb-2">Refund Policy</h1>
            <p className="text-ink-500 text-sm">Last updated: May 26, 2026</p>
          </div>

          <div className="space-y-8 text-ink-700 text-sm leading-relaxed">

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-3">
              <Icon name="info" size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-blue-700 text-xs leading-relaxed">
                aiwithrakshith.tech is currently a <span className="font-semibold">free service</span>. This policy outlines our refund terms for any future paid features, premium plans, or course purchases.
              </p>
            </div>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                Free Tier
              </h2>
              <p>
                The core features of aiwithrakshith.tech are provided free of charge. No payment is required, and therefore no refund is applicable for the free tier.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                Paid Plans &amp; Subscriptions
              </h2>
              <p className="mb-3">
                If and when paid plans are introduced, the following refund terms will apply:
              </p>
              <div className="space-y-3">
                {[
                  {
                    icon: 'calendar_today',
                    label: '7-Day Money-Back Guarantee',
                    desc: 'New subscribers may request a full refund within 7 days of their first payment with no questions asked.',
                  },
                  {
                    icon: 'block',
                    label: 'No Partial Refunds',
                    desc: 'After the 7-day window, no partial refunds will be issued for unused days in a billing period.',
                  },
                  {
                    icon: 'autorenew',
                    label: 'Subscription Cancellation',
                    desc: 'You may cancel your subscription at any time. Access continues until the end of the current billing period.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-ink-100 border border-ink-300 rounded-md">
                    <div className="w-8 h-8 rounded-md bg-white border border-ink-300 flex items-center justify-center flex-shrink-0">
                      <Icon name={item.icon} size={16} className="text-brand-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 text-xs mb-1">{item.label}</p>
                      <p className="text-ink-500 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-brand-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                Course Purchases
              </h2>
              <p className="mb-3">
                For individual course purchases (if applicable):
              </p>
              <ul className="space-y-2 list-none">
                {[
                  'Refunds are available within 30 days of purchase if less than 30% of the course content has been consumed.',
                  'No refund will be issued once a completion certificate has been generated.',
                  'Refunds will be processed to the original payment method within 5-10 business days.',
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
                Non-Refundable Situations
              </h2>
              <p className="mb-3">Refunds will not be issued in the following cases:</p>
              <ul className="space-y-2 list-none">
                {[
                  'Accounts terminated due to violation of our Terms of Service.',
                  'Requests made after the applicable refund window has passed.',
                  'Dissatisfaction with free features.',
                  'Failure to use the Service during a paid subscription period.',
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
                How to Request a Refund
              </h2>
              <p>
                To request a refund, contact us directly on Instagram at{' '}
                <a
                  href="https://www.instagram.com/aiwithrakshith"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-500 font-medium transition-colors"
                >
                  @aiwithrakshith
                </a>{' '}
                with your registered email address and a brief description of your request. We aim to respond within 2 business days.
              </p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
