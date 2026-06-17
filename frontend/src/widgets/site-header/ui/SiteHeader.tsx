'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminMode } from '@/features/admin/model/useAdminMode';
import { useTheme } from '@/features/theme-switcher/model/useTheme';
import { clearAdminToken } from '@/shared/lib/adminSession';
import { HeaderUserSearch } from '@/widgets/user-search/ui/HeaderUserSearch';

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const isAdmin = useAdminMode();
  const router = useRouter();

  function logoutAdmin() {
    clearAdminToken();
    router.push('/');
  }

  return (
    <header className={`vkTopBar${isAdmin ? ' vkTopBar--moderation' : ''}`}>
      <Link href="/" className="vkBrand" title="Tent">
        <Image
          src="/tent-logo.png"
          alt=""
          width={44}
          height={44}
          className="vkBrandLogo"
          priority
        />
        <span className="vkBrandName">Tent</span>
      </Link>
      <div className="topbarSearchSlot vkTopSearch">
        <HeaderUserSearch />
      </div>
      <div className="topbarActions vkTopActions">
        {isAdmin && (
          <div className="adminTopbarGroup">
            <span className="adminModeBadge">Модерация</span>
            <button type="button" className="ghost adminModeExit" onClick={logoutAdmin}>
              Выйти
            </button>
          </div>
        )}
        <button className="themeButton vkThemeBtn" type="button" onClick={toggleTheme}>
          {theme === 'light' ? 'Тёмная' : 'Светлая'}
        </button>
      </div>
    </header>
  );
}
