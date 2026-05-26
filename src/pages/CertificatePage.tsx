import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCourse, useMyCertificate } from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course } = useCourse(courseId ?? '');
  const { data: certificate } = useMyCertificate(courseId ?? '');
  const certRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  const studentName = user?.email?.split('@')[0] ?? 'Student';
  const studentDisplay = studentName.charAt(0).toUpperCase() + studentName.slice(1);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  };

  if (!course || !certificate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-ink-100 rounded-lg flex items-center justify-center mx-auto">
            <Icon name="workspace_premium" size={28} className="text-ink-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-900 mb-1">No Certificate Yet</h2>
            <p className="text-ink-500 text-sm">Complete all lessons to earn your certificate.</p>
          </div>
          <Button onClick={() => navigate(`/courses/${courseId}/learn`)}>
            <Icon name="play_circle" size={15} />
            Continue Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Top bar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-ink-300">
        <button onClick={() => navigate(`/courses/${courseId}/learn`)}
          className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors">
          <Icon name="arrow_back" size={18} />
        </button>
        <span className="text-sm font-semibold text-ink-900">Certificate of Completion</span>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ink-100 hover:bg-ink-100 text-ink-700 hover:text-ink-900 text-xs font-medium border border-ink-300 transition-colors">
            <Icon name="print" size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Cert container */}
      <div className="flex items-center justify-center p-4 lg:p-10 print:p-0 min-h-[calc(100vh-56px)] print:min-h-screen">
        <motion.div
          ref={certRef}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="w-full max-w-3xl print:max-w-none print:w-full"
          style={{ aspectRatio: '1.414/1' }}
        >
          {/* Certificate card */}
          <div className="relative w-full h-full bg-white rounded-lg print:rounded-none overflow-hidden shadow-2xl shadow-black/40 print:shadow-none flex flex-col items-center justify-between p-8 lg:p-12 print:p-16"
            style={{ minHeight: '420px' }}>

            {/* Decorative border */}
            <div className="absolute inset-3 print:inset-5 border-2 border-amber-400/40 rounded-lg print:rounded-none pointer-events-none" />
            <div className="absolute inset-5 print:inset-8 border border-amber-300/20 rounded-md print:rounded-none pointer-events-none" />

            {/* Corner ornaments */}
            {['top-3 left-3', 'top-3 right-3 rotate-90', 'bottom-3 right-3 rotate-180', 'bottom-3 left-3 -rotate-90'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-8 h-8 print:w-10 print:h-10`}>
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-amber-400/50">
                  <path d="M2 2h12v2H4v8H2V2zM20 2h10v12h-2V4h-8V2z" fill="currentColor" />
                </svg>
              </div>
            ))}

            {/* Background watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <Icon name="workspace_premium" size={280} className="text-amber-400" fill />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center w-full">
              {/* Header */}
              <div className="flex items-center justify-center gap-3 mb-6 lg:mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/40" />
                <div className="flex items-center gap-2">
                  <Icon name="workspace_premium" size={22} className="text-amber-500" fill />
                  <span className="text-xs font-bold tracking-[0.25em] text-amber-600 uppercase">Certificate of Completion</span>
                  <Icon name="workspace_premium" size={22} className="text-amber-500" fill />
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/40" />
              </div>

              {/* This is to certify */}
              <p className="text-sm text-ink-500 font-medium tracking-wide mb-3">This is to certify that</p>

              {/* Student name */}
              <div className="mb-3">
                <h1 className="text-3xl lg:text-5xl font-bold text-ink-900 mb-1"
                  style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
                  {studentDisplay}
                </h1>
                <div className="h-0.5 w-48 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              </div>

              <p className="text-sm text-ink-500 mb-4">has successfully completed the course</p>

              {/* Course name */}
              <h2 className="text-xl lg:text-3xl font-bold text-ink-900 mb-6 lg:mb-8 leading-tight max-w-lg mx-auto"
                style={{ fontFamily: 'Georgia, serif' }}>
                {course.title}
              </h2>

              {/* Meta row */}
              <div className="flex items-center justify-center gap-6 lg:gap-10 text-xs text-ink-500 mb-6 lg:mb-8 flex-wrap">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">Level</div>
                  <div className="font-semibold text-ink-700 capitalize">{course.level}</div>
                </div>
                <div className="w-px h-8 bg-ink-300" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">Category</div>
                  <div className="font-semibold text-ink-700">{course.category}</div>
                </div>
                <div className="w-px h-8 bg-ink-300" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">Issued</div>
                  <div className="font-semibold text-ink-700">{formatDate(certificate.issued_at)}</div>
                </div>
              </div>

              {/* Signature line */}
              <div className="flex items-end justify-center gap-12 lg:gap-20">
                <div className="text-center">
                  <div className="h-px w-32 bg-ink-300 mb-1" />
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider">Instructor</p>
                </div>
                <div className="text-center">
                  <div className="h-px w-32 bg-ink-300 mb-1" />
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider">Date</p>
                </div>
              </div>
            </div>

            {/* Footer: certificate number */}
            <div className="relative z-10 w-full flex items-center justify-between mt-4">
              <div className="flex items-center gap-1.5">
                <Icon name="verified" size={13} className="text-brand-400" fill />
                <span className="text-[10px] text-ink-500 font-mono">#{certificate.certificate_number}</span>
              </div>
              <span className="text-[10px] text-ink-700 font-semibold tracking-wider">aiwithrakshith.tech Learning</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Share / nav actions — hidden on print */}
      <div className="print:hidden px-4 pb-8 flex justify-center gap-3 flex-wrap">
        <button onClick={() => navigate('/courses')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-ink-300 text-ink-500 hover:text-ink-900 hover:border-ink-300 text-sm transition-colors">
          <Icon name="school" size={15} />
          Browse More Courses
        </button>
        <Button onClick={handlePrint}>
          <Icon name="download" size={15} />
          Download Certificate
        </Button>
      </div>
    </div>
  );
}
