import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse, useMyCertificate } from '../hooks/useCourses';
import { CertificateView } from '../components/certificate/CertificateView';
import { CertificateActions } from '../components/certificate/CertificateActions';
import { Icon } from '../components/ui/Icon';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: course } = useCourse(courseId ?? '');
  const { data: certificate, isLoading } = useMyCertificate(courseId ?? '');

  const [generating, setGenerating] = useState(false);
  const retryRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If no cert exists yet, call the RPC as a fallback (handles RPC failures during lesson completion
  // and students who navigate here directly after finishing a course)
  useEffect(() => {
    if (!courseId || !user || isLoading) return;

    if (!certificate) {
      setGenerating(true);
      retryRef.current = 0;

      const attempt = () => {
        supabase.rpc('issue_certificate_if_complete', {
          p_course_id: courseId,
          p_user_id: user.id,
        }).then(({ data: certId }) => {
          if (certId) {
            qc.invalidateQueries({ queryKey: ['my-certificate', courseId, user.id] });
            setGenerating(false);
          } else if (retryRef.current < 4) {
            // RPC returned null (course not 100% complete yet or transient), retry a few times
            retryRef.current += 1;
            retryTimer.current = setTimeout(attempt, 800);
          } else {
            setGenerating(false);
          }
        }).catch(() => setGenerating(false));
      };

      attempt();
      return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
    }

    // Cert exists — patch any empty fields silently
    const needsPatch =
      !certificate.department ||
      !certificate.growth_area ||
      !certificate.internship_from ||
      !certificate.internship_to;

    if (needsPatch) {
      supabase.rpc('patch_incomplete_certificate', { p_cert_id: certificate.id })
        .then(() => qc.invalidateQueries({ queryKey: ['my-certificate', courseId, user.id] }));
    }
  }, [isLoading, certificate?.id, courseId, user?.id]);

  const showSpinner = isLoading || (generating && !certificate);

  if (showSpinner) {
    return (
      <div className="min-h-screen bg-ink-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-500">Generating your certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto">
            <Icon name="workspace_premium" size={36} className="text-amber-500" fill />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold text-ink-900 mb-2">Certificate Not Yet Earned</h1>
            <p className="text-sm text-ink-500 leading-relaxed">
              Complete all lessons in <strong>{course?.title ?? 'this course'}</strong> to automatically receive your certificate.
            </p>
          </div>
          <button
            onClick={() => navigate(`/courses/${courseId}/learn`)}
            className="inline-flex items-center gap-2 bg-ink-900 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-ink-700 transition-colors"
          >
            <Icon name="play_arrow" size={16} />
            Continue Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-ink-300">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
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
          <div className="w-28" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Verified badge */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Icon name="verified" size={22} className="text-green-600" fill />
          <div>
            <p className="font-bold text-ink-900 text-sm">Verified Certificate of Course Completion</p>
            <p className="text-xs text-ink-500">
              Issued to <strong>{certificate.student_name}</strong> &middot;{' '}
              {new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-ink-300">
          <CertificateView cert={certificate} />
        </div>

        {/* Download + Share actions */}
        <CertificateActions certificate={certificate} />

        {/* Meta details */}
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
      <p className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">{label}</p>
      <p className={`text-sm font-semibold text-ink-900 mt-0.5 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
