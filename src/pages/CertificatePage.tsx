import { useParams, useNavigate } from 'react-router-dom';
import { useCourse, useMyCertificate, useCertificateTemplateUrl } from '../hooks/useCourses';
import { CertificateView } from '../components/certificate/CertificateView';
import { CertificateActions } from '../components/certificate/CertificateActions';
import { CertificateGate } from '../components/certificate/CertificateGate';
import { Icon } from '../components/ui/Icon';

function isCertificateComplete(cert: { department: string; growth_area: string; internship_from: string | null; internship_to: string | null }) {
  return cert.department.trim() !== '' && cert.growth_area.trim() !== '' && !!cert.internship_from && !!cert.internship_to;
}

export function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: course } = useCourse(courseId ?? '');
  const { data: certificate, isLoading } = useMyCertificate(courseId ?? '');
  const { data: templateUrl } = useCertificateTemplateUrl();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No certificate at all, or it's a stub with empty required fields — show the gate form
  if (!certificate || !isCertificateComplete(certificate)) {
    return (
      <CertificateGate
        courseId={courseId!}
        courseTitle={course?.title ?? ''}
        existingStub={certificate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-ink-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/courses/${courseId}/learn`)}
            className="flex items-center gap-2 text-ink-700 hover:text-ink-900 text-sm font-semibold transition-colors"
          >
            <Icon name="arrow_back" size={18} />
            Back to course
          </button>
          <div className="flex items-center gap-2">
            <Icon name="workspace_premium" size={18} className="text-amber-500" fill />
            <h1 className="text-sm font-bold text-ink-900">Your Certificate</h1>
          </div>
          <div className="w-24" />
        </div>
      </div>

      {/* Certificate display */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Verified badge */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Icon name="verified" size={22} className="text-green-600" fill />
          <div>
            <p className="font-bold text-ink-900 text-sm">Verified Certificate of Completion</p>
            <p className="text-xs text-ink-500">
              Issued to {certificate.student_name} on {new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-ink-300">
          {templateUrl && (
            <CertificateView cert={certificate} templateUrl={templateUrl} />
          )}
        </div>

        {/* Actions */}
        {templateUrl && (
          <CertificateActions certificate={certificate} templateUrl={templateUrl} />
        )}

        {/* Certificate details card */}
        <div className="bg-white border border-ink-300 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetaCell label="Serial Number" value={certificate.serial_number} mono />
          <MetaCell label="Issued On" value={new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
          <MetaCell label="Department" value={certificate.department} />
          <MetaCell label="Growth Area" value={certificate.growth_area} />
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">{label}</div>
      <div className={`text-sm font-semibold text-ink-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );
}
