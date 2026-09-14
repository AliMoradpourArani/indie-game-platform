import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    // Smooth cross-fade so the switch is never abrupt.
    root.classList.add('theme-anim');
    root.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const t = window.setTimeout(() => root.classList.remove('theme-anim'), 500);
    return () => window.clearTimeout(t);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
