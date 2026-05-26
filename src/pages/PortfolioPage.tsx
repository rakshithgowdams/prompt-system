import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useProfile,
  useUpsertProfile,
  useGeneratePortfolioSlug,
  useAllMyCertificates,
  getAvatarUrl,
} from '../hooks/useProfile';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';

const profileSchema = z.object({
  display_name: z.string().min(1, 'Name is required').max(80),
  headline: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(80).optional(),
  website_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  linkedin_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  github_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  twitter_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  instagram_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  college: z.string().max(120).optional(),
  school: z.string().max(120).optional(),
  college_year: z.string().max(20).optional(),
  school_year: z.string().max(20).optional(),
  degree: z.string().max(80).optional(),
  experience_years: z.coerce.number().min(0).max(60).optional(),
  experience_title: z.string().max(80).optional(),
  experience_company: z.string().max(80).optional(),
  skills: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

function CertCard({ cert }: {
  cert: {
    id: string;
    course_id: string;
    serial_number: string;
    student_name: string;
    course_title: string;
    course_category: string;
    issued_at: string;
    share_slug: string | null;
    instructor_name: string | null;
  };
}) {
  const date = new Date(cert.issued_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const certUrl = cert.share_slug ? `/c/${cert.share_slug}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-ink-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-50 transition-all duration-200 overflow-hidden"
    >
      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-ink-900 leading-tight line-clamp-2 mb-1">{cert.course_title}</p>
            <p className="text-xs text-ink-500">{cert.course_category}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">Issued</p>
            <p className="text-xs font-bold text-ink-700 mt-0.5">{date}</p>
          </div>
          {cert.instructor_name && (
            <div className="text-right">
              <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">Instructor</p>
              <p className="text-xs font-bold text-ink-700 mt-0.5 truncate max-w-[120px]">{cert.instructor_name}</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-mono text-ink-400 truncate flex-1">{cert.serial_number}</span>
          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Icon name="verified" size={9} />
            Verified
          </span>
        </div>

        {certUrl && (
          <a
            href={certUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-ink-50 hover:bg-amber-50 border border-ink-200 hover:border-amber-300 text-ink-600 hover:text-amber-700 text-xs font-bold transition-all"
          >
            <Icon name="open_in_new" size={13} />
            View Certificate
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function PortfolioPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const upsertProfile = useUpsertProfile();
  const generateSlug = useGeneratePortfolioSlug();
  const { data: certs = [], isLoading: certsLoading } = useAllMyCertificates();

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      headline: '',
      bio: '',
      location: '',
      website_url: '',
      linkedin_url: '',
      github_url: '',
      twitter_url: '',
      instagram_url: '',
      college: '',
      school: '',
      college_year: '',
      school_year: '',
      degree: '',
      experience_years: 0,
      experience_title: '',
      experience_company: '',
      skills: '',
    },
  });

  const handleStartEdit = () => {
    form.reset({
      display_name: profile?.display_name ?? '',
      headline: profile?.headline ?? '',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      website_url: profile?.website_url ?? '',
      linkedin_url: profile?.linkedin_url ?? '',
      github_url: profile?.github_url ?? '',
      twitter_url: profile?.twitter_url ?? '',
      instagram_url: profile?.instagram_url ?? '',
      college: profile?.college ?? '',
      school: profile?.school ?? '',
      college_year: profile?.college_year ?? '',
      school_year: profile?.school_year ?? '',
      degree: profile?.degree ?? '',
      experience_years: profile?.experience_years ?? 0,
      experience_title: profile?.experience_title ?? '',
      experience_company: profile?.experience_company ?? '',
      skills: (profile?.skills ?? []).join(', '),
    });
    setSkillsInput((profile?.skills ?? []).join(', '));
    setEditingProfile(true);
  };

  const handleSave = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      const skills = (data.skills ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await upsertProfile.mutateAsync({
        display_name: data.display_name,
        headline: data.headline ?? '',
        bio: data.bio ?? '',
        location: data.location ?? '',
        website_url: data.website_url ?? '',
        linkedin_url: data.linkedin_url ?? '',
        github_url: data.github_url ?? '',
        twitter_url: data.twitter_url ?? '',
        instagram_url: data.instagram_url ?? '',
        college: data.college ?? '',
        school: data.school ?? '',
        college_year: data.college_year ?? '',
        school_year: data.school_year ?? '',
        degree: data.degree ?? '',
        experience_years: data.experience_years ?? 0,
        experience_title: data.experience_title ?? '',
        experience_company: data.experience_company ?? '',
        skills,
      });
      toast.success('Profile saved!');
      setEditingProfile(false);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGenerateSlug = async () => {
    setGeneratingSlug(true);
    try {
      const slug = await generateSlug.mutateAsync();
      toast.success('Portfolio published!', { description: `/p/${slug}` });
    } catch {
      toast.error('Failed to generate portfolio link');
    } finally {
      setGeneratingSlug(false);
    }
  };

  const portfolioUrl = profile?.portfolio_slug
    ? `${window.location.origin}/p/${profile.portfolio_slug}`
    : null;

  const avatarUrl = profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : null;

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight">Portfolio</h1>
          <p className="text-sm text-ink-500 mt-0.5">Your public profile and earned certificates</p>
        </div>
      </motion.div>

      {/* Public Portfolio Link */}
      <section className="bg-white border border-ink-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-ink-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Icon name="link" size={16} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-ink-900">Public Portfolio Link</h2>
            <p className="text-xs text-ink-500">Share your profile and certificates with anyone</p>
          </div>
        </div>

        {portfolioUrl ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Icon name="check_circle" size={15} className="text-emerald-600 flex-shrink-0" fill />
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-emerald-700 hover:underline truncate"
              >
                {portfolioUrl}
              </a>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { navigator.clipboard.writeText(portfolioUrl); toast.success('Copied!'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-50 hover:bg-ink-100 border border-ink-200 text-ink-600 text-xs font-bold transition-colors"
              >
                <Icon name="content_copy" size={13} />
                Copy
              </button>
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-900 hover:bg-ink-700 text-white text-xs font-bold transition-colors"
              >
                <Icon name="open_in_new" size={13} />
                View
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="flex-1 text-sm text-ink-500">
              Publish your portfolio to get a shareable link with your profile and certificates.
            </p>
            <Button
              onClick={handleGenerateSlug}
              loading={generatingSlug}
              className="flex-shrink-0"
            >
              <Icon name="public" size={14} />
              Publish Portfolio
            </Button>
          </div>
        )}
      </section>

      {/* Profile */}
      <section className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center">
              <Icon name="person" size={16} className="text-ink-600" />
            </div>
            <h2 className="text-sm font-display font-bold text-ink-900">Profile</h2>
          </div>
          {!editingProfile && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-50 hover:bg-ink-100 border border-ink-200 text-ink-600 text-xs font-bold transition-colors"
            >
              <Icon name="edit" size={13} />
              Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={form.handleSubmit(handleSave)} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                placeholder="Your full name"
                error={form.formState.errors.display_name?.message}
                {...form.register('display_name')}
              />
              <Input
                label="Headline"
                placeholder="e.g. Frontend Developer at Acme"
                error={form.formState.errors.headline?.message}
                {...form.register('headline')}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-700 block mb-1">Bio</label>
              <textarea
                rows={3}
                placeholder="Tell the world about yourself…"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-ink-900 placeholder-ink-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none transition-colors"
                {...form.register('bio')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Location" placeholder="City, Country" {...form.register('location')} />
              <Input label="Website" placeholder="https://yoursite.com" error={form.formState.errors.website_url?.message} {...form.register('website_url')} />
              <Input label="LinkedIn URL" placeholder="https://linkedin.com/in/..." error={form.formState.errors.linkedin_url?.message} {...form.register('linkedin_url')} />
              <Input label="GitHub URL" placeholder="https://github.com/..." error={form.formState.errors.github_url?.message} {...form.register('github_url')} />
              <Input label="Twitter URL" placeholder="https://twitter.com/..." error={form.formState.errors.twitter_url?.message} {...form.register('twitter_url')} />
              <Input label="Instagram URL" placeholder="https://instagram.com/..." error={form.formState.errors.instagram_url?.message} {...form.register('instagram_url')} />
            </div>

            <div className="border-t border-ink-100 pt-4">
              <p className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-3">Education</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="College / University" placeholder="e.g. MIT" {...form.register('college')} />
                <Input label="Degree" placeholder="e.g. B.Tech Computer Science" {...form.register('degree')} />
                <Input label="College Year" placeholder="e.g. 2022-2026" {...form.register('college_year')} />
                <Input label="School" placeholder="e.g. Delhi Public School" {...form.register('school')} />
                <Input label="School Year" placeholder="e.g. 2018-2022" {...form.register('school_year')} />
              </div>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <p className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-3">Experience</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Job Title" placeholder="e.g. Software Engineer" {...form.register('experience_title')} />
                <Input label="Company" placeholder="e.g. Google" {...form.register('experience_company')} />
                <Input label="Years of Experience" type="number" min={0} max={60} {...form.register('experience_years')} />
              </div>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <label className="text-xs font-medium text-ink-700 block mb-1">
                Skills <span className="text-ink-400 font-normal">(comma separated)</span>
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => { setSkillsInput(e.target.value); form.setValue('skills', e.target.value); }}
                placeholder="React, TypeScript, Node.js, Figma…"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-ink-900 placeholder-ink-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
              />
              {skillsInput && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skillsInput.split(',').map((s) => s.trim()).filter(Boolean).map((sk) => (
                    <span key={sk} className="px-2.5 py-1 rounded-full bg-ink-100 text-ink-700 text-xs font-semibold">{sk}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingProfile(false)} disabled={savingProfile}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={savingProfile}>
                Save Profile
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-5">
            {!profile?.display_name ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-ink-50 border border-dashed border-ink-300 flex items-center justify-center">
                  <Icon name="person_add" size={24} className="text-ink-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-800">No profile yet</p>
                  <p className="text-xs text-ink-500 mt-0.5">Add your info to make your portfolio shine</p>
                </div>
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 hover:bg-ink-700 text-white text-xs font-bold transition-colors"
                >
                  <Icon name="add" size={13} />
                  Fill in Profile
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.display_name} className="w-16 h-16 rounded-2xl object-cover border-2 border-ink-100 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-2 border-ink-100 flex-shrink-0">
                    <span className="text-white text-2xl font-black">{(profile.display_name || 'U')[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-base font-extrabold text-ink-900">{profile.display_name}</p>
                  {profile.headline && <p className="text-sm text-ink-500">{profile.headline}</p>}
                  {profile.location && (
                    <span className="flex items-center gap-1 text-xs text-ink-400">
                      <Icon name="location_on" size={12} />
                      {profile.location}
                    </span>
                  )}
                  {profile.bio && <p className="text-sm text-ink-700 leading-relaxed mt-2 line-clamp-3">{profile.bio}</p>}
                  {profile.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profile.skills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 text-xs font-semibold">{sk}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Certificates */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-sm font-display font-bold text-ink-900">Earned Certificates</h2>
          </div>
          {certs.length > 0 && (
            <span className="text-xs text-ink-400 font-medium">{certs.length} total</span>
          )}
        </div>

        {certsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-ink-100 animate-pulse" />)}
          </div>
        ) : certs.length === 0 ? (
          <div className={cn(
            'flex flex-col items-center justify-center py-14 bg-white rounded-2xl border-2 border-dashed text-center',
            'border-ink-200',
          )}>
            <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-bold text-ink-800">No certificates yet</p>
            <p className="text-xs text-ink-500 mt-1 max-w-xs">Complete a course to earn your first verified certificate</p>
            <a
              href="/courses"
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 hover:bg-ink-700 text-white text-xs font-bold transition-colors"
            >
              <Icon name="school" size={13} />
              Browse Courses
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {certs.map((cert) => <CertCard key={cert.id} cert={cert} />)}
          </div>
        )}
      </section>
    </div>
  );
}
