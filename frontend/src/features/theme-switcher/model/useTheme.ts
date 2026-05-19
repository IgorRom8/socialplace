'use client';

import { useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

/** Same on server and first client render — localStorage is applied after mount. */
const SSR_THEME: Theme = 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(SSR_THEME);
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      const saved = localStorage.getItem('theme');
      const next = saved === 'light' || saved === 'dark' ? saved : SSR_THEME;
      document.documentElement.dataset.theme = next;
      document.body.dataset.theme = next;
      localStorage.setItem('theme', next);
      if (next !== theme) {
        setTheme(next);
      }
      return;
    }
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return { theme, toggleTheme };
}
