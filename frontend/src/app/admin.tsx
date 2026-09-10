import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { ApiError, apiGet, apiPost } from '../lib/api';

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
  const ready = useAdminGuard();
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (!ready || !token) return;
    void apiGet<Record<string, number>>('/api/v1/admin/overview', token).then(setOverview);
    void apiGet<QueueItem[]>('/api/v1/admin/submissions', token).then(setQueue);
  }, [ready, token]);

  if (!ready) return null;

  const cards: Array<[string, number | undefined]> = [
    [t('adminS.pending'), overview?.pending],
    [t('adminS.changesRequested'), overview?.changesRequested],
    [t('adminS.published'), overview?.published],
    [t('adminS.developers'), overview?.developers],
    [t('adminS.users'), overview?.users],
  ];

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-extrabold">{t('adminS.dashboard')}</h1>
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
    </div>
  );
}

export function AdminSubmissionDetail() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const ready = useAdminGuard();
  const { id } = useParams();
  const [data, setData] = useState<{ submission: { id: string; state: string; game: { title: string; slug: string }; version: { version: string }; reviews: HistoryReview[] }; trail: { action: string; createdAt: string }[] } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setData(await apiGet(`/api/v1/admin/submissions/${id}/history`, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    }
  }, [token, id, t]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function act(path: string, body?: unknown) {
    if (!token || !id) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/submissions/${id}/${path}`, body ?? {}, token);
      setComment('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (error) return <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>;
  if (!data) return <p className="text-sm opacity-60">…</p>;

  const { submission, trail } = data;
  const underReview = submission.state === 'UNDER_REVIEW';

  return (
    <div className="grid gap-5">
      <div>
        <Link to="/admin" className="text-sm underline opacity-70">← {t('adminS.dashboard')}</Link>
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
