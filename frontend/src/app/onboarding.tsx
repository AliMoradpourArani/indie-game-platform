import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { useAuth } from './auth';
import { useErrorPopup } from '../design/ui';
import { Loading } from '../design/states';

interface PreferenceGame {
  id: string;
  name: string;
  art: string;
  gradient: string;
  genres: string[];
  tags: string[];
}

const MAX_SELECTIONS = 5;

/**
 * First-time preference onboarding (cold-start fix). New users pick up to 5
 * well-known games; only genre/tag metadata feeds recommendations. These are
 * external anchors — never purchasable, never marketplace games.
 * Shown once: completion/skip persists on the profile.
 */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const popup = useErrorPopup();
  const [games, setGames] = useState<PreferenceGame[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/register', { replace: true });
      return;
    }
    apiGet<{ completed: boolean; skipped: boolean }>('/api/v1/onboarding', token ?? undefined)
      .then((s) => {
        if (s.completed || s.skipped) navigate('/', { replace: true });
      })
      .catch(() => undefined);
    apiGet<PreferenceGame[]>('/api/v1/preferences/games')
      .then(setGames)
      .catch(() => setFailed(true));
  }, [user, token, navigate]);

  const full = selected.length >= MAX_SELECTIONS;

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, id];
    });
  }

  async function submit(ids: string[], skip: boolean) {
    if (!token || busy) return;
    setBusy(true);
    try {
      if (skip) {
        await apiPost('/api/v1/onboarding/skip', {}, token);
      } else {
        await apiPost('/api/v1/onboarding', { externalGameIds: ids }, token);
      }
      navigate('/', { replace: true });
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <section className="onboarding mx-auto w-full max-w-3xl" aria-labelledby="onboarding-title">
      <div className="surface onboarding-hero p-8 text-center sm:p-10">
        <h1 id="onboarding-title" className="text-2xl font-extrabold sm:text-3xl">{t('onboarding.title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-70">{t('onboarding.subtitle')}</p>
        <p className="mt-3 text-xs opacity-60">{t('onboarding.externalNote')}</p>
      </div>

      {failed && (
        <div className="surface mt-4 p-6 text-center">
          <p className="text-sm opacity-70">{t('onboarding.loadFailed')}</p>
          <button type="button" onClick={() => submit([], true)} className="btn-accent mt-3 px-5 py-2 text-sm">
            {t('onboarding.skip')}
          </button>
        </div>
      )}

      {!failed && !games && <Loading />}

      {games && (
        <>
          <div
            className="onboarding-grid mt-6"
            role="group"
            aria-label={t('onboarding.title')}
          >
            {games.map((g) => {
              const isSelected = selected.includes(g.id);
              const disabled = full && !isSelected;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={`${g.name}${isSelected ? ` — ${t('onboarding.selected')}` : ''}${disabled ? ` — ${t('onboarding.limitReached')}` : ''}`}
                  className="onboarding-card surface"
                  data-selected={isSelected}
                  data-dimmed={disabled}
                >
                  <span className="onboarding-art" style={{ background: g.gradient }} aria-hidden="true">
                    {g.art}
                  </span>
                  <span className="onboarding-name">{g.name}</span>
                  <span className="onboarding-check" aria-hidden="true">✓</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <p role="status" aria-live="polite" className="text-sm opacity-70">
              {t('onboarding.counter', { count: selected.length, max: MAX_SELECTIONS })}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => submit([], true)}
                disabled={busy}
                className="surface px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {t('onboarding.skip')}
              </button>
              <button
                type="button"
                onClick={() => submit(selected, false)}
                disabled={busy}
                className="btn-accent px-6 py-2.5 text-sm disabled:opacity-50"
              >
                {busy ? '…' : t('onboarding.continue')}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
