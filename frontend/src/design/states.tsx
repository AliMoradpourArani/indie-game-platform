import { useTranslation } from 'react-i18next';

/** Shared loading / empty / error states — one consistent language across pages. */
export function Loading() {
  const { t } = useTranslation();
  return (
    <p role="status" aria-live="polite" className="py-6 text-center text-sm opacity-60">
      {t('common.loading')}
    </p>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="surface p-8 text-center">
      <p className="font-bold">{title}</p>
      {body && <p className="mt-1 text-sm opacity-60">{body}</p>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  const { t } = useTranslation();
  if (!message) return null;
  return (
    <div role="alert" className="surface flex flex-wrap items-center gap-3 px-4 py-3 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="surface px-3 py-1 text-xs" style={{ color: 'var(--ink)' }}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
