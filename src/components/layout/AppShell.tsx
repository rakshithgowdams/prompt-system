import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { Icon } from '../ui/Icon';
import { getSignedUrl } from '../../lib/storage';
import { cn, PROJECT_COLORS } from '../../lib/utils';
import type { Project } from '../../lib/database.types';

function ProjectThumb({ project }: { project: Project }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!project.cover_image) return;
    getSignedUrl(project.cover_image, 3600).then(setUrl).catch(() => {});
  }, [project.cover_image]);

  if (url) {
    return <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />;
  }
  return (
    <div className={cn(
      'w-full h-full rounded-lg bg-gradient-to-br flex items-center justify-center',
      PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray,
    )}>
      <Icon name="photo" size={13} className="text-white/60" />
    </div>
  );
}

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close sidebar on route change
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
            {projects.map((project) => {
              const promptsActive =
                location.pathname === `/projects/${project.slug}` ||
                (location.pathname.startsWith(`/projects/${project.slug}`) &&
                  !location.pathname.includes('/files'));
              const filesActive = location.pathname.startsWith(`/projects/${project.slug}/files`);
              return (
                <div key={project.id} className="space-y-0.5">
                  <Link
                    to={`/projects/${project.slug}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      promptsActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                    )}
                  >
                    <div className="w-6 h-6 flex-shrink-0 overflow-hidden rounded-lg">
                      <ProjectThumb project={project} />
                    </div>
                    <span className="truncate flex-1">{project.name}</span>
                  </Link>
                  <Link
                    to={`/projects/${project.slug}/files`}
                    className={cn(
                      'flex items-center gap-3 pl-10 pr-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                      filesActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60',
                    )}
                  >
                    <Icon name="folder_open" size={14} fill={filesActive} />
                    <span>Files</span>
                  </Link>
                </div>
              );
            })}
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
      {/* Desktop sidebar — visible at lg+ */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile / tablet sidebar overlay */}
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

      {/* Main content wrapper */}
      <div className="flex-1 lg:ml-64 min-w-0 w-full">
        {/* Mobile / tablet top header — fixed so it never scrolls away */}
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
          {/* Placeholder to balance hamburger */}
          <div className="w-9" />
        </header>

        {/* Page content
            - top padding clears the fixed header on mobile (14 = h-14)
            - bottom padding clears the fixed bottom nav on mobile (~56px + safe area)
            - on lg+ neither offset is needed since header/nav are hidden */}
        <main className="overflow-x-hidden w-full min-w-0 lg:pt-0 pt-14 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>

        {/* Mobile / tablet bottom navigation — fixed so it stays on screen while scrolling */}
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
