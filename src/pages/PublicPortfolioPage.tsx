import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  usePublicProfileBySlug,
  usePublicPortfolioCertificates,
  getAvatarUrl,
  type UserProfile,
} from '../hooks/useProfile';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/utils';

function CertCard({ cert }: {
  cert: {
    id: string; course_id: string; serial_number: string; student_name: string;
    course_title: string; course_category: string; issued_at: string; share_slug: string | null;
    instructor_name: string | null;
    courses: { title: string; cover_image: string | null } | null;
  };
}) {
  const date = new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const certUrl = cert.share_slug ? `${window.location.origin}/c/${cert.share_slug}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
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

function SocialLink({ url, label, color }: { url: string; label: string; color: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors', color)}
    >
      {label}
    </a>
  );
}

function ProfileHero({ profile, certCount }: { profile: UserProfile; certCount: number }) {
  const avatarUrl = profile.avatar_path ? getAvatarUrl(profile.avatar_path) : null;
  return (
    <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden shadow-sm">
      {/* Cover */}
      <div className="h-32 sm:h-44 bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 40%)' }} />
        {/* Verified badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm border border-emerald-400 text-white text-xs font-bold">
          <Icon name="verified" size={13} className="text-white" fill />
          Verified Portfolio
        </div>
      </div>

      <div className="px-5 sm:px-8 pb-6">
        <div className="flex items-end justify-between gap-4 -mt-14 mb-5">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.display_name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-xl" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-4 border-white shadow-xl">
                <span className="text-white text-4xl font-black">{(profile.display_name || 'U')[0]?.toUpperCase()}</span>
              </div>
            )}
          </div>
          {certCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 mb-1">
              <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              {certCount} {certCount === 1 ? 'Certificate' : 'Certificates'}
            </div>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-black text-ink-900 leading-tight">
          {profile.display_name || 'Anonymous'}
        </h1>
        {profile.headline && (
          <p className="text-base text-ink-500 mt-1">{profile.headline}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
          {profile.location && (
            <span className="flex items-center gap-1.5 text-sm text-ink-500">
              <Icon name="location_on" size={14} className="text-ink-400" />
              {profile.location}
            </span>
          )}
          {profile.experience_title && (
            <span className="flex items-center gap-1.5 text-sm text-ink-500">
              <Icon name="work" size={14} className="text-ink-400" />
              {profile.experience_title}{profile.experience_company ? ` @ ${profile.experience_company}` : ''}
            </span>
          )}
          {profile.experience_years > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-ink-500">
              <Icon name="timeline" size={14} className="text-ink-400" />
              {profile.experience_years}y experience
            </span>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-ink-700 leading-relaxed max-w-2xl">{profile.bio}</p>
        )}

        {(profile.linkedin_url || profile.github_url || profile.twitter_url || profile.instagram_url || profile.website_url) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.linkedin_url && <SocialLink url={profile.linkedin_url} label="LinkedIn" color="text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100" />}
            {profile.github_url && <SocialLink url={profile.github_url} label="GitHub" color="text-ink-800 bg-ink-50 border-ink-200 hover:bg-ink-100" />}
            {profile.twitter_url && <SocialLink url={profile.twitter_url} label="Twitter" color="text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100" />}
            {profile.instagram_url && <SocialLink url={profile.instagram_url} label="Instagram" color="text-pink-600 bg-pink-50 border-pink-200 hover:bg-pink-100" />}
            {profile.website_url && <SocialLink url={profile.website_url} label="Website" color="text-ink-700 bg-ink-50 border-ink-200 hover:bg-ink-100" />}
          </div>
        )}

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

export function PublicPortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = usePublicProfileBySlug(slug);
  const { data: certs = [], isLoading: certsLoading } = usePublicPortfolioCertificates(profile?.id);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-500">Loading portfolio…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-ink-100 rounded-2xl flex items-center justify-center mx-auto">
            <Icon name="person_off" size={30} className="text-ink-400" />
          </div>
          <h1 className="text-xl font-display font-bold text-ink-900">Portfolio Not Found</h1>
          <p className="text-sm text-ink-500">This portfolio is either private or doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-700 text-white text-sm font-bold transition-colors"
          >
            <Icon name="home" size={15} />
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const hasEducation = profile.college || profile.school;
  const hasExperience = profile.experience_title || profile.experience_company;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-ink-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/mdn-logo copy.png" alt="MyDesignNexus" className="h-8 object-contain" />
          </div>
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900 hover:bg-ink-700 text-white text-xs font-bold transition-colors"
          >
            <Icon name="school" size={13} />
            Get Certified
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <ProfileHero profile={profile} certCount={certs.length} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Certificates */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-extrabold text-ink-900">Earned Certificates</h2>
              <span className="text-xs text-ink-400 font-medium">{certs.length} total</span>
            </div>

            {certsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((i) => <div key={i} className="h-44 rounded-2xl bg-ink-100 animate-pulse" />)}
              </div>
            ) : certs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-ink-300 text-center">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </div>
                <p className="text-sm font-bold text-ink-800">No certificates yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {certs.map((cert) => <CertCard key={cert.id} cert={cert} />)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {hasEducation && (
              <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100">
                  <div className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center">
                    <Icon name="school" size={16} className="text-ink-600" />
                  </div>
                  <h3 className="text-sm font-display font-bold text-ink-900">Education</h3>
                </div>
                <div className="p-4 space-y-3">
                  {profile.college && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                        <Icon name="school" size={16} className="text-blue-700" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 opacity-70 mb-0.5">College</p>
                        <p className="text-sm font-bold text-ink-900">{profile.college}</p>
                        {profile.degree && <p className="text-xs text-ink-600 mt-0.5">{profile.degree}</p>}
                        {profile.college_year && <p className="text-xs text-ink-400 mt-0.5 font-mono">{profile.college_year}</p>}
                      </div>
                    </div>
                  )}
                  {profile.school && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                        <Icon name="menu_book" size={16} className="text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 opacity-70 mb-0.5">School</p>
                        <p className="text-sm font-bold text-ink-900">{profile.school}</p>
                        {profile.school_year && <p className="text-xs text-ink-400 mt-0.5 font-mono">{profile.school_year}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasExperience && (
              <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100">
                  <div className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center">
                    <Icon name="work" size={16} className="text-ink-600" />
                  </div>
                  <h3 className="text-sm font-display font-bold text-ink-900">Experience</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                      <Icon name="business" size={16} className="text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{profile.experience_title}</p>
                      {profile.experience_company && <p className="text-xs text-ink-600 mt-0.5">{profile.experience_company}</p>}
                      {profile.experience_years > 0 && <p className="text-xs text-ink-400 mt-0.5 font-mono">{profile.experience_years} years</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {profile.skills?.length > 0 && (
              <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100">
                  <div className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center">
                    <Icon name="psychology" size={16} className="text-ink-600" />
                  </div>
                  <h3 className="text-sm font-display font-bold text-ink-900">Skills</h3>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {profile.skills.map((sk) => (
                    <span key={sk} className="px-3 py-1.5 rounded-full bg-ink-100 border border-ink-200 text-ink-700 text-xs font-semibold">{sk}</span>
                  ))}
                </div>
              </div>
            )}

            {/* MDN badge */}
            <div className="bg-gradient-to-br from-slate-800 to-blue-900 rounded-2xl p-5 text-white text-center">
              <img src="/mdn-logo copy.png" alt="MyDesignNexus" className="h-8 object-contain mx-auto mb-3 brightness-0 invert" />
              <p className="text-xs font-bold opacity-80 mb-3">Verified certificates powered by</p>
              <p className="text-sm font-black">MyDesignNexus</p>
              <a
                href="/"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors"
              >
                <Icon name="school" size={12} />
                Start Learning
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
