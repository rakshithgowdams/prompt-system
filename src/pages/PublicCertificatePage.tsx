import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCertificateBySlug } from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { CertificateView } from '../components/certificate/CertificateView';
import { CertificateActions } from '../components/certificate/CertificateActions';
import { AuthModal } from '../components/ui/AuthModal';
import { Icon } from '../components/ui/Icon';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function PublicCertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: cert, isLoading } = useCertificateBySlug(slug);
  const { user, signInWithGoogle } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!cert) return;
    document.title = `${cert.student_name} — Certificate of Internship | MyDesignNexus`;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('og:title', `${cert.student_name} — Certificate of Internship`);
    setMeta('og:description', `Verified certificate issued by MyDesignNexus on ${new Date(cert.issued_at).toDateString()}. Department: ${cert.department}`);
    setMeta('og:type', 'article');
    setMeta('og:url', window.location.href);
  }, [cert]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-ink-500">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-ink-100 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto border border-ink-300">
            <Icon name="error_outline" size={32} className="text-ink-500" />
          </div>
          <h1 className="text-2xl font-bold text-ink-900">Certificate not found</h1>
          <p className="text-ink-500">This certificate link may be invalid or has been revoked.</p>
          <Link to="/" className="inline-block text-ink-900 font-semibold hover:underline">
            Go to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Public header */}
      <header className="bg-white border-b border-ink-300 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith.tech" className="h-8 w-8 object-contain" />
            <span className="hidden sm:block font-display font-black text-ink-900 tracking-tight text-sm">
              aiwithrakshith
            </span>
          </Link>
          <div className="text-[11px] text-ink-500 font-mono hidden md:block truncate">
            {cert.serial_number}
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <Icon name="verified" size={14} className="text-green-600" fill />
            <span className="text-xs font-semibold text-green-700 whitespace-nowrap">Verified Certificate</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Verification banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Icon name="verified" size={22} className="text-green-600 flex-shrink-0 mt-0.5" fill />
          <div>
            <p className="font-bold text-ink-900 text-sm">Verified Certificate of Internship</p>
            <p className="text-xs text-ink-500 mt-0.5">
              Issued by MyDesignNexus to <span className="font-semibold text-ink-700">{cert.student_name}</span> on {new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {cert.course_title && <> for completing <span className="font-semibold text-ink-700">{cert.course_title}</span></>}
            </p>
          </div>
        </div>

        {/* The certificate */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-ink-300">
          <CertificateView cert={cert} />
        </div>

        {/* Download + share */}
        <CertificateActions certificate={cert} isPublic />

        {/* Meta info */}
        <div className="bg-white border border-ink-300 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetaCell label="Serial Number" value={cert.serial_number} mono />
          <MetaCell label="Issued On" value={new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
          <MetaCell label="Department" value={cert.department} />
          <MetaCell label="Course" value={cert.course_title || '—'} />
        </div>
      </div>

      {/* Auth CTA — only shown to non-logged-in visitors */}
      {!user && (
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="bg-ink-900 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith.tech" className="h-8 w-8 object-contain brightness-0 invert" />
                <span className="font-display font-black text-white text-sm tracking-tight">aiwithrakshith</span>
              </div>
              <h2 className="text-xl font-display font-extrabold text-white tracking-tight mb-1">
                Start your AI learning journey
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">
                Join thousands of students learning AI, building projects, and earning verified certificates — all for free.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 w-full sm:w-auto flex-shrink-0">
              <button
                onClick={async () => { setGoogleLoading(true); await signInWithGoogle(); setGoogleLoading(false); }}
                disabled={googleLoading}
                className="flex items-center justify-center gap-2.5 bg-white hover:bg-ink-100 text-ink-900 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-ink-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center justify-center gap-2 border border-white/30 hover:border-white/60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                <Icon name="email" size={16} />
                Sign in with Email
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab="login"
      />

      <footer className="border-t border-ink-300 py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-ink-500">
          aiwithrakshith.tech &nbsp;&middot;&nbsp; Hassan, Karnataka, India &nbsp;&middot;&nbsp; AI Automation &bull; AI Courses &bull; Web Development
        </div>
      </footer>
    </div>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">{label}</p>
      <p className={`text-sm font-semibold text-ink-900 mt-0.5 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
