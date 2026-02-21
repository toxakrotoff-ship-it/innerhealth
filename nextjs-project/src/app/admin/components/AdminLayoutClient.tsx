'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ProfileMenu from './ProfileMenu';
import AdminNav from './AdminNav';
import type { Session } from 'next-auth';

export default function AdminLayoutClient({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isSidebarOpen]);

  return (
    <div
      className={`admin-layout${isSidebarOpen ? ' admin-sidebar-open' : ''}`}
      data-sidebar-open={isSidebarOpen}
    >
      <aside className="admin-sidebar" aria-hidden={!isSidebarOpen}>
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">
            <span className="text-white font-bold text-lg tracking-tight">IH</span>
          </div>
          <span className="admin-sidebar-title">Inner Health</span>
          <span className="admin-sidebar-subtitle">Админ-панель</span>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Закрыть меню"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          <AdminNav />
        </nav>
        <div className="admin-sidebar-profile">
          <ProfileMenu
            userName={session.user?.name}
            userEmail={session.user?.email}
            userRole={session.user?.role}
            lastLogin={session.user?.lastLogin}
            triggerLabel="Профиль"
          />
        </div>
      </aside>

      <div
        className="admin-sidebar-backdrop"
        aria-hidden={!isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
        role="button"
        tabIndex={-1}
        aria-label="Закрыть меню"
      />

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-inner">
            <button
              type="button"
              className="admin-header-mobile-menu"
              aria-label="Открыть меню"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="admin-header-spacer" />
            <div className="admin-header-profile">
              <ProfileMenu
                userName={session.user?.name}
                userEmail={session.user?.email}
                userRole={session.user?.role}
                lastLogin={session.user?.lastLogin}
              />
            </div>
          </div>
        </header>

        <main className="admin-content-wrapper">
          {children}
        </main>
      </div>
    </div>
  );
}
