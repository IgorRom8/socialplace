'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '@/features/theme-switcher/model/useTheme';
import { HeaderUserSearch } from '@/widgets/user-search/ui/HeaderUserSearch';

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="vkTopBar">
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
        <button className="themeButton vkThemeBtn" type="button" onClick={toggleTheme}>
          {theme === 'light' ? 'Тёмная' : 'Светлая'}
        </button>
      </div>
    </header>
  );
}
