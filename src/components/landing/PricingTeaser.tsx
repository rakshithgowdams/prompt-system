import { Link } from 'react-router-dom';
import { Check, ArrowRight, Clock } from 'lucide-react';
import { Reveal } from './motion';

export function PricingTeaser() {
  return (
    <section className="py-24 px-6 bg-ink-100">
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
          <Reveal delay={0.1} className="md:col-span-1">
            <div className="bg-white border border-ink-300 rounded-2xl p-8 flex flex-col h-full hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wide text-success bg-success/10 px-3 py-1 rounded-full">
                  Available now
                </span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Free</h3>
              <p className="text-sm text-ink-500 mb-6">For students getting started.</p>
              <div className="mb-8">
                <span className="font-display font-extrabold text-6xl text-ink-900">₹0</span>
                <span className="text-ink-500 ml-2">forever</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['Unlimited prompts', '3 projects', '1 course', 'Encrypted vault', 'Public sharing', '500 MB storage'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink-700">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="w-full bg-ink-900 text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-brand-400 transition-colors"
              >
                Get started free
              </Link>
            </div>
          </Reveal>

          {/* Standard */}
          <Reveal delay={0.2} className="md:col-span-1">
            <div className="bg-white border border-ink-300 rounded-2xl p-8 flex flex-col h-full opacity-80">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Coming Soon
                </span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Standard</h3>
              <p className="text-sm text-ink-500 mb-6">For creators and freelancers.</p>
              <div className="mb-8">
                <span className="font-display font-extrabold text-5xl text-ink-900">₹999</span>
                <span className="text-ink-500 ml-1 text-sm">/mo</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['Unlimited projects', '10 courses', 'Custom domains', 'Priority support', '10 GB storage', 'Remove branding'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink-700">
                    <Check className="w-4 h-4 text-ink-300 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button disabled className="w-full bg-ink-100 text-ink-500 text-sm font-bold py-3 rounded-xl cursor-not-allowed">
                Notify me
              </button>
            </div>
          </Reveal>

          {/* Premium */}
          <Reveal delay={0.3} className="md:col-span-1">
            <div className="bg-white border-2 border-brand-200 rounded-2xl p-8 flex flex-col h-full opacity-80">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Coming Soon
                </span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink-900 mb-1">Premium</h3>
              <p className="text-sm text-ink-500 mb-6">For teams and power users.</p>
              <div className="mb-8">
                <span className="font-display font-extrabold text-5xl text-ink-900">₹1,999</span>
                <span className="text-ink-500 ml-1 text-sm">/mo</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['Everything in Standard', 'Team workspaces', 'Unlimited courses', 'API access', '100 GB storage', 'Dedicated manager'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink-700">
                    <Check className="w-4 h-4 text-ink-300 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button disabled className="w-full bg-ink-100 text-ink-500 text-sm font-bold py-3 rounded-xl cursor-not-allowed">
                Notify me
              </button>
            </div>
          </Reveal>
        </div>

        <div className="text-center mt-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors"
          >
            See all plans and features
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
