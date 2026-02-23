'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';

interface ProfileMenuProps {
  userName: string | undefined;
  userEmail: string | undefined;
  userRole?: string;
  lastLogin?: string;
  /** Если задано, в кнопке показывается только эта подпись (например «Профиль») */
  triggerLabel?: string;
}

export default function ProfileMenu({ userName, userEmail, userRole, triggerLabel }: ProfileMenuProps) {
  const base = useAdminBasePath();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = userName?.charAt(0).toUpperCase() || 'U';
  const roleLabel = userRole === 'ADMIN' ? 'Администратор' : userRole === 'WRITER' ? 'Редактор' : 'Пользователь';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="profile-menu-trigger"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="profile-menu-avatar">{initial}</span>
        <span className="profile-menu-label">
          {triggerLabel ? (
            <span className="profile-menu-label-name">{triggerLabel}</span>
          ) : (
            <>
              <span className="profile-menu-label-name">{userName}</span>
              <span className="profile-menu-label-role">{roleLabel}</span>
            </>
          )}
        </span>
        <svg className="profile-menu-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="profile-menu-dropdown" role="menu">
          <div className="profile-menu-user">
            <span className="profile-menu-user-avatar">{initial}</span>
            <div className="profile-menu-user-info">
              <div className="profile-menu-user-name">{userName}</div>
              <div className="profile-menu-user-email">{userEmail}</div>
              <span className="profile-menu-user-role">{roleLabel}</span>
            </div>
          </div>

          <div className="profile-menu-section">
            <div className="profile-menu-section-title">Профиль</div>
            <Link href={`/${base}/profile`} className="profile-menu-item" role="menuitem" onClick={() => setIsOpen(false)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Редактировать профиль
            </Link>
          </div>

          <div className="profile-menu-section">
            <div className="profile-menu-section-title">Система</div>
            <button
              type="button"
              className="profile-menu-item logout"
              onClick={() => signOut()}
              role="menuitem"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h3.5a3 3 0 013 3v1" />
              </svg>
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
