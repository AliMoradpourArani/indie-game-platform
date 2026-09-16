import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { Dropdown, Stars, useErrorPopup } from '../design/ui';
import { useAuth } from './auth';
import { Empty, Loading } from '../design/states';
import { SimilarGames, trackEvent } from './recommendations';

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
  const coverUrl = game.coverKey?.startsWith('http') || game.coverKey?.startsWith('/')
    ? game.coverKey
    : null;

  return (
    <Link to={`/games/${game.slug}`} className="surface block overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="flex h-36 items-center justify-center overflow-hidden" style={{ background: 'var(--bg-sunken)' }}>
        {coverUrl ? (
          <img src={coverUrl} alt={game.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl opacity-50">◈</span>
        )}
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
        <Dropdown
          label={t('browse.allGenres')}
          value={genre}
          onChange={(v) => set('genre', v)}
          options={[{ value: '', label: t('browse.allGenres') }, ...genreList.map((g) => ({ value: g, label: g }))]}
        />
        <Dropdown
          label={t('browse.newest')}
          value={sort}
          onChange={(v) => set('sort', v)}
          options={[
            { value: 'newest', label: t('browse.newest') },
            { value: 'title', label: t('browse.byTitle') },
          ]}
        />
      </div>
      {!result && <Loading />}
      {result && result.data.length === 0 && <Empty title={t('browse.empty')} />}
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
  coverKey?: string | null;
  versions: { id: string; version: string; changelog: string; requirements: Record<string, string> | null; builds: { id: string; platform: string; demo: boolean }[] }[];
  media: { id: string; kind: string; storageKey: string }[];
  developer: { id: string; profile?: { displayName: string } | null; developerProfile?: { studioName: string; verified: boolean } | null };
  purchaseCount?: number;
  demoPlays?: number;
  ratingAverage?: number;
  ratingCount?: number;
  comments?: { id: string; body: string; createdAt: string; author: string }[];
}

interface StoredComment {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}

function localComments(gameId: string): StoredComment[] {
  try {
    return JSON.parse(localStorage.getItem(`comments:${gameId}`) ?? '[]') as StoredComment[];
  } catch {
    return [];
  }
}

function localRatings(gameId: string): { average: number; count: number } {
  try {
    return JSON.parse(localStorage.getItem(`ratings:${gameId}`) ?? '{"average":4.2,"count":13}');
  } catch {
    return { average: 4.2, count: 13 };
  }
}

export function GamePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const popup = useErrorPopup();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState<StoredComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [rating, setRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<GameDetail>(`/api/v1/games/${slug}`)
      .then((g) => {
        setGame(g);
        // API-first, localStorage fallback so the page works even without DB.
        setComments(g.comments ?? localComments(g.id));
        setRating({
          average: g.ratingAverage ?? localRatings(g.id).average,
          count: g.ratingCount ?? localRatings(g.id).count,
        });
        void apiGet<StoredComment[]>(`/api/v1/games/${g.id}/comments`).then(setComments).catch(() => undefined);
        void apiGet<{ average: number; count: number }>(`/api/v1/games/${g.id}/ratings`)
          .then(setRating)
          .catch(() => undefined);
      })
      .catch(() => setMissing(true));
  }, [slug]);

  async function downloadDemo(buildId: string) {
    if (!game || !token) {
      navigate('/login', { replace: true });
      return;
    }
    setBusy(true);
    try {
      const res = await apiGet<{ url: string }>(`/api/v1/library/${game.id}/download/${buildId}`, token);
      trackEvent('DEMO_DOWNLOADED', game.id);
      window.location.href = res.url;
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!game || !commentBody.trim()) return;
    if (!user || !token) {
      navigate('/login', { replace: true });
      return;
    }
    const entry: StoredComment = {
      id: crypto.randomUUID(),
      body: commentBody.trim(),
      createdAt: new Date().toISOString(),
      author: user.profile?.displayName ?? user.email,
    };
    try {
      const created = await apiPost<StoredComment>(`/api/v1/games/${game.id}/comments`, { body: entry.body }, token);
      setComments((c) => [created, ...c]);
    } catch {
      // Offline fallback: keep the comment locally.
      const next = [entry, ...localComments(game.id)];
      localStorage.setItem(`comments:${game.id}`, JSON.stringify(next));
      setComments(next);
    }
    setCommentBody('');
  }

  async function rate(stars: number) {
    if (!game) return;
    if (!user || !token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const res = await apiPost<{ average: number; count: number }>(`/api/v1/games/${game.id}/ratings`, { stars }, token);
      setRating(res);
    } catch {
      const prev = localRatings(game.id);
      const next = { average: (prev.average * prev.count + stars) / (prev.count + 1), count: prev.count + 1 };
      localStorage.setItem(`ratings:${game.id}`, JSON.stringify(next));
      setRating(next);
    }
  }

  if (missing) return <Empty title={t('browse.notFound')} />;
  if (!game) return <Loading />;

  const latest = game.versions[0];
  const studio = game.developer.developerProfile?.studioName ?? game.developer.profile?.displayName;
  const demoBuild = game.versions.flatMap((v) => v.builds).find((b) => b.demo);
  const screenshots = game.media.filter((m) => m.kind === 'SCREENSHOT' || m.kind === 'COVER');

  const coverMedia = game.media.find((m) => m.kind === 'COVER');
  const coverUrl = game.coverKey?.startsWith('http') || game.coverKey?.startsWith('/')
    ? game.coverKey
    : coverMedia
      ? (coverMedia.storageKey?.startsWith('http') ? coverMedia.storageKey : `/api/v1/games/${game.slug}/media/${coverMedia.id}`)
      : null;

  return (
    <article className="grid gap-6">
      <div className="surface overflow-hidden">
        <div className="flex h-64 sm:h-80 items-center justify-center overflow-hidden relative" style={{ background: 'var(--bg-sunken)' }}>
          {coverUrl ? (
            <img src={coverUrl} alt={game.title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-6xl opacity-50">◈</span>
          )}
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-xs opacity-60">{game.genre} · v{latest?.version ?? '—'}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{game.title}</h1>
          {studio && (
            <Link to={`/developers/${game.developer.id}`} className="mt-1 inline-block text-sm underline opacity-70">
              {studio} {game.developer.developerProfile?.verified && '✓'}
            </Link>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <Stars value={rating.average} count={rating.count} ariaLabel={t('game.averageRating')} />
            <span className="text-xs opacity-60">
              {(game.purchaseCount ?? 0)} {t('game.purchases')} · {(game.demoPlays ?? 0)} {t('game.demoPlays')}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <strong className="text-xl">{priceLabel(game.priceCents, t)}</strong>
            {demoBuild && (
              <button type="button" disabled={busy} onClick={() => downloadDemo(demoBuild.id)} className="surface px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                {t('game.demo')}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => navigate(`/purchase/${game.slug}`)} className="btn-accent px-5 py-2.5 text-sm disabled:opacity-50">
              {game.priceCents === 0 ? t('game.claim') : t('game.buyNow')}
            </button>
          </div>
          <p className="mt-2 text-xs opacity-60">{t('game.purchaseHint')}</p>
        </div>
      </div>

      <section>
        <h2 className="font-bold">{t('game.screenshots')}</h2>
        {screenshots.length === 0 && <p className="surface mt-2 p-4 text-sm opacity-60">{t('game.media')}</p>}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {screenshots.map((m, i) => {
            const src = m.storageKey?.startsWith('http') ? m.storageKey : `/api/v1/games/${game.slug}/media/${m.id}`;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setLightbox(src)}
                className="surface overflow-hidden text-start group transition-transform hover:-translate-y-0.5"
                aria-label={`${t('game.screenshots')} ${i + 1}`}
              >
                <img
                  src={src}
                  alt={`${game.title} ${i + 1}`}
                  loading="lazy"
                  className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="block px-2 py-1 text-xs opacity-60">{m.kind}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="font-bold">{t('game.description')}</h2>
        <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-relaxed opacity-90">{game.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <span key={tag} className="surface px-2 py-0.5 text-xs">#{tag}</span>
          ))}
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="font-bold">{t('game.rateTitle')}</h2>
        {user ? (
          <div className="mt-2">
            <Stars value={rating.average} onRate={rate} ariaLabel={t('game.rateTitle')} />
          </div>
        ) : (
          <p className="mt-2 text-sm opacity-60">{t('game.rateLogin')}</p>
        )}
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="font-bold">{t('game.comments')} ({comments.length})</h2>
        {user ? (
          <form onSubmit={postComment} className="mt-3 grid gap-2">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t('game.commentPlaceholder')}
              className="surface px-3 py-2 text-sm"
            />
            <button type="submit" disabled={!commentBody.trim()} className="btn-accent w-fit px-4 py-2 text-sm disabled:opacity-50">
              {t('game.commentSubmit')}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm opacity-60">{t('game.commentLogin')}</p>
        )}
        <ul className="mt-4 grid gap-2">
          {comments.map((c) => (
            <li key={c.id} className="surface px-3 py-2 text-sm">
              <p className="text-xs opacity-60">{c.author} · {new Date(c.createdAt).toLocaleString()}</p>
              <p className="mt-1 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

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

      <SimilarGames slug={game.slug} gameId={game.id} />

      {lightbox && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt={game.title} className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
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

export function LibraryPage() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<{ id: string; game: CardGame }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (token) void apiGet<{ id: string; game: CardGame }[]>('/api/v1/library', token).then(setItems);
  }, [user, token, navigate]);

  async function download(gameId: string, buildId: string) {
    if (!token) return;
    setBusy(buildId);
    try {
      const res = await apiGet<{ url: string }>(`/api/v1/library/${gameId}/download/${buildId}`, token);
      window.location.href = res.url;
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-extrabold">{t('library.title')}</h1>
      {items.length === 0 && <Empty title={t('library.empty')} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <div key={e.id} className="surface p-4">
            <Link to={`/games/${e.game.slug}`} className="font-bold hover:underline">{e.game.title}</Link>
            <p className="text-xs opacity-60">{e.game.genre}</p>
            <GameBuildButtons gameId={e.game.id} slug={e.game.slug} busy={busy} onDownload={download} />
          </div>
        ))}
      </div>
    </div>
  );
}

function GameBuildButtons({ gameId, slug, busy, onDownload }: { gameId: string; slug: string; busy: string | null; onDownload: (gameId: string, buildId: string) => void }) {
  const { t } = useTranslation();
  const [builds, setBuilds] = useState<{ id: string; platform: string; demo: boolean }[]>([]);

  useEffect(() => {
    void apiGet<{ versions: { builds: { id: string; platform: string; demo: boolean }[] }[] }>(`/api/v1/games/${slug}`)
      .then((g) => setBuilds(g.versions.flatMap((v) => v.builds).filter((b) => !b.demo)))
      .catch(() => setBuilds([]));
  }, [slug]);

  if (builds.length === 0) return null;
  return (
    <div className="mt-3 grid gap-1.5">
      {builds.map((b) => (
        <button key={b.id} type="button" disabled={busy === b.id} onClick={() => onDownload(gameId, b.id)}
          className="surface px-3 py-1.5 text-xs disabled:opacity-50">
          {busy === b.id ? '…' : `${t('library.download')} · ${b.platform}`}
        </button>
      ))}
    </div>
  );
}
