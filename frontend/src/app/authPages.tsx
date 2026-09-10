import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { ApiError } from '../lib/api';

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="surface px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{message}</p>;
}

const inputClass = 'surface w-full px-3 py-2 text-sm';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === 'DEVELOPER' ? '/developer' : '/library', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-bold">{t('auth.loginTitle')}</h1>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <ErrorNote message={error} />
        <label className="grid gap-1 text-sm">
          {t('auth.email')}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('auth.password')}
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={busy} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">
          {busy ? '…' : t('auth.loginSubmit')}
        </button>
      </form>
      <p className="mt-3 text-sm opacity-70">
        {t('auth.noAccount')} <Link to="/register" className="font-semibold underline">{t('auth.registerTitle')}</Link>
      </p>
    </section>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'PLAYER' as 'PLAYER' | 'DEVELOPER', studioName: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await register({
        email: form.email,
        password: form.password,
        role: form.role,
        displayName: form.displayName,
        studioName: form.role === 'DEVELOPER' ? form.studioName || form.displayName : undefined,
      });
      navigate(user.role === 'DEVELOPER' ? '/developer' : '/library', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-bold">{t('auth.registerTitle')}</h1>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <ErrorNote message={error} />
        <label className="grid gap-1 text-sm">
          {t('auth.accountType')}
          <select value={form.role} onChange={set('role')} className={inputClass}>
            <option value="PLAYER">{t('auth.player')}</option>
            <option value="DEVELOPER">{t('auth.developer')}</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t('auth.displayName')}
          <input required minLength={2} value={form.displayName} onChange={set('displayName')} className={inputClass} />
        </label>
        {form.role === 'DEVELOPER' && (
          <label className="grid gap-1 text-sm">
            {t('auth.studioName')}
            <input value={form.studioName} onChange={set('studioName')} className={inputClass} />
          </label>
        )}
        <label className="grid gap-1 text-sm">
          {t('auth.email')}
          <input type="email" required value={form.email} onChange={set('email')} className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('auth.password')}
          <input type="password" required minLength={8} value={form.password} onChange={set('password')} className={inputClass} />
        </label>
        <button type="submit" disabled={busy} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">
          {busy ? '…' : t('auth.registerSubmit')}
        </button>
      </form>
    </section>
  );
}

export function AdminLoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      // Backend enforces admin-only APIs; the UI additionally refuses non-admins here.
      if (user.role !== 'ADMIN') {
        setError(t('admin.notAdmin'));
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-bold">{t('admin.loginTitle')}</h1>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <ErrorNote message={error} />
        <label className="grid gap-1 text-sm">
          {t('admin.email')}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.password')}
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={busy} className="btn-accent px-4 py-2 text-sm disabled:opacity-50">
          {busy ? '…' : t('admin.submit')}
        </button>
      </form>
    </section>
  );
}
