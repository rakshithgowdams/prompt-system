import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCertificateBySlug, useCertificateTemplateUrl } from '../hooks/useCourses';
import { CertificateView } from '../components/certificate/CertificateView';
import { CertificateActions } from '../components/certificate/CertificateActions';
import { Icon } from '../components/ui/Icon';

export function PublicCertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: cert, isLoading } = useCertificateBySlug(slug);
  const { data: templateUrl } = useCertificateTemplateUrl();

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
    setMeta('og:description', `Issued by MyDesignNexus on ${new Date(cert.issued_at).toDateString()} — ${cert.department}`);
    setMeta('og:type', 'profile');
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
          <a href="https://mydesignnexus.in" className="inline-block text-ink-900 font-semibold hover:underline">
            Visit MyDesignNexus
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Public header */}
      <header className="bg-white border-b border-ink-300">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="https://mydesignnexus.in" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-ink-900 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">
              MD
            </div>
            <div>
              <div className="font-extrabold text-ink-900 text-sm tracking-tight">MyDesignNexus</div>
              <div className="text-[10px] text-ink-500 -mt-0.5">AI Solution Company</div>
            </div>
          </a>
          <div className="text-xs text-ink-500 hidden md:block font-mono">
            {cert.serial_number}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Verification badge */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Icon name="verified" size={24} className="text-green-600" fill />
          <div>
            <div className="font-bold text-ink-900 text-sm">Verified Certificate</div>
            <div className="text-xs text-ink-500">
              Issued by MyDesignNexus to {cert.student_name} on {new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* The cert */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-ink-300">
          {templateUrl && <CertificateView cert={cert} templateUrl={templateUrl} />}
        </div>

        {/* Actions */}
        {templateUrl && (
          <CertificateActions certificate={cert} templateUrl={templateUrl} isPublic />
        )}

        {/* Meta info card */}
        <div className="bg-white border border-ink-300 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetaCell label="Serial Number" value={cert.serial_number} mono />
          <MetaCell label="Issued On" value={new Date(cert.issued_at).toLocaleDateString('en-IN')} />
          <MetaCell label="Department" value={cert.department} />
          <MetaCell label="Course" value={cert.course_title || '—'} />
        </div>
      </div>

      <footer className="border-t border-ink-300 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-ink-500">
          mydesignnexus.in &nbsp;&middot;&nbsp; Hassan, Karnataka, India &nbsp;&middot;&nbsp; AI Automation &bull; AI Call Agents &bull; Web Development
        </div>
      </footer>
    </div>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">{label}</div>
      <div className={`text-sm font-semibold text-ink-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
