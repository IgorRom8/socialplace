'use client';

import Link from 'next/link';
import { useTheme } from '@/features/theme-switcher/model/useTheme';
import { HeaderUserSearch } from '@/widgets/user-search/ui/HeaderUserSearch';

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="vkTopBar">
      <Link href="/" className="vkLogo" title="Social Place">
        SP
      </Link>
      <div className="topbarSearchSlot vkTopSearch">
        <HeaderUserSearch />
      </div>
      <div className="topbarActions vkTopActions">
        <button className="themeButton vkThemeBtn" type="button" onClick={toggleTheme}>
          {theme === 'light' ? 'Тёмная' : 'Светлая'}
        </button>
      </div>
    </header>
  );
}
