import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { useFolders, useAllProjectFiles } from '../../hooks/useProjectFiles';
import { Icon } from '../ui/Icon';
import { FileTypeIcon } from '../files/FileTypeIcon';
import { FollowPopup } from '../ui/FollowPopup';
import { getSignedUrl } from '../../lib/storage';
import { cn, PROJECT_COLORS } from '../../lib/utils';
import type { Project } from '../../lib/database.types';

// ── Project tree item in sidebar ──────────────────────────────────────────────

function SidebarProjectTree({ project, isActive }: { project: Project; isActive: (href: string) => boolean }) {
  const location = useLocation();
  const navigate = useNavigate();

  const projectBase = `/projects/${project.slug}`;
  const filesBase = `${projectBase}/files`;
  const isProjectActive = location.pathname === projectBase || (location.pathname.startsWith(projectBase + '/') && !location.pathname.includes('/files'));
  const isFilesActive = location.pathname.startsWith(filesBase);
  const isAnyActive = isProjectActive || isFilesActive;

  const activeFolderInUrl = isFilesActive
    ? new URLSearchParams(location.search).get('folder')
    : null;

  const [expanded, setExpanded] = useState(isAnyActive);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    activeFolderInUrl ? new Set([activeFolderInUrl]) : new Set(),
  );

  const { data: folders = [] } = useFolders(project.id);
  const { data: allFiles = [] } = useAllProjectFiles(project.id);

  useEffect(() => {
    if (isAnyActive) setExpanded(true);
  }, [isAnyActive]);

  useEffect(() => {
    if (activeFolderInUrl) {
      setExpandedFolders((prev) => new Set([...prev, activeFolderInUrl]));
    }
  }, [activeFolderInUrl]);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const navigateToFolder = (folderId: string) => {
    navigate(`${filesBase}?folder=${folderId}`);
    setExpandedFolders((prev) => new Set([...prev, folderId]));
  };

  const rootFiles = allFiles.filter((f) => !f.folder_id);

  return (
    <div>
      <div className="flex items-center gap-1 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-ink-500 hover:text-ink-900 rounded transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 2l4 3-4 3V2z" />
            </svg>
          </motion.span>
        </button>

        <Link
          to={projectBase}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-all duration-150 min-w-0',
            isProjectActive
              ? 'bg-brand-50 text-brand-600 border border-brand-100'
              : 'text-ink-700 hover:text-ink-900 hover:bg-ink-100',
          )}
        >
          <ProjectThumb project={project} />
          <span className="truncate flex-1">{project.name}</span>
        </Link>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-0.5 border-l border-ink-300 pl-2 space-y-0.5 pb-1">
              {rootFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => navigate(filesBase)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left',
                    isFilesActive && !activeFolderInUrl
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100',
                  )}
                  title={file.file_name}
                >
                  <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={13} />
                  <span className="truncate flex-1">{file.file_name}</span>
                </button>
              ))}

              {folders.map((folder) => {
                const folderFiles = allFiles.filter((f) => f.folder_id === folder.id);
                const isFolderExpanded = expandedFolders.has(folder.id);
                const isFolderActive = activeFolderInUrl === folder.id;

                return (
                  <div key={folder.id}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-ink-500 hover:text-ink-900 rounded transition-colors"
                      >
                        <motion.span
                          animate={{ rotate: isFolderExpanded ? 90 : 0 }}
                          transition={{ duration: 0.13 }}
                          className="inline-flex"
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M3 2l4 3-4 3V2z" />
                          </svg>
                        </motion.span>
                      </button>

                      <button
                        onClick={() => navigateToFolder(folder.id)}
                        className={cn(
                          'flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors text-left min-w-0',
                          isFolderActive
                            ? 'text-brand-600 bg-brand-50 border border-brand-100'
                            : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100',
                        )}
                        title={folder.name}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={cn('flex-shrink-0', isFolderActive || isFolderExpanded ? 'text-amber-500' : 'text-ink-500')}>
                          {isFolderActive || isFolderExpanded ? (
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          ) : (
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          )}
                        </svg>
                        <span className="truncate flex-1">{folder.name}</span>
                        {folderFiles.length > 0 && (
                          <span className="flex-shrink-0 text-[10px] text-ink-500 bg-ink-100 rounded px-1">{folderFiles.length}</span>
                        )}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isFolderExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.13 }}
                          className="overflow-hidden ml-3 border-l border-ink-300 pl-2 mt-0.5 space-y-0.5"
                        >
                          {folderFiles.length === 0 ? (
                            <p className="text-[11px] text-ink-500 px-2 py-1 italic">Empty folder</p>
                          ) : (
                            folderFiles.map((file) => (
                              <button
                                key={file.id}
                                onClick={() => navigate(`${filesBase}?folder=${folder.id}`)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors text-left"
                                title={file.file_name}
                              >
                                <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={12} />
                                <span className="truncate flex-1">{file.file_name}</span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <Link
                to={filesBase}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                  isFilesActive && !activeFolderInUrl
                    ? 'text-brand-600 bg-brand-50 border border-brand-100'
                    : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100',
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-current">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity=".08"/>
                </svg>
                All Files
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Project thumbnail ─────────────────────────────────────────────────────────

function ProjectThumb({ project }: { project: Project }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!project.cover_image) return;
    getSignedUrl(project.cover_image, 3600).then(setUrl).catch(() => {});
  }, [project.cover_image]);

  if (url) {
    return <img src={url} alt="" className="w-5 h-5 object-cover rounded-sm flex-shrink-0" />;
  }
  return (
    <div className={cn(
      'w-5 h-5 rounded-sm bg-gradient-to-br flex items-center justify-center flex-shrink-0',
      PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray,
    )}>
      <Icon name="photo" size={10} className="text-white/60" />
    </div>
  );
}

// ── Nav constants ─────────────────────────────────────────────────────────────

interface NavItem { label: string; href: string; icon: string }

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Courses', href: '/courses', icon: 'school' },
  { label: 'Todos', href: '/todos', icon: 'checklist' },
  { label: 'Password Vault', href: '/vault', icon: 'shield' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

const bottomNav = [
  { href: '/dashboard', icon: 'dashboard', label: 'Home' },
  { href: '/courses', icon: 'school', label: 'Courses' },
  { href: '/todos', icon: 'checklist', label: 'Todos' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

// ── Sidebar nav content ───────────────────────────────────────────────────────

function SidebarNav({
  isActive,
  projects,
  user,
  userMenuOpen,
  setUserMenuOpen,
  handleSignOut,
  onClose,
}: {
  isActive: (href: string) => boolean;
  projects: Project[] | undefined;
  user: { email?: string } | null;
  userMenuOpen: boolean;
  setUserMenuOpen: (v: boolean) => void;
  handleSignOut: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-ink-300 flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith.tech" className="h-8 w-auto" />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overscroll-contain">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 pt-2 pb-1.5">Menu</p>
        {mainNav.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'bg-brand-50 text-brand-600 border border-brand-100'
                : 'text-ink-700 hover:text-ink-900 hover:bg-ink-100',
            )}
          >
            <Icon name={item.icon} size={18} className={isActive(item.href) ? 'text-brand-600' : 'text-ink-500'} fill={isActive(item.href)} />
            {item.label}
          </Link>
        ))}

        {projects && projects.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 pt-4 pb-1.5">Projects</p>
            <div className="space-y-1">
              {projects.map((project) => (
                <SidebarProjectTree
                  key={project.id}
                  project={project}
                  isActive={isActive}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-ink-300 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-ink-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{user?.email}</p>
            </div>
            <Icon
              name="expand_less"
              size={16}
              className={cn('text-ink-500 transition-transform duration-200 flex-shrink-0', !userMenuOpen && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.13 }}
                className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-ink-300 rounded-lg shadow-card-hover overflow-hidden z-50"
              >
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-red-50 transition-colors font-medium"
                >
                  <Icon name="logout" size={16} className="text-danger" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 py-2.5 border-t border-ink-300/60 flex-shrink-0">
        <p className="text-[10px] text-ink-500 text-center leading-relaxed">
          Developed by{' '}
          <a
            href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-500 hover:text-brand-600 font-semibold transition-colors"
          >
            @aiwithrakshith
          </a>
        </p>
      </div>
    </>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const sidebarProps = {
    isActive,
    projects,
    user,
    userMenuOpen,
    setUserMenuOpen,
    handleSignOut,
  };

  return (
    <div className="min-h-screen bg-white flex overflow-x-hidden">
      <FollowPopup />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-ink-300 fixed inset-y-0 left-0 z-30">
        <SidebarNav {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 32, stiffness: 260 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-ink-300 z-50 flex flex-col lg:hidden shadow-2xl"
            >
              <SidebarNav {...sidebarProps} onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 w-full">
        {/* Mobile top bar */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-white border-b border-ink-300">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center">
            <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith.tech" className="h-7 w-auto" />
          </Link>
          <div className="w-9" />
        </header>

        <main className="overflow-x-hidden w-full min-w-0 lg:pt-0 pt-14 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-ink-300 flex"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {bottomNav.map((item) => {
            const active = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 gap-1 text-[11px] font-medium transition-colors min-h-[52px]',
                  active ? 'text-brand-400' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                <motion.div
                  animate={active ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  <Icon name={item.icon} size={22} fill={active} className={active ? 'text-brand-400' : 'text-ink-500'} />
                </motion.div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
