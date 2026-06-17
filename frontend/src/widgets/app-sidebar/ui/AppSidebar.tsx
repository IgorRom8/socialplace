'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { User } from '@/entities/user/model/types';
import { useAdminMode } from '@/features/admin/model/useAdminMode';
import { apiRequest } from '@/shared/api/http';
import { SOCIAL_AUTH_SESSION_BUMP } from '@/shared/lib/authSession';
import { ADMIN_SESSION_BUMP } from '@/shared/lib/adminSession';

type AppSidebarProps = {
  active: 'feed' | 'notifications' | 'connections' | 'profile' | 'auth' | 'admin' | 'other';
};

export function AppSidebar({ active }: AppSidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = useAdminMode();
  const pathname = usePathname();
  const onAdminLoginPage = pathname === '/admin';

  const loadUser = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }

    apiRequest<User>(`/social/me?token=${token}`)
      .then((me) => setUser(me))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      });
  }, []);

  useEffect(() => {
    loadUser();
    window.addEventListener(SOCIAL_AUTH_SESSION_BUMP, loadUser);
    window.addEventListener(ADMIN_SESSION_BUMP, loadUser);
    window.addEventListener('storage', loadUser);
    return () => {
      window.removeEventListener(SOCIAL_AUTH_SESSION_BUMP, loadUser);
      window.removeEventListener(ADMIN_SESSION_BUMP, loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, [loadUser]);

  const showUserNav = Boolean(user);
  const showLogin = !user && !isAdmin && !onAdminLoginPage;

  return (
    <aside className={`vkNav${isAdmin ? ' vkNav--moderation' : ''}`} aria-label="Меню">
      <nav className="vkNavList">
        <Link className={`vkNavItem ${active === 'feed' ? 'vkNavItemActive' : ''}`} href="/">
          Новости
        </Link>
        {showUserNav && (
          <Link
            className={`vkNavItem ${active === 'notifications' ? 'vkNavItemActive' : ''}`}
            href="/notifications"
          >
            Уведомления
          </Link>
        )}
        {showUserNav && (
          <Link
            className={`vkNavItem ${active === 'connections' ? 'vkNavItemActive' : ''}`}
            href="/connections"
          >
            Друзья и чаты
          </Link>
        )}
        {showUserNav && (
          <Link
            className={`vkNavItem ${active === 'profile' ? 'vkNavItemActive' : ''}`}
            href="/profile"
          >
            Моя страница
          </Link>
        )}
        {showLogin && (
          <Link className={`vkNavItem ${active === 'auth' ? 'vkNavItemActive' : ''}`} href="/auth">
            Войти
          </Link>
        )}
      </nav>

      {isAdmin && (
        <div className="vkNavModerationBox">
          <p className="vkNavModerationTitle">Режим модерации</p>
          <p className="vkNavModerationText">
            Удаление постов и комментариев, блокировка пользователей на странице профиля.
          </p>
        </div>
      )}

      {onAdminLoginPage && !isAdmin && (
        <div className="vkNavModerationBox vkNavModerationBox--login">
          <p className="vkNavModerationTitle">Администратор</p>
          <p className="vkNavModerationText">
            После входа откроется обычный сайт с инструментами модерации.
          </p>
        </div>
      )}
    </aside>
  );
}
