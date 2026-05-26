import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useIssueCertificate, useCourseProgress, useCourseLessons } from '../../hooks/useCourses';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import type { CourseCertificate } from '../../hooks/useCourses';

interface Props {
  courseId: string;
  courseTitle: string;
  existingStub?: CourseCertificate | null;
}

export function CertificateGate({ courseId, courseTitle, existingStub }: Props) {
  const navigate = useNavigate();
  const { data: progressList = [] } = useCourseProgress(courseId);
  const { data: lessons = [] } = useCourseLessons(courseId);
  const issueCert = useIssueCertificate();

  const completedCount = progressList.filter(p => p.completed).length;
  const totalLessons = lessons.length;
  const allComplete = totalLessons > 0 && completedCount >= totalLessons;

  const [department, setDepartment] = useState(existingStub?.department ?? '');
  const [from, setFrom] = useState(existingStub?.internship_from ?? '');
  const [to, setTo] = useState(existingStub?.internship_to ?? '');
  const [growthArea, setGrowthArea] = useState(existingStub?.growth_area ?? '');
  const [instructorName, setInstructorName] = useState(existingStub?.instructor_name ?? 'Rakshith');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department.trim() || !from || !to || !growthArea.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (new Date(to) <= new Date(from)) {
      toast.error('End date must be after start date');
      return;
    }
    try {
      await issueCert.mutateAsync({
        course_id: courseId,
        department: department.trim(),
        internship_from: from,
        internship_to: to,
        growth_area: growthArea.trim(),
        instructor_name: instructorName.trim() || 'Rakshith',
      });
      toast.success('Certificate generated successfully!');
    } catch {
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Back link */}
        <button
          onClick={() => navigate(`/courses/${courseId}/learn`)}
          className="flex items-center gap-2 text-ink-500 hover:text-ink-900 text-sm font-semibold mb-6 transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          Back to course
        </button>

        <div className="bg-white border border-ink-300 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-6 py-5 border-b border-ink-300 bg-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center">
                <Icon name="workspace_premium" size={24} className="text-amber-600" fill />
              </div>
              <div>
                <h1 className="text-lg font-display font-extrabold text-ink-900">Claim Your Certificate</h1>
                <p className="text-xs text-ink-500 mt-0.5">{courseTitle}</p>
              </div>
            </div>
          </div>

          {!allComplete ? (
            /* Progress required */
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mx-auto">
                <Icon name="lock" size={28} className="text-ink-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-900">Complete All Lessons First</h2>
                <p className="text-sm text-ink-500 mt-1">
                  You've completed {completedCount} of {totalLessons} lessons. Finish all lessons to unlock your certificate.
                </p>
              </div>
              <div className="w-full h-2.5 bg-ink-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-ink-500">{completedCount} / {totalLessons} lessons completed</p>
              <Button onClick={() => navigate(`/courses/${courseId}/learn`)}>
                <Icon name="play_arrow" size={16} />
                Continue Learning
              </Button>
            </div>
          ) : (
            /* Issuance form */
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {existingStub && (existingStub.department === '' || existingStub.growth_area === '') && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <Icon name="info" size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    You completed this course! Fill in the details below to generate your personalized certificate.
                  </p>
                </div>
              )}

              {!existingStub && (
                <p className="text-sm text-ink-600 leading-relaxed">
                  Fill in the details below to generate your personalized Certificate of Internship.
                </p>
              )}

              <div>
                <label className="text-xs font-semibold text-ink-700 mb-1.5 block">
                  Department <span className="text-danger">*</span>
                </label>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                  placeholder="e.g. AI Engineering, Web Development"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-700 mb-1.5 block">
                    From Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-700 mb-1.5 block">
                    To Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-700 mb-1.5 block">
                  Professional Growth Area <span className="text-danger">*</span>
                </label>
                <input
                  value={growthArea}
                  onChange={(e) => setGrowthArea(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                  placeholder="e.g. AI Automation, React Development"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-700 mb-1.5 block">Instructor Name</label>
                <input
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                  placeholder="Rakshith"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  loading={issueCert.isPending}
                >
                  <Icon name="workspace_premium" size={16} />
                  Generate My Certificate
                </Button>
              </div>

              <p className="text-[11px] text-ink-400 text-center">
                Once submitted, your certificate will appear immediately. Please verify all information before submitting.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
