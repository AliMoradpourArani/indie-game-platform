import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { ApiError, apiGet, apiPost } from '../lib/api';

export interface GameSummary {
  id: string;
  slug: string;
  title: string;
  genre: string;
  priceCents: number;
  versions: { id: string; version: string }[];
  submissions: { state: string }[];
}

function stateLabel(state: string | undefined, t: (k: string) => string): string {
  if (!state) return t('dev.stateDraft');
  const key = `dev.state${state.charAt(0)}${state.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`;
  try {
    return t(key);
  } catch {
    return state;
  }
}

export function DeveloperDashboard() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', genre: '', priceCents: 0 });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setGames(await apiGet<GameSummary[]>('/api/v1/developer/games', token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'DEVELOPER' && user.role !== 'ADMIN') {
      navigate('/', { replace: true });
      return;
    }
    void load();
  }, [user, navigate, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const game = await apiPost<GameSummary>('/api/v1/developer/games', { ...form, tags: [] }, token);
      setForm({ title: '', description: '', genre: '', priceCents: 0 });
      navigate(`/developer/games/${game.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="text-2xl font-extrabold">{t('dev.myGames')}</h1>
        {loading && <p className="mt-4 text-sm opacity-60">…</p>}
        {error && <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
        {!loading && games.length === 0 && (
          <div className="surface mt-4 p-6 text-sm opacity-70">{t('dev.empty')}</div>
        )}
        <ul className="mt-4 grid gap-3">
          {games.map((g) => (
            <li key={g.id} className="surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link to={`/developer/games/${g.id}`} className="font-bold hover:underline">{g.title}</Link>
                <p className="text-xs opacity-60">
                  {g.genre} · {g.versions.length} {t('dev.versions')} · {(g.priceCents / 100).toFixed(2)}
                </p>
              </div>
              <span className="surface px-2 py-1 text-xs">{stateLabel(g.submissions[0]?.state, t)}</span>
            </li>
          ))}
        </ul>
      </section>
      <aside className="surface h-fit p-5">
        <h2 className="font-bold">{t('dev.createGame')}</h2>
        <form className="mt-3 grid gap-2" onSubmit={create}>
          <input required minLength={2} placeholder={t('dev.title')} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} className="surface px-3 py-2 text-sm" />
          <textarea required minLength={10} placeholder={t('dev.description')} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} className="surface px-3 py-2 text-sm" rows={4} />
          <input required minLength={2} placeholder={t('dev.genre')} value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })} className="surface px-3 py-2 text-sm" />
          <label className="grid gap-1 text-xs opacity-80">
            {t('dev.price')}
            <input type="number" min={0} step={1} value={form.priceCents}
              onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })} className="surface px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={creating} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">
            {creating ? '…' : t('dev.create')}
          </button>
        </form>
      </aside>
    </div>
  );
}

export function DeveloperGameDetail() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { id } = useParams();
  const [game, setGame] = useState<GameSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState({ version: '', changelog: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const games = await apiGet<GameSummary[]>('/api/v1/developer/games', token);
      setGame(games.find((g) => g.id === id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    }
  }, [token, id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id) return;
    setBusy(true);
    try {
      await apiPost(`/api/v1/developer/games/${id}/versions`, version, token);
      setVersion({ version: '', changelog: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>;
  if (!game) return <p className="text-sm opacity-60">…</p>;

  return (
    <div className="grid gap-6">
      <div>
        <Link to="/developer" className="text-sm underline opacity-70">← {t('dev.myGames')}</Link>
        <h1 className="mt-1 text-2xl font-extrabold">{game.title}</h1>
        <p className="text-sm opacity-60">{game.slug} · {stateLabel(game.submissions[0]?.state, t)}</p>
      </div>
      <section className="surface p-5">
        <h2 className="font-bold">{t('dev.versions')} ({game.versions.length})</h2>
        <ul className="mt-2 grid gap-2 text-sm">
          {game.versions.map((v) => (
            <li key={v.id} className="surface px-3 py-2">v{v.version}</li>
          ))}
        </ul>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={addVersion}>
          <input required placeholder="1.0.0" value={version.version}
            onChange={(e) => setVersion({ ...version, version: e.target.value })} className="surface px-3 py-2 text-sm" />
          <input placeholder={t('dev.changelog')} value={version.changelog}
            onChange={(e) => setVersion({ ...version, changelog: e.target.value })} className="surface flex-1 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">
            {busy ? '…' : t('dev.addVersion')}
          </button>
        </form>
        <p className="mt-3 text-xs opacity-60">{t('dev.uploadHint')}</p>
      </section>
    </div>
  );
}
