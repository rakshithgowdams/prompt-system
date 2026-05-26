import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  useProfile, useUpsertProfile, useAllMyCertificates, getAvatarUrl,
  type UserProfile,
} from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/utils';

// ── Avatar upload helper (XHR with progress) ─────────────────────────────────

async function uploadAvatarXHR(
  bucket: string, path: string, file: File, token: string, supabaseUrl: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.statusText}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send(file);
  });
}

// ── Tag chip input ────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v || tags.includes(v)) { setInput(''); return; }
    onChange([...tags, v]);
    setInput('');
  };
  return (
    <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-ink-200 bg-white min-h-[44px] focus-within:ring-2 focus-within:ring-blue-400">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-100 text-ink-800 text-xs font-semibold">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-ink-400 hover:text-red-500 transition-colors ml-0.5">
            <Icon name="close" size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        placeholder={tags.length === 0 ? 'Type a skill and press Enter…' : ''}
        className="flex-1 min-w-[120px] text-xs text-ink-900 placeholder-ink-400 outline-none bg-transparent"
      />
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children, className }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-ink-200 overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100">
        <div className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center flex-shrink-0">
          <Icon name={icon} size={16} className="text-ink-600" />
        </div>
        <h3 className="text-sm font-display font-bold text-ink-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-ink-600 uppercase tracking-wider">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors';
const textareaCls = 'w-full px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-colors';

// ── Certificate card ──────────────────────────────────────────────────────────

function CertCard({
  cert,
  onView,
}: {
  cert: {
    id: string; course_id: string; serial_number: string; student_name: string;
    course_title: string; course_category: string; issued_at: string; share_slug: string | null;
    instructor_name: string | null;
    courses: { title: string; cover_image: string | null } | null;
  };
  onView: () => void;
}) {
  const date = new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white rounded-2xl border border-ink-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-50 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={onView}
    >
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
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
      </div>
    </motion.div>
  );
}

// ── Profile header (view mode) ────────────────────────────────────────────────

