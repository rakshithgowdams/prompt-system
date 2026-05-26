import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { useFolders, useAllProjectFiles } from '../../hooks/useProjectFiles';
import { Icon } from '../ui/Icon';
import { FileTypeIcon } from '../files/FileTypeIcon';
import { getSignedUrl } from '../../lib/storage';
import { cn, PROJECT_COLORS } from '../../lib/utils';
import type { Project } from '../../lib/database.types';

// ── Project tree item in sidebar ──────────────────────────────────────────────

function SidebarProjectTree({ project, isActive }: { project: Project; isActive: (href: string) => boolean }) {
  const location = useLocation();
  const navigate = useNavigate();

  const projectBase = `/projects/${project.slug}`;
  const filesBase = `${projectBase}/files`;
  const isProjectActive = location.pathname === projectBase || (location.pathname.startsWith(projectBase) && !location.pathname.includes('/files'));
  const isFilesActive = location.pathname.startsWith(filesBase);
  const isAnyActive = isProjectActive || isFilesActive;

  const [expanded, setExpanded] = useState(isAnyActive);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { data: folders = [] } = useFolders(project.id);
  const { data: allFiles = [] } = useAllProjectFiles(project.id);

  // Auto-expand when navigating into project
  useEffect(() => {
    if (isAnyActive) setExpanded(true);
  }, [isAnyActive]);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const rootFiles = allFiles.filter((f) => !f.folder_id);

  return (
    <div>
      {/* Project row */}
      <div className="flex items-center gap-1 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-300 rounded transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
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
            'flex-1 flex items-center gap-2 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-150 min-w-0',
            isProjectActive
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800',
          )}
        >
          <ProjectThumb project={project} />
          <span className="truncate flex-1">{project.name}</span>
        </Link>
      </div>

      {/* Expandable tree */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-0.5 border-l border-gray-800 pl-2 space-y-0.5 pb-1">

              {/* Root files (no folder) */}
              {rootFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => navigate(filesBase)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 transition-colors text-left group"
                  title={file.file_name}
                >
                  <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={13} />
                  <span className="truncate flex-1">{file.file_name}</span>
                </button>
              ))}

              {/* Folders */}
              {folders.map((folder) => {
                const folderFiles = allFiles.filter((f) => f.folder_id === folder.id);
                const isFolderExpanded = expandedFolders.has(folder.id);

                return (
                  <div key={folder.id}>
                    {/* Folder row */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-600 hover:text-gray-300 rounded transition-colors"
                      >
                        <motion.span
                          animate={{ rotate: isFolderExpanded ? 90 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="inline-flex"
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M3 2l4 3-4 3V2z" />
                          </svg>
                        </motion.span>
                      </button>

                      <button
                        onClick={() => { navigate(`${filesBase}?folder=${folder.id}`); toggleFolder(folder.id); }}
                        className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors text-left min-w-0"
                        title={folder.name}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={cn('flex-shrink-0 transition-colors', isFolderExpanded ? 'text-amber-400' : 'text-amber-500/70')}>
                          {isFolderExpanded ? (
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          ) : (
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          )}
                        </svg>
                        <span className="truncate flex-1">{folder.name}</span>
                        {folderFiles.length > 0 && (
                          <span className="flex-shrink-0 text-[10px] text-gray-600 bg-gray-800 rounded px-1">{folderFiles.length}</span>
                        )}
                      </button>
                    </div>

                    {/* Folder contents */}
                    <AnimatePresence initial={false}>
                      {isFolderExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden ml-3 border-l border-gray-800/60 pl-2 mt-0.5 space-y-0.5"
                        >
                          {folderFiles.length === 0 ? (
                            <p className="text-[11px] text-gray-600 px-2 py-1 italic">Empty folder</p>
                          ) : (
                            folderFiles.map((file) => (
                              <button
                                key={file.id}
                                onClick={() => navigate(filesBase)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 transition-colors text-left"
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

              {/* Files link always visible at bottom */}
              <Link
                to={filesBase}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isFilesActive
                    ? 'text-blue-300 bg-blue-600/15'
                    : 'text-gray-600 hover:text-gray-300 hover:bg-gray-800/60',
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-current">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity=".1"/>
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
    return <img src={url} alt="" className="w-5 h-5 object-cover rounded-md flex-shrink-0" />;
  }
  return (
    <div className={cn(
      'w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center flex-shrink-0',
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
  { label: 'Todos', href: '/todos', icon: 'checklist' },
  { label: 'Password Vault', href: '/vault', icon: 'shield' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

const bottomNav = [
  { href: '/dashboard', icon: 'dashboard', label: 'Home' },
  { href: '/todos', icon: 'checklist', label: 'Todos' },
  { href: '/vault', icon: 'shield', label: 'Vault' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

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
    navigate('/login');
  };

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="lock" size={16} className="text-white" weight={400} fill />
        </div>
        <span className="font-bold text-white text-lg">PromptVault</span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overscroll-contain">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800',
            )}
          >
            <Icon name={item.icon} size={20} fill={isActive(item.href)} />
            {item.label}
          </Link>
        ))}

        {projects && projects.length > 0 && (
          <>
            <div className="pt-5 pb-1.5 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</p>
            </div>
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

      <div className="p-3 border-t border-gray-800 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            </div>
            <Icon
              name="expand_less"
              size={16}
              className={cn('text-gray-400 transition-transform duration-200 flex-shrink-0', !userMenuOpen && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
              >
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700/60 transition-colors"
                >
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 bg-gray-900 border-r border-gray-800 z-50 flex flex-col lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 w-full">
        <header className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Icon name="lock" size={13} className="text-white" weight={400} fill />
            </div>
            <span className="font-bold text-white">PromptVault</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="overflow-x-hidden w-full min-w-0 lg:pt-0 pt-14 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 flex"
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
                  active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300',
                )}
              >
                <motion.div
                  animate={active ? { scale: 1.15 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  <Icon name={item.icon} size={22} fill={active} />
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
