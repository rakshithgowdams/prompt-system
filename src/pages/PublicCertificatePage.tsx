import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useCertificateBySlug } from '../hooks/useCourses';
import { CertificateView } from '../components/certificate/CertificateView';
import { CertificateActions } from '../components/certificate/CertificateActions';
import { Icon } from '../components/ui/Icon';

export function PublicCertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: cert, isLoading } = useCertificateBySlug(slug);

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
