import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/* ---------- Error popup (replaces error pages) ---------- */

interface ErrorState {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
}

const ErrorCtx = createContext<ErrorState>({ message: null, show: () => undefined, clear: () => undefined });

export function ErrorModalProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => setMessage(m), []);
  const clear = useCallback(() => setMessage(null), []);

  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMessage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [message]);

  const { t } = useTranslation();

  return (
    <ErrorCtx.Provider value={{ message, show, clear }}>
      {children}
      {message && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-label={t('errorPopup.title')} onClick={clear}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon" aria-hidden="true">⚠</div>
            <h2 className="text-lg font-extrabold">{t('errorPopup.title')}</h2>
            <p className="mt-2 text-sm opacity-80">{message}</p>
            <button type="button" onClick={clear} autoFocus className="btn-accent mt-5 w-full px-4 py-2.5 text-sm">
              {t('errorPopup.ok')}
            </button>
          </div>
        </div>
      )}
    </ErrorCtx.Provider>
  );
}

export function useErrorPopup(): ErrorState {
  return useContext(ErrorCtx);
}

/* ---------- Confirm popup (delete/archive) ---------- */

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  reasonRequired,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  reasonRequired?: boolean;
  reason?: string;
  onReasonChange?: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="modal-card confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon" aria-hidden="true">{danger ? '🗑' : '📦'}</div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">{body}</p>
        {reasonRequired && (
          <textarea
            value={reason ?? ''}
            onChange={(e) => onReasonChange?.(e.target.value)}
            rows={3}
            className="surface mt-3 w-full px-3 py-2 text-start text-sm"
            placeholder={body}
          />
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="surface flex-1 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy || (reasonRequired && !(reason ?? '').trim())}
            className="btn-accent flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            style={danger ? { background: 'var(--danger)', color: '#fff' } : undefined}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Harmonized dropdown (animated, site-styled) ---------- */

export interface DropdownOption {
  value: string;
  label: string;
  abbr?: string;
}

export function Dropdown({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <div ref={ref} className={`dropdown ${className ?? ''}`} data-open={open}>
      <span className="sr-only" id="dropdown-label">{label}</span>
      <button
        type="button"
        aria-labelledby="dropdown-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="surface flex items-center gap-2 px-3 py-2 text-sm"
      >
        <span>{current?.label ?? value}</span>
        {current?.abbr && <span className="text-xs font-bold opacity-50">{current.abbr}</span>}
        <span className="dropdown-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="dropdown-panel" role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              data-active={o.value === value}
              className="dropdown-item"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              {o.abbr && <span className="abbr">{o.abbr}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Sliding theme toggle (sun/moon) ---------- */

export function ThemeToggle({ theme, onToggle, label }: { theme: 'light' | 'dark'; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={label}
      title={label}
      data-theme={theme}
      onClick={onToggle}
      className="theme-toggle"
    >
      <span className="track-icon sun" aria-hidden="true">☀</span>
      <span className="track-icon moon" aria-hidden="true">🌙</span>
      <span className="knob" aria-hidden="true">{theme === 'dark' ? '🌙' : '☀'}</span>
    </button>
  );
}

/* ---------- Star rating display + input ---------- */

export function Stars({
  value,
  count,
  onRate,
  ariaLabel,
}: {
  value: number;
  count?: number;
  onRate?: (stars: number) => void;
  ariaLabel: string;
}) {
  const rounded = Math.round(value);
  return (
    <span className="stars" role={onRate ? 'radiogroup' : 'img'} aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((s) =>
        onRate ? (
          <button key={s} type="button" role="radio" aria-checked={s === Math.round(value)} aria-label={`${s}`} data-filled={s <= rounded} onClick={() => onRate(s)}>
            ★
          </button>
        ) : (
          <span key={s} aria-hidden="true" style={{ color: s <= rounded ? '#f59e0b' : 'var(--ink-muted)', opacity: s <= rounded ? 1 : 0.5, fontSize: '1.1rem' }}>
            ★
          </span>
        ),
      )}
      {typeof count === 'number' && <span className="ms-1 text-xs opacity-60">({count})</span>}
    </span>
  );
}
