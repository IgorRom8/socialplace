'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User } from '@/entities/user/model/types';
import { apiRequest } from '@/shared/api/http';

type AppSidebarProps = {
  active: 'feed' | 'notifications' | 'connections' | 'profile' | 'auth' | 'other';
};

export function AppSidebar({ active }: AppSidebarProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
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

  return (
    <aside className="vkNav" aria-label="Меню">
      <nav className="vkNavList">
        <Link className={`vkNavItem ${active === 'feed' ? 'vkNavItemActive' : ''}`} href="/">
          Новости
        </Link>
        {user && (
          <Link
            className={`vkNavItem ${active === 'notifications' ? 'vkNavItemActive' : ''}`}
            href="/notifications"
          >
            Уведомления
          </Link>
        )}
        {user && (
          <Link
            className={`vkNavItem ${active === 'connections' ? 'vkNavItemActive' : ''}`}
            href="/connections"
          >
            Друзья и чаты
          </Link>
        )}
        {user && (
          <Link className={`vkNavItem ${active === 'profile' ? 'vkNavItemActive' : ''}`} href="/profile">
            Моя страница
          </Link>
        )}
        {!user && (
          <Link className={`vkNavItem ${active === 'auth' ? 'vkNavItemActive' : ''}`} href="/auth">
            Войти
          </Link>
        )}
      </nav>
    </aside>
  );
}
