import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { applyLocale, type Locale } from '../i18n/config';
import { useAuth } from './auth';
import { useTheme } from './useTheme';

function Controls() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const [locale, setLocale] = useState<Locale>((i18n.language as Locale) ?? 'en');

  const switchLocale = (next: Locale) => {
    setLocale(next);
    void i18n.changeLanguage(next);
    applyLocale(next);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="locale">{t('lang.label')}</label>
      <select
        id="locale"
        value={locale}
        onChange={(e) => switchLocale(e.target.value as Locale)}
        className="surface px-2 py-1 text-sm"
      >
        <option value="en">English</option>
        <option value="fa">فارسی</option>
      </select>
      <button onClick={toggle} className="surface px-3 py-1 text-sm" type="button">
        {theme === 'dark' ? t('theme.light') : t('theme.dark')}
      </button>
    </div>
  );
}

export function PublicLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link to="/" className="text-base font-bold">◈ Indie</Link>
          <Link to="/">{t('nav.home')}</Link>
          <Link to="/browse">{t('nav.browse')}</Link>
          {user && <Link to="/library">{t('nav.library')}</Link>}
          {user?.role === 'DEVELOPER' && <Link to="/developer">{t('nav.dashboard')}</Link>}
          {!user && <Link to="/login">{t('nav.login')}</Link>}
          {user && (
            <button type="button" onClick={logout} className="opacity-70 hover:opacity-100">
              {t('nav.logout')} ({user.profile?.displayName ?? user.email})
            </button>
          )}
        </nav>
        <Controls />
      </header>
      <main className="flex-1 py-6">
        <Outlet />
      </main>
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t py-6 text-sm opacity-80" style={{ borderColor: 'var(--line)' }}>
        <span>{t('footer.copyright')}</span>
        <Link to="/about">{t('footer.about')}</Link>
        <Link to="/rules">{t('footer.rules')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
        <Link to="/terms">{t('footer.terms')}</Link>
        <span className="ms-auto" />
        <Link to="/admin/login" className="opacity-60 hover:opacity-100">{t('footer.admin')}</Link>
      </footer>
    </div>
  );
}

export function AdminLayout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <Link to="/admin/login" className="font-bold">◈ {t('footer.admin')}</Link>
        <Controls />
      </header>
      <main className="flex-1 py-6">
        <Outlet />
      </main>
    </div>
  );
}
