import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { useErrorPopup } from '../design/ui';
import { ApiError, apiGet, apiPost, apiUpload } from '../lib/api';

export interface GameSummary {
  id: string;
  slug: string;
  title: string;
  genre: string;
  priceCents: number;
  isArchived?: boolean;
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
  const popup = useErrorPopup();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', genre: '', priceCents: 0 });
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setGames(await apiGet<GameSummary[]>('/api/v1/developer/games', token));
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  }, [token, t, popup]);

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
    try {
      const game = await apiPost<GameSummary>('/api/v1/developer/games', { ...form, tags: [] }, token);
      setForm({ title: '', description: '', genre: '', priceCents: 0 });
      navigate(`/developer/games/${game.id}`);
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setCreating(false);
    }
  }

  async function toggleArchive(g: GameSummary) {
    if (!token) return;
    setArchiving(g.id);
    try {
      await apiPost(`/api/v1/developer/games/${g.id}/${g.isArchived ? 'unarchive' : 'archive'}`, {}, token);
      await load();
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setArchiving(null);
    }
  }

  if (!user) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="text-2xl font-extrabold">{t('dev.myGames')}</h1>
        {loading && <p className="mt-4 text-sm opacity-60">…</p>}
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
                  {g.isArchived && ` · ${t('dev.archived')}`}
                </p>
              </div>
              <span className="surface px-2 py-1 text-xs">{stateLabel(g.submissions[0]?.state, t)}</span>
              <button
                type="button"
                disabled={archiving === g.id}
                onClick={() => toggleArchive(g)}
                className="surface px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {g.isArchived ? t('dev.unarchive') : t('dev.archive')}
              </button>
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
  const popup = useErrorPopup();
  const [game, setGame] = useState<GameSummary | null>(null);
  const [submission, setSubmission] = useState<{ id: string; state: string; reviews: { id: string; decision: string; comment: string }[] } | null>(null);
  const [version, setVersion] = useState({ version: '', changelog: '' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const games = await apiGet<GameSummary[]>('/api/v1/developer/games', token);
      setGame(games.find((g) => g.id === id) ?? null);
      setSubmission(await apiGet(`/api/v1/developer/games/${id}/submission`, token));
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    }
  }, [token, id, t, popup]);

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
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function uploadVisuals(files: FileList | null) {
    if (!token || !id || !files || files.length === 0) return;
    setUploading(true);
    try {
      let order = 0;
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('kind', order === 0 ? 'COVER' : 'SCREENSHOT');
        form.append('sortOrder', String(order));
        await apiUpload(`/api/v1/developer/games/${id}/media`, form, token);
        order += 1;
      }
      await load();
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setUploading(false);
    }
  }

  async function toggleArchive() {
    if (!token || !id || !game) return;
    setArchiving(true);
    try {
      await apiPost(`/api/v1/developer/games/${id}/${game.isArchived ? 'unarchive' : 'archive'}`, {}, token);
      await load();
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setArchiving(false);
    }
  }

  if (!game) return <p className="text-sm opacity-60">…</p>;

  const state = submission?.state ?? 'DRAFT';

  async function submissionAction(path: string) {
    if (!token || !id) return;
    setBusy(true);
    try {
      await apiPost(`/api/v1/developer/${path}`, {}, token);
      await load();
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link to="/developer" className="text-sm underline opacity-70">← {t('dev.myGames')}</Link>
        <h1 className="mt-1 text-2xl font-extrabold">{game.title}</h1>
        <p className="text-sm opacity-60">{game.slug} · {stateLabel(state, t)}{game.isArchived && ` · ${t('dev.archived')}`}</p>
        <button type="button" disabled={archiving} onClick={toggleArchive} className="surface mt-2 px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {game.isArchived ? t('dev.unarchive') : t('dev.archive')}
        </button>
      </div>

      <section className="surface p-5">
        <h2 className="font-bold">{t('dev.uploadCover')}</h2>
        <p className="mt-1 text-xs opacity-60">{t('dev.uploadHintNew')}</p>
        <label className="btn-accent mt-3 inline-block cursor-pointer px-4 py-2 text-sm">
          {uploading ? '…' : t('dev.uploadCover')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => uploadVisuals(e.target.files)}
          />
        </label>
      </section>

      <section className="surface p-5">
        <h2 className="font-bold">{t('dev.review')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(state === 'DRAFT' || !submission) && (
            <button disabled={busy} onClick={() => submissionAction(`games/${id}/submit`)} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">{t('dev.submit')}</button>
          )}
          {state === 'PENDING_REVIEW' && submission && (
            <button disabled={busy} onClick={() => submissionAction(`submissions/${submission.id}/withdraw`)} className="surface px-4 py-2 text-sm disabled:opacity-50">{t('dev.withdraw')}</button>
          )}
          {state === 'APPROVED' && (
            <button disabled={busy} onClick={() => submissionAction(`games/${id}/publish`)} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">{t('dev.publish')}</button>
          )}
        </div>
        {submission && submission.reviews.length > 0 && (
          <ul className="mt-3 grid gap-2 text-sm">
            {submission.reviews.map((r) => (
              <li key={r.id} className="surface px-3 py-2">
                <p><strong>{r.decision}</strong></p>
                <p className="opacity-70">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
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
