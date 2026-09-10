import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';

export function HomePage() {
  const { t } = useTranslation();
  const [backend, setBackend] = useState<string>('…');

  useEffect(() => {
    apiGet<{ status: string }>('/api/v1/health')
      .then((h) => setBackend(h.status))
      .catch(() => setBackend('unreachable (start backend :4000)'));
  }, []);

  return (
    <section className="grid gap-6">
      <div className="surface p-8 sm:p-12">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">{t('hero.title')}</h1>
        <p className="mt-3 max-w-xl text-base opacity-70">{t('hero.subtitle')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/browse" className="btn-accent px-5 py-2.5 text-sm">{t('hero.cta')}</Link>
          <span className="surface px-4 py-2.5 text-sm opacity-80">
            {t('health.backend')}: <strong>{backend}</strong>
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {['featured', 'newest', 'popular'].map((slot) => (
          <div key={slot} className="surface p-5">
            <h2 className="font-bold capitalize">{slot}</h2>
            <p className="mt-1 text-sm opacity-60">{t('placeholder.body')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlaceholderPage({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <section className="surface mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold">{name} — {t('placeholder.title')}</h1>
      <p className="mt-2 text-sm opacity-70">{t('placeholder.body')}</p>
    </section>
  );
}

export function AdminLoginPage() {
  const { t } = useTranslation();
  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-bold">{t('admin.loginTitle')}</h1>
      <form className="mt-4 grid gap-3" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1 text-sm">
          {t('admin.email')}
          <input type="email" required className="surface px-3 py-2" placeholder="admin@local.test" />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.password')}
          <input type="password" required className="surface px-3 py-2" />
        </label>
        <button type="submit" className="btn-accent px-4 py-2 text-sm">{t('admin.submit')}</button>
      </form>
      <p className="mt-3 text-xs opacity-60">{t('placeholder.body')}</p>
    </section>
  );
}
