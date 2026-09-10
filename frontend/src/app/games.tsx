import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiGet } from '../lib/api';

export interface CardGame {
  id: string;
  slug: string;
  title: string;
  genre: string;
  tags: string[];
  priceCents: number;
  currency: string;
  coverKey: string | null;
  developer?: { developerProfile?: { studioName: string } | null; profile?: { displayName: string } | null } | null;
}

export interface BrowseResult {
  data: CardGame[];
  page: number;
  pageSize: number;
  total: number;
}

export function priceLabel(priceCents: number, t: (k: string) => string): string {
  if (priceCents === 0) return t('browse.free');
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function GameCard({ game }: { game: CardGame }) {
  const { t } = useTranslation();
  const studio = game.developer?.developerProfile?.studioName ?? game.developer?.profile?.displayName;
  return (
    <Link to={`/games/${game.slug}`} className="surface block overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="flex h-32 items-center justify-center text-4xl" style={{ background: 'var(--bg-sunken)' }}>
        ◈
      </div>
      <div className="p-4">
        <h3 className="truncate font-bold">{game.title}</h3>
        {studio && <p className="truncate text-xs opacity-60">{studio}</p>}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="surface px-2 py-0.5">{game.genre}</span>
          <strong>{priceLabel(game.priceCents, t)}</strong>
        </div>
      </div>
    </Link>
  );
}

export function BrowsePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<BrowseResult | null>(null);
  const [genreList, setGenreList] = useState<string[]>([]);

  const search = params.get('search') ?? '';
  const genre = params.get('genre') ?? '';
  const sort = params.get('sort') ?? 'newest';

  useEffect(() => {
    const q = new URLSearchParams({ sort });
    if (search) q.set('search', search);
    if (genre) q.set('genre', genre);
    void apiGet<BrowseResult>(`/api/v1/games?${q}`).then(setResult);
  }, [search, genre, sort]);

  useEffect(() => {
    void apiGet<string[]>('/api/v1/genres').then(setGenreList);
  }, []);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-extrabold">{t('browse.title')}</h1>
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => set('search', e.target.value)} placeholder={t('browse.search')}
          className="surface min-w-52 flex-1 px-3 py-2 text-sm" />
        <select value={genre} onChange={(e) => set('genre', e.target.value)} className="surface px-3 py-2 text-sm">
          <option value="">{t('browse.allGenres')}</option>
          {genreList.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => set('sort', e.target.value)} className="surface px-3 py-2 text-sm">
          <option value="newest">{t('browse.newest')}</option>
          <option value="title">{t('browse.byTitle')}</option>
        </select>
      </div>
      {!result && <p className="text-sm opacity-60">…</p>}
      {result && result.data.length === 0 && (
        <div className="surface p-8 text-center text-sm opacity-70">{t('browse.empty')}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result?.data.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      {result && result.total > 0 && (
        <p className="text-xs opacity-60">{result.total} {t('browse.results')}</p>
      )}
    </div>
  );
}

interface GameDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  genre: string;
  tags: string[];
  priceCents: number;
  currency: string;
  versions: { id: string; version: string; changelog: string; requirements: Record<string, string> | null; builds: { id: string; platform: string; demo: boolean }[] }[];
  media: { id: string; kind: string; storageKey: string }[];
  developer: { id: string; profile?: { displayName: string } | null; developerProfile?: { studioName: string; verified: boolean } | null };
}

export function GamePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void apiGet<GameDetail>(`/api/v1/games/${slug}`)
      .then(setGame)
      .catch(() => setMissing(true));
  }, [slug]);

  if (missing) return <p className="surface mx-auto max-w-xl p-8 text-center text-sm">{t('browse.notFound')}</p>;
  if (!game) return <p className="text-sm opacity-60">…</p>;

  const latest = game.versions[0];
  const studio = game.developer.developerProfile?.studioName ?? game.developer.profile?.displayName;
  const hasDemo = game.versions.some((v) => v.builds.some((b) => b.demo));

  return (
    <article className="grid gap-6">
      <div className="surface overflow-hidden">
        <div className="flex h-56 items-center justify-center text-6xl" style={{ background: 'var(--bg-sunken)' }}>◈</div>
        <div className="p-6 sm:p-8">
          <p className="text-xs opacity-60">{game.genre} · v{latest?.version ?? '—'}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{game.title}</h1>
          {studio && (
            <Link to={`/developers/${game.developer.id}`} className="mt-1 inline-block text-sm underline opacity-70">
              {studio} {game.developer.developerProfile?.verified && '✓'}
            </Link>
          )}
          <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed opacity-90">{game.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span key={tag} className="surface px-2 py-0.5 text-xs">#{tag}</span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <strong className="text-xl">{priceLabel(game.priceCents, t)}</strong>
            {hasDemo && <button type="button" className="surface px-5 py-2.5 text-sm font-semibold">{t('game.demo')}</button>}
            <button type="button" className="btn-accent px-5 py-2.5 text-sm">{t('game.buy')}</button>
          </div>
          <p className="mt-2 text-xs opacity-60">{t('game.purchaseHint')}</p>
        </div>
      </div>

      {game.media.length > 0 && (
        <section>
          <h2 className="font-bold">{t('game.media')}</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {game.media.map((m) => (
              <div key={m.id} className="surface flex h-24 items-center justify-center text-xs opacity-60">{m.kind}</div>
            ))}
          </div>
        </section>
      )}

      {latest?.requirements && (
        <section className="surface p-5">
          <h2 className="font-bold">{t('game.requirements')}</h2>
          <dl className="mt-2 grid gap-1 text-sm">
            {Object.entries(latest.requirements).map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="opacity-60">{k}:</dt><dd>{String(v)}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {game.versions.length > 1 && (
        <section className="surface p-5">
          <h2 className="font-bold">{t('game.versions')}</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {game.versions.map((v) => (
              <li key={v.id}>v{v.version} — <span className="opacity-60">{v.changelog}</span></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

interface DevProfile {
  id: string;
  profile: { displayName: string; bio: string | null } | null;
  developerProfile: { studioName: string; website: string | null; verified: boolean };
  games: CardGame[];
}

export function DeveloperPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [dev, setDev] = useState<DevProfile | null>(null);

  useEffect(() => {
    void apiGet<DevProfile>(`/api/v1/developers/${id}`).then(setDev).catch(() => setDev(null));
  }, [id]);

  if (dev === null) return <p className="text-sm opacity-60">…</p>;

  return (
    <div className="grid gap-5">
      <div className="surface p-6">
        <h1 className="text-2xl font-extrabold">{dev.developerProfile.studioName} {dev.developerProfile.verified && '✓'}</h1>
        {dev.profile?.bio && <p className="mt-2 max-w-2xl text-sm opacity-80">{dev.profile.bio}</p>}
        {dev.developerProfile.website && (
          <a href={dev.developerProfile.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline opacity-70">
            {dev.developerProfile.website}
          </a>
        )}
      </div>
      <h2 className="font-bold">{t('browse.gamesByStudio', { count: dev.games.length })}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dev.games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}
