import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { GameCard, type BrowseResult } from './games';

export function HomePage() {
  const { t } = useTranslation();
  const [backend, setBackend] = useState<string>('…');
  const [newest, setNewest] = useState<BrowseResult | null>(null);

  useEffect(() => {
    apiGet<{ status: string }>('/api/v1/health')
      .then((h) => setBackend(h.status))
      .catch(() => setBackend('unreachable (start backend :4000)'));
    apiGet<BrowseResult>('/api/v1/games?sort=newest&pageSize=6')
      .then(setNewest)
      .catch(() => setNewest({ data: [], page: 1, pageSize: 6, total: 0 }));
  }, []);

  return (
    <section className="grid gap-8">
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

      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold">{t('home.newest')}</h2>
          <Link to="/browse" className="text-sm underline opacity-70">{t('home.viewAll')}</Link>
        </div>
        {newest && newest.data.length === 0 && (
          <p className="surface mt-3 p-6 text-sm opacity-60">{t('home.empty')}</p>
        )}
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newest?.data.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
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
