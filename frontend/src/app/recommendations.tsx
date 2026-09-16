import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from './auth';
import type { CardGame } from './games';

/** Fire-and-forget behavior event. Never blocks UI; never throws. */
export function trackEvent(type: string, gameId?: string, metadata?: Record<string, unknown>): void {
  const token = localStorage.getItem('token');
  if (!token) return;
  void apiPost('/api/v1/events', { type, gameId, metadata }, token).catch(() => undefined);
}

export interface RecommendationItem {
  game: CardGame;
  score: number | null;
  reason?: string;
}

interface RecommendationFeed {
  mode: 'personalized' | 'cold-start';
  strategy: string;
  items: RecommendationItem[];
}

/** Homepage "Recommended for you" — backend owns scoring; UI renders states. */
export function RecommendedForYou({ limit = 6 }: { limit?: number }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [feed, setFeed] = useState<RecommendationFeed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFeed(null);
    setFailed(false);
    apiGet<RecommendationFeed>(`/api/v1/recommendations?limit=${limit}`, token ?? undefined)
      .then(setFeed)
      .catch(() => setFailed(true));
  }, [limit, token]);

  if (failed || (feed && feed.items.length === 0)) return null;

  return (
    <section aria-labelledby="reco-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="reco-heading" className="text-xl font-extrabold">
          {feed && feed.mode === 'cold-start' ? t('reco.popularTitle') : t('reco.title')}
        </h2>
        <Link to="/browse" className="text-sm underline opacity-70">{t('home.viewAll')}</Link>
      </div>
      {!feed && <RecoSkeleton />}
      {feed && (
        <>
          {feed.mode === 'personalized' && (
            <p className="mt-1 text-xs opacity-60">{t('reco.personalizedHint')}</p>
          )}
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.items.map((item) => (
              <RecoCard key={item.game.id} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RecoCard({ item }: { item: RecommendationItem }) {
  const { t } = useTranslation();
  const studio = item.game.developer?.developerProfile?.studioName ?? item.game.developer?.profile?.displayName;
  const coverUrl = item.game.coverKey?.startsWith('http') || item.game.coverKey?.startsWith('/')
    ? item.game.coverKey
    : null;

  return (
    <Link
      to={`/games/${item.game.slug}?src=reco`}
      onClick={() => trackEvent('RECOMMENDATION_CLICKED', item.game.id)}
      className="surface block overflow-hidden transition-transform hover:-translate-y-0.5"
      aria-label={`${item.game.title}${item.reason ? ` — ${item.reason}` : ''}`}
    >
      <div className="flex h-36 items-center justify-center overflow-hidden" style={{ background: 'var(--bg-sunken)' }}>
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl opacity-50" aria-hidden="true">◈</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-bold">{item.game.title}</h3>
        {studio && <p className="truncate text-xs opacity-60">{studio}</p>}
        {item.reason && <p className="mt-1 truncate text-xs opacity-60">{item.reason}</p>}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="surface px-2 py-0.5">{item.game.genre}</span>
          <strong>{item.game.priceCents === 0 ? t('browse.free') : `$${(item.game.priceCents / 100).toFixed(2)}`}</strong>
        </div>
      </div>
    </Link>
  );
}

export function RecoSkeleton() {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="surface overflow-hidden">
          <div className="reco-shimmer h-36" />
          <div className="grid gap-2 p-4">
            <div className="reco-shimmer h-4 w-2/3 rounded" />
            <div className="reco-shimmer h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Game-detail "You might also like" — responsive, RTL-aware carousel.
 * Native overflow-x scrolling gives touch swipe + keyboard arrows for free;
 * prev/next buttons scroll by one viewport. No autoplay (stays readable).
 */
export function SimilarGames({ slug, gameId }: { slug: string; gameId: string }) {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<RecommendationItem[] | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(null);
    apiGet<{ items: RecommendationItem[] }>(`/api/v1/games/${slug}/similar?limit=10`, token ?? undefined)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [slug, token]);

  // Record the view exactly once per game page (repeat detection is server-side).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('src') === 'reco') {
      trackEvent('GAME_OPENED_FROM_RECOMMENDATION', gameId);
    } else {
      trackEvent('GAME_VIEWED', gameId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (items === null) {
    return (
      <section aria-labelledby="similar-heading">
        <h2 id="similar-heading" className="font-bold">{t('reco.similar')}</h2>
        <div className="reco-rail mt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface reco-card overflow-hidden" aria-hidden="true">
              <div className="reco-shimmer h-28" />
              <div className="reco-shimmer m-3 h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (items.length === 0) return null;

  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = i18n.dir() === 'rtl';
    el.scrollBy({ left: dir * el.clientWidth * (rtl ? -1 : 1), behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="similar-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="similar-heading" className="font-bold">{t('reco.similar')}</h2>
        <div className="flex gap-2" role="group" aria-label={t('reco.similar')}>
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="surface px-3 py-1.5 text-sm"
            aria-label={t('reco.prev')}
          >
            <span aria-hidden="true">{i18n.dir() === 'rtl' ? '→' : '←'}</span>
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="surface px-3 py-1.5 text-sm"
            aria-label={t('reco.next')}
          >
            <span aria-hidden="true">{i18n.dir() === 'rtl' ? '←' : '→'}</span>
          </button>
        </div>
      </div>
      <div ref={trackRef} className="reco-rail mt-3" role="list" tabIndex={0} aria-label={t('reco.similar')}>
        {items.map((item) => (
          <div key={item.game.id} role="listitem" className="reco-card">
            <RecoCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
