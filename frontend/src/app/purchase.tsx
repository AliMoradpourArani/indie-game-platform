import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './auth';
import { Dropdown, useErrorPopup } from '../design/ui';
import { Empty, Loading } from '../design/states';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { priceLabel } from './games';

interface Detail {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  currency: string;
}

const LOCAL_DISCOUNTS: Record<string, number> = { INDIE10: 10, WELCOME20: 20 };

function localDiscount(code: string): number | null {
  const v = LOCAL_DISCOUNTS[code.trim().toUpperCase()];
  return typeof v === 'number' ? v : null;
}

export function PurchasePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const popup = useErrorPopup();
  const [game, setGame] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [payMethod, setPayMethod] = useState('local');

  useEffect(() => {
    void apiGet<Detail>(`/api/v1/games/${slug}`)
      .then(setGame)
      .catch(() => setMissing(true));
  }, [slug]);

  async function applyCode() {
    if (!code.trim()) return;
    try {
      const res = await apiPost<{ percentOff: number } | { active: boolean }>('/api/v1/discounts/validate', { code: code.trim() });
      if ('percentOff' in res) {
        setPercent(res.percentOff);
      } else {
        const local = localDiscount(code);
        if (local !== null) setPercent(local);
        else popup.show(t('purchase.discountInvalid'));
      }
    } catch {
      // Backend unavailable or unknown code → local fallback codes.
      const local = localDiscount(code);
      if (local !== null) setPercent(local);
      else popup.show(t('purchase.discountInvalid'));
    }
  }

  async function confirm() {
    if (!game) return;
    if (!user || !token) {
      navigate('/login', { replace: true });
      return;
    }
    setBusy(true);
    try {
      const co = await fetch('/api/v1/purchases/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ gameId: game.id, ...(code.trim() ? { discountCode: code.trim().toUpperCase() } : {}) }),
      }).then((r) => r.json());
      if (co?.error) throw new Error(co.error.message);
      if (co.checkoutId) {
        await apiPost('/api/v1/purchases/confirm', { checkoutId: co.checkoutId }, token);
      }
      navigate('/library', { replace: true });
    } catch (err) {
      popup.show(err instanceof ApiError || err instanceof Error ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (missing) return <Empty title={t('browse.notFound')} />;
  if (!game) return <Loading />;

  const total = percent ? Math.max(0, Math.round((game.priceCents * (100 - percent)) / 100)) : game.priceCents;

  return (
    <section className="surface mx-auto w-full max-w-lg p-6 sm:p-8">
      <Link to={`/games/${game.slug}`} className="text-sm underline opacity-70">← {game.title}</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{t('purchase.title')}</h1>
      <p className="mt-1 text-sm opacity-70">{game.title}</p>

      <label className="mt-5 grid gap-1 text-sm">
        {t('purchase.discount')}
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('purchase.discountPlaceholder')} className="surface min-w-0 flex-1 px-3 py-2 text-sm" />
          <button type="button" onClick={applyCode} className="surface px-4 py-2 text-sm font-semibold">
            {t('purchase.apply')}
          </button>
        </div>
      </label>
      {percent !== null && <p className="mt-2 text-sm opacity-70">{t('purchase.discountApplied', { percent })}</p>}

      <label className="mt-4 grid gap-1 text-sm">
        {t('purchase.total')}
        <Dropdown
          label={t('purchase.total')}
          value={payMethod}
          onChange={setPayMethod}
          options={[{ value: 'local', label: t('game.purchaseHint') }]}
        />
      </label>

      <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        <span className="text-sm opacity-70">{t('purchase.total')}</span>
        <strong className="text-xl">{priceLabel(total, t)}</strong>
      </div>

      {!user && <p className="mt-2 text-xs opacity-60">{t('purchase.loginRequired')}</p>}
      <button type="button" disabled={busy} onClick={confirm} className="btn-accent mt-4 w-full px-4 py-2.5 text-sm disabled:opacity-50">
        {busy ? '…' : t('purchase.confirm')}
      </button>
      <p className="mt-2 text-xs opacity-60">{t('game.purchaseHint')}</p>
    </section>
  );
}
