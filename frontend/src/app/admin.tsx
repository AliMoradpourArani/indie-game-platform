import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { ConfirmModal, useErrorPopup } from '../design/ui';
import { ApiError, apiDelete, apiGet, apiPost } from '../lib/api';

export interface QueueItem {
  id: string;
  state: string;
  game: { id: string; title: string; slug: string; genre: string };
  version: { version: string };
  submitter: { email: string };
  updatedAt: string;
}

interface HistoryReview {
  id: string;
  decision: string;
  comment: string;
  createdAt: string;
  reviewer: { email: string };
}

function useAdminGuard(): boolean {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) navigate('/admin/login', { replace: true });
  }, [user, loading, navigate]);
  return !!user && user.role === 'ADMIN';
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const popup = useErrorPopup();
  const ready = useAdminGuard();
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [games, setGames] = useState<{ id: string; title: string; slug: string; isArchived?: boolean }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    void apiGet<Record<string, number>>('/api/v1/admin/overview', token).then(setOverview).catch(() => undefined);
    void apiGet<QueueItem[]>('/api/v1/admin/submissions', token).then(setQueue).catch(() => undefined);
    void apiGet<{ data: { id: string; title: string; slug: string; isArchived?: boolean }[] }>('/api/v1/games?pageSize=50', token)
      .then((r) => setGames(r.data))
      .catch(() => undefined);
  }, [ready, token]);

  if (!ready) return null;

  const cards: Array<[string, number | undefined]> = [
    [t('adminS.pending'), overview?.pending],
    [t('adminS.changesRequested'), overview?.changesRequested],
    [t('adminS.published'), overview?.published],
    [t('adminS.developers'), overview?.developers],
    [t('adminS.users'), overview?.users],
  ];

  async function toggleArchive(id: string, archived: boolean) {
    if (!token) return;
    try {
      await apiPost(`/api/v1/admin/games/${id}/${archived ? 'unarchive' : 'archive'}`, {}, token);
      setGames((g) => g.map((x) => (x.id === id ? { ...x, isArchived: !archived } : x)));
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    }
  }

  async function confirmDelete() {
    if (!token || !deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`/api/v1/admin/games/${deleteTarget.id}`, { reason: deleteReason }, token);
      setGames((g) => g.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteReason('');
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{t('adminS.dashboard')}</h1>
        <Link to="/" className="ms-auto text-sm underline opacity-70 hover:opacity-100">← {t('adminS.backToSite')}</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="surface p-4 text-center">
            <p className="text-2xl font-extrabold">{value ?? '…'}</p>
            <p className="text-xs opacity-60">{label}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="font-bold">{t('adminS.queue')} ({queue.length})</h2>
        {queue.length === 0 && <p className="surface mt-2 p-4 text-sm opacity-60">{t('adminS.queueEmpty')}</p>}
        <ul className="mt-2 grid gap-2">
          {queue.map((q) => (
            <li key={q.id} className="surface flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/submissions/${q.id}`} className="font-bold hover:underline">
                  {q.game.title} <span className="font-normal opacity-60">v{q.version.version}</span>
                </Link>
                <p className="text-xs opacity-60">{q.submitter.email} · {q.state}</p>
              </div>
              <Link to={`/admin/submissions/${q.id}`} className="btn-accent px-3 py-1.5 text-xs">
                {t('adminS.review')}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">{t('adminS.games')} ({games.length})</h2>
        <ul className="mt-2 grid gap-2">
          {games.map((g) => (
            <li key={g.id} className="surface flex flex-wrap items-center gap-2 p-3 text-sm">
              <Link to={`/games/${g.slug}`} className="min-w-0 flex-1 truncate font-bold hover:underline">
                {g.title} {g.isArchived && <span className="font-normal opacity-60">· {t('adminS.archived')}</span>}
              </Link>
              <button type="button" onClick={() => toggleArchive(g.id, !!g.isArchived)} className="surface px-3 py-1.5 text-xs font-semibold">
                {g.isArchived ? t('adminS.unarchive') : t('adminS.archive')}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteTarget({ id: g.id, title: g.title }); setDeleteReason(''); }}
                className="surface px-3 py-1.5 text-xs font-semibold"
                style={{ color: 'var(--danger)' }}
              >
                {t('adminS.delete')}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <ConfirmModal
        open={!!deleteTarget}
        title={t('adminS.deleteTitle')}
        body={t('adminS.deleteBody')}
        confirmLabel={t('adminS.deleteConfirm')}
        cancelLabel={t('adminS.cancel')}
        danger
        busy={busy}
        reasonRequired
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteReason(''); }}
      />
    </div>
  );
}

export function AdminSubmissionDetail() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const popup = useErrorPopup();
  const ready = useAdminGuard();
  const { id } = useParams();
  const [data, setData] = useState<{ submission: { id: string; state: string; game: { title: string; slug: string }; version: { version: string }; reviews: HistoryReview[] }; trail: { action: string; createdAt: string }[] } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setData(await apiGet(`/api/v1/admin/submissions/${id}/history`, token));
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    }
  }, [token, id, t, popup]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function act(path: string, body?: unknown) {
    if (!token || !id) return;
    setBusy(true);
    try {
      await apiPost(`/api/v1/admin/submissions/${id}/${path}`, body ?? {}, token);
      setComment('');
      await load();
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!data) return <p className="text-sm opacity-60">…</p>;

  const { submission, trail } = data;
  const underReview = submission.state === 'UNDER_REVIEW';

  return (
    <div className="grid gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin" className="text-sm underline opacity-70">← {t('adminS.dashboard')}</Link>
          <Link to="/" className="ms-auto text-sm underline opacity-70 hover:opacity-100">← {t('adminS.backToSite')}</Link>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold">{submission.game.title} <span className="text-base font-normal opacity-60">v{submission.version.version}</span></h1>
        <p className="text-sm opacity-60">{submission.state}</p>
      </div>

      {submission.state === 'PENDING_REVIEW' && (
        <button disabled={busy} onClick={() => act('claim')} className="btn-accent w-fit px-4 py-2 text-sm disabled:opacity-50">
          {t('adminS.claim')}
        </button>
      )}

      {underReview && (
        <section className="surface grid gap-2 p-5">
          <h2 className="font-bold">{t('adminS.decision')}</h2>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
            placeholder={t('adminS.feedbackPlaceholder')} className="surface px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !comment.trim()} onClick={() => act('review', { decision: 'APPROVED', comment })} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">{t('adminS.approve')}</button>
            <button disabled={busy || !comment.trim()} onClick={() => act('review', { decision: 'CHANGES_REQUIRED', comment })} className="surface px-4 py-2 text-sm disabled:opacity-50">{t('adminS.requestChanges')}</button>
            <button disabled={busy || !comment.trim()} onClick={() => act('review', { decision: 'REJECTED', comment })} className="surface px-4 py-2 text-sm disabled:opacity-50" style={{ color: 'var(--danger)' }}>{t('adminS.reject')}</button>
          </div>
        </section>
      )}

      <section className="surface p-5">
        <h2 className="font-bold">{t('adminS.history')} ({submission.reviews.length})</h2>
        <ul className="mt-2 grid gap-2 text-sm">
          {submission.reviews.map((r) => (
            <li key={r.id} className="surface px-3 py-2">
              <p><strong>{r.decision}</strong> · {r.reviewer.email}</p>
              <p className="opacity-70">{r.comment}</p>
            </li>
          ))}
          {submission.reviews.length === 0 && <p className="text-xs opacity-60">{t('adminS.noReviews')}</p>}
        </ul>
        <h3 className="mt-4 text-sm font-bold">{t('adminS.auditTrail')}</h3>
        <ul className="mt-1 grid gap-1 text-xs opacity-70">
          {trail.map((a, i) => (
            <li key={i}>{a.action} · {new Date(a.createdAt).toLocaleString()}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
