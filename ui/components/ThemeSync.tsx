'use client';

import { useEffect } from 'react';

export default function ThemeSync() {
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('theme');
    const stored = sessionStorage.getItem('omniflow-plugin-theme');
    const theme = param ?? stored;
    if (param) sessionStorage.setItem('omniflow-plugin-theme', param);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  return null;
}