function ProfileHeader({ profile, certCount, email }: { profile: UserProfile; certCount: number; email: string }) {
  const avatarUrl = profile.avatar_path ? getAvatarUrl(profile.avatar_path) : null;
  return (
    <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
      {/* Cover gradient */}
      <div className="h-28 sm:h-36 bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 40%)' }} />
      </div>

      <div className="px-5 sm:px-6 pb-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between gap-4 -mt-12 mb-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.display_name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-white text-3xl font-black">{(profile.display_name || email)[0]?.toUpperCase()}</span>
              </div>
            )}
            {profile.is_portfolio_public && (
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                <Icon name="verified" size={13} className="text-white" fill />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pb-1">
            {certCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                {certCount} {certCount === 1 ? 'Certificate' : 'Certificates'}
              </div>
            )}
          </div>
        </div>

        {/* Name & headline */}
        <h2 className="text-xl sm:text-2xl font-display font-black text-ink-900 leading-tight">
          {profile.display_name || 'Anonymous'}
        </h2>
        {profile.headline && (
          <p className="text-sm text-ink-500 mt-1 leading-relaxed">{profile.headline}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
          {profile.location && (
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <Icon name="location_on" size={13} className="text-ink-400" />
              {profile.location}
            </span>
          )}
          {profile.experience_title && (
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <Icon name="work" size={13} className="text-ink-400" />
              {profile.experience_title}{profile.experience_company ? ` @ ${profile.experience_company}` : ''}
            </span>
          )}
          {profile.experience_years > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <Icon name="timeline" size={13} className="text-ink-400" />
              {profile.experience_years}y experience
            </span>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm text-ink-700 leading-relaxed">{profile.bio}</p>
        )}

        {/* Social links */}
        {(profile.linkedin_url || profile.github_url || profile.twitter_url || profile.instagram_url || profile.website_url) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { url: profile.linkedin_url, icon: 'LinkedIn', color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100', label: 'in' },
              { url: profile.github_url, icon: 'GitHub', color: 'text-ink-800 bg-ink-50 border-ink-200 hover:bg-ink-100', label: 'gh' },
              { url: profile.twitter_url, icon: 'Twitter', color: 'text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100', label: 'tw' },
              { url: profile.instagram_url, icon: 'Instagram', color: 'text-pink-600 bg-pink-50 border-pink-200 hover:bg-pink-100', label: 'ig' },
              { url: profile.website_url, icon: 'Website', color: 'text-ink-700 bg-ink-50 border-ink-200 hover:bg-ink-100', label: 'web' },
            ].filter((s) => !!s.url).map((s) => (
              <a key={s.icon} href={s.url} target="_blank" rel="noopener noreferrer"
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors', s.color)}
              >
                {s.icon}
              </a>
            ))}
          </div>
        )}

        {/* Skills */}
        {profile.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {profile.skills.map((sk) => (
              <span key={sk} className="px-2.5 py-1 rounded-full bg-ink-100 text-ink-700 text-xs font-semibold">{sk}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Education card ────────────────────────────────────────────────────────────

function EducationTimeline({ profile }: { profile: UserProfile }) {
  const items = [
    profile.college && { icon: 'school', label: 'College / University', name: profile.college, sub: profile.degree, year: profile.college_year, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    profile.school && { icon: 'menu_book', label: 'School', name: profile.school, sub: '', year: profile.school_year, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  ].filter(Boolean) as Array<{ icon: string; label: string; name: string; sub: string; year: string; color: string }>;

  if (items.length === 0) return <p className="text-sm text-ink-400 italic">No education info added yet.</p>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className={cn('flex items-start gap-3 p-4 rounded-xl border', item.color)}>
          <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
            <Icon name={item.icon} size={18} className="text-current" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{item.label}</p>
            <p className="text-sm font-bold text-ink-900 leading-tight">{item.name}</p>
            {item.sub && <p className="text-xs text-ink-600 mt-0.5">{item.sub}</p>}
            {item.year && <p className="text-xs text-ink-500 mt-1 font-mono">{item.year}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'edit';

export function PortfolioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: certs = [], isLoading: certsLoading } = useAllMyCertificates();
  const upsert = useUpsertProfile();

  const [tab, setTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [skillInput, setSkillInput] = useState('');

  // form state
  const [form, setForm] = useState<Partial<UserProfile>>({});

  // Sync profile into form when loaded
  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? '',
        bio: profile.bio ?? '',
        headline: profile.headline ?? '',
        location: profile.location ?? '',
        website_url: profile.website_url ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        github_url: profile.github_url ?? '',
        twitter_url: profile.twitter_url ?? '',
        instagram_url: profile.instagram_url ?? '',
        college: profile.college ?? '',
        school: profile.school ?? '',
        college_year: profile.college_year ?? '',
        school_year: profile.school_year ?? '',
        degree: profile.degree ?? '',
        experience_years: profile.experience_years ?? 0,
        experience_title: profile.experience_title ?? '',
        experience_company: profile.experience_company ?? '',
        skills: profile.skills ?? [],
        is_portfolio_public: profile.is_portfolio_public ?? false,
      });
    }
  }, [profile?.id]);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    setAvatarFile(file);
    const r = new FileReader();
    r.onload = (e) => setAvatarPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarPath = profile?.avatar_path ?? null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/avatar.${ext}`;
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token ?? '';
        setUploadPct(0);
        await uploadAvatarXHR('avatars', path, avatarFile, token, import.meta.env.VITE_SUPABASE_URL as string, setUploadPct);
        avatarPath = path;
        setAvatarFile(null);
        setAvatarPreview(null);
        setUploadPct(null);
      }
      await upsert.mutateAsync({ ...form, avatar_path: avatarPath });
      toast.success('Profile saved!');
      setTab('overview');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-4 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />)}
      </div>
    );
  }

  const displayProfile: UserProfile = {
    id: user?.id ?? '',
    display_name: (form.display_name ?? profile?.display_name ?? ''),
    avatar_path: profile?.avatar_path ?? null,
    bio: form.bio ?? '',
    headline: form.headline ?? '',
    location: form.location ?? '',
    website_url: form.website_url ?? '',
    linkedin_url: form.linkedin_url ?? '',
    github_url: form.github_url ?? '',
    twitter_url: form.twitter_url ?? '',
    instagram_url: form.instagram_url ?? '',
    college: form.college ?? '',
    school: form.school ?? '',
    college_year: form.college_year ?? '',
    school_year: form.school_year ?? '',
    degree: form.degree ?? '',
    experience_years: form.experience_years ?? 0,
    experience_title: form.experience_title ?? '',
    experience_company: form.experience_company ?? '',
    skills: form.skills ?? [],
    is_portfolio_public: form.is_portfolio_public ?? false,
    created_at: profile?.created_at ?? '',
    updated_at: '',
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight">My Portfolio</h1>
          <p className="text-sm text-ink-500 mt-1">Certificates, bio, education, and experience all in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab(tab === 'edit' ? 'overview' : 'edit')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all duration-150',
              tab === 'edit'
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400 hover:bg-ink-50',
            )}
          >
            <Icon name={tab === 'edit' ? 'preview' : 'edit'} size={15} />
            {tab === 'edit' ? 'Preview' : 'Edit Profile'}
          </button>
          {tab === 'edit' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
            >
              <Icon name="save" size={15} />
              {saving ? (uploadPct !== null ? `${uploadPct}%` : 'Saving…') : 'Save'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Profile card */}
            <ProfileHeader profile={displayProfile} certCount={certs.length} email={user?.email ?? ''} />

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Certificates', value: certs.length, icon: 'workspace_premium', color: 'from-amber-400 to-orange-400' },
                { label: 'Experience', value: displayProfile.experience_years > 0 ? `${displayProfile.experience_years}y` : '—', icon: 'work', color: 'from-blue-500 to-blue-600' },
                { label: 'Skills', value: displayProfile.skills.length, icon: 'psychology', color: 'from-emerald-500 to-teal-500' },
                { label: 'Portfolio', value: displayProfile.is_portfolio_public ? 'Public' : 'Private', icon: 'public', color: 'from-slate-600 to-slate-700' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-ink-200 p-4">
                  <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', s.color)}>
                    <Icon name={s.icon} size={17} className="text-white" fill />
                  </div>
                  <p className="text-xl font-black text-ink-900 leading-none">{s.value}</p>
                  <p className="text-xs text-ink-500 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left col */}
              <div className="lg:col-span-2 space-y-6">
                {/* Certificates */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-display font-extrabold text-ink-900">Earned Certificates</h2>
                    <button onClick={() => navigate('/courses')} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                      Browse Courses <Icon name="chevron_right" size={13} />
                    </button>
                  </div>
                  {certsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[1, 2].map((i) => <div key={i} className="h-40 rounded-2xl bg-ink-100 animate-pulse" />)}
                    </div>
                  ) : certs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-white rounded-2xl border border-dashed border-ink-300 text-center">
                      <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mb-3">
                        <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      </div>
                      <p className="text-sm font-bold text-ink-800 mb-1">No certificates yet</p>
                      <p className="text-xs text-ink-500 max-w-xs leading-relaxed">Complete a course to earn your first verified certificate of completion.</p>
                      <button onClick={() => navigate('/courses')}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                      >
                        <Icon name="school" size={13} />
                        Explore Courses
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {certs.map((cert) => (
                        <CertCard key={cert.id} cert={cert} onView={() => navigate(`/courses/${cert.course_id}/certificate`)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right col */}
              <div className="space-y-5">
                {/* Education */}
                <Section title="Education" icon="school">
                  <EducationTimeline profile={displayProfile} />
                </Section>

                {/* Experience */}
                {(displayProfile.experience_title || displayProfile.experience_company) && (
                  <Section title="Experience" icon="work">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                        <Icon name="business" size={17} className="text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink-900 leading-tight">{displayProfile.experience_title}</p>
                        {displayProfile.experience_company && <p className="text-xs text-ink-600 mt-0.5">{displayProfile.experience_company}</p>}
                        {displayProfile.experience_years > 0 && <p className="text-xs text-ink-400 mt-1 font-mono">{displayProfile.experience_years} years</p>}
                      </div>
                    </div>
                  </Section>
                )}

                {/* Skills */}
                {displayProfile.skills.length > 0 && (
                  <Section title="Skills" icon="psychology">
                    <div className="flex flex-wrap gap-2">
                      {displayProfile.skills.map((sk) => (
                        <span key={sk} className="px-3 py-1.5 rounded-full bg-ink-100 border border-ink-200 text-ink-700 text-xs font-semibold">{sk}</span>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Avatar + Basic */}
            <Section title="Basic Information" icon="person">
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    className="group relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-ink-200 hover:border-blue-400 transition-colors"
                  >
                    {avatarPreview || profile?.avatar_path ? (
                      <img src={avatarPreview ?? (profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : '')} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                        <span className="text-white text-3xl font-black">
                          {(form.display_name || user?.email || 'U')[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="photo_camera" size={22} className="text-white" />
                    </div>
                    {uploadPct !== null && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{uploadPct}%</span>
                      </div>
                    )}
                  </button>
                  <p className="text-[11px] text-ink-400 text-center leading-tight">Click to<br/>upload photo</p>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ''; }}
                  />
                </div>

                {/* Name + headline + location */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Display Name" required>
                    <input value={form.display_name ?? ''} onChange={(e) => set('display_name', e.target.value)}
                      placeholder="Your full name" className={inputCls} />
                  </Field>
                  <Field label="Headline">
                    <input value={form.headline ?? ''} onChange={(e) => set('headline', e.target.value)}
                      placeholder="e.g. Full-stack Developer" className={inputCls} />
                  </Field>
                  <Field label="Location">
                    <input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)}
                      placeholder="City, Country" className={inputCls} />
                  </Field>
                  <Field label="Portfolio Public">
                    <div className="flex items-center h-11 gap-3">
                      <button type="button"
                        onClick={() => set('is_portfolio_public', !form.is_portfolio_public)}
                        className={cn('relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0', form.is_portfolio_public ? 'bg-emerald-500' : 'bg-ink-200')}
                      >
                        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200', form.is_portfolio_public && 'translate-x-5')} />
                      </button>
                      <span className="text-sm text-ink-700">{form.is_portfolio_public ? 'Public' : 'Private'}</span>
                    </div>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Bio">
                      <textarea value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)}
                        rows={3} placeholder="Tell your story in a few sentences…" className={textareaCls} />
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            {/* Social links */}
            <Section title="Social & Links" icon="link">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'linkedin_url' as const, label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/yourname' },
                  { key: 'github_url' as const, label: 'GitHub URL', placeholder: 'https://github.com/yourname' },
                  { key: 'twitter_url' as const, label: 'Twitter / X URL', placeholder: 'https://twitter.com/yourname' },
                  { key: 'instagram_url' as const, label: 'Instagram URL', placeholder: 'https://instagram.com/yourname' },
                  { key: 'website_url' as const, label: 'Personal Website', placeholder: 'https://yoursite.com' },
                ].map(({ key, label, placeholder }) => (
                  <Field key={key} label={label}>
                    <input value={(form[key] as string) ?? ''} onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder} className={inputCls} type="url" />
                  </Field>
                ))}
              </div>
            </Section>

            {/* Experience */}
            <Section title="Work Experience" icon="work">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Job Title">
                  <input value={form.experience_title ?? ''} onChange={(e) => set('experience_title', e.target.value)}
                    placeholder="e.g. Software Engineer" className={inputCls} />
                </Field>
                <Field label="Company">
                  <input value={form.experience_company ?? ''} onChange={(e) => set('experience_company', e.target.value)}
                    placeholder="e.g. Google" className={inputCls} />
                </Field>
                <Field label="Years of Experience">
                  <input value={form.experience_years ?? 0} onChange={(e) => set('experience_years', Number(e.target.value) || 0)}
                    type="number" min={0} max={50} placeholder="3" className={inputCls} />
                </Field>
              </div>
            </Section>

            {/* Education */}
            <Section title="Education" icon="school">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="College / University">
                  <input value={form.college ?? ''} onChange={(e) => set('college', e.target.value)}
                    placeholder="e.g. IIT Bangalore" className={inputCls} />
                </Field>
                <Field label="Degree">
                  <input value={form.degree ?? ''} onChange={(e) => set('degree', e.target.value)}
                    placeholder="e.g. B.Tech Computer Science" className={inputCls} />
                </Field>
                <Field label="College Years">
                  <input value={form.college_year ?? ''} onChange={(e) => set('college_year', e.target.value)}
                    placeholder="e.g. 2019 – 2023" className={inputCls} />
                </Field>
                <Field label="School">
                  <input value={form.school ?? ''} onChange={(e) => set('school', e.target.value)}
                    placeholder="e.g. St. Joseph's High School" className={inputCls} />
                </Field>
                <Field label="School Years">
                  <input value={form.school_year ?? ''} onChange={(e) => set('school_year', e.target.value)}
                    placeholder="e.g. 2015 – 2019" className={inputCls} />
                </Field>
              </div>
            </Section>

            {/* Skills */}
            <Section title="Skills" icon="psychology">
              <Field label="Add Skills (press Enter or comma to add)">
                <TagInput
                  tags={form.skills ?? []}
                  onChange={(t) => set('skills', t)}
                />
              </Field>
            </Section>

            {/* Save footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setTab('overview')} className="px-5 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-semibold hover:bg-ink-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                <Icon name="save" size={15} />
                {saving ? (uploadPct !== null ? `Uploading ${uploadPct}%` : 'Saving…') : 'Save Profile'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
