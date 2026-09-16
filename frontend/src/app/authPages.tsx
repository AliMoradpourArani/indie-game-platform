import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { Dropdown, useErrorPopup } from '../design/ui';
import { ApiError } from '../lib/api';

const inputClass = 'surface w-full px-3 py-2 text-sm';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const popup = useErrorPopup();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'DEVELOPER' ? '/developer' : '/library', { replace: true });
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-bold">{t('auth.loginTitle')}</h1>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
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
  const popup = useErrorPopup();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'PLAYER' as 'PLAYER' | 'DEVELOPER', studioName: '' });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        role: form.role,
        displayName: form.displayName,
        studioName: form.role === 'DEVELOPER' ? form.studioName || form.displayName : undefined,
      });
      // First-time users pick taste anchors before entering the site.
      navigate('/onboarding', { replace: true });
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-bold">{t('auth.registerTitle')}</h1>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <label className="grid gap-1 text-sm">
          {t('auth.accountType')}
          <Dropdown
            label={t('auth.accountType')}
            value={form.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v as 'PLAYER' | 'DEVELOPER' }))}
            options={[
              { value: 'PLAYER', label: t('auth.player') },
              { value: 'DEVELOPER', label: t('auth.developer') },
            ]}
          />
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
  const { adminLogin, logout, user } = useAuth();
  const navigate = useNavigate();
  const popup = useErrorPopup();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // If already authenticated as ADMIN, go straight to dashboard.
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Strict portal: backend only issues admin tokens here; non-admins get 403.
      const logged = await adminLogin(email, password);
      if (logged.role !== 'ADMIN') {
        logout();
        popup.show(t('admin.notAdmin'));
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      popup.show(err instanceof ApiError ? err.message : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mx-auto w-full max-w-md p-8">
      <Link to="/" className="text-sm underline opacity-70 hover:opacity-100">← {t('adminS.backToSite')}</Link>
      <h1 className="mt-2 text-xl font-bold">{t('admin.loginTitle')}</h1>
      {user && user.role !== 'ADMIN' && (
        <div className="mt-3 surface flex items-center justify-between gap-2 p-3 text-xs" style={{ borderColor: 'var(--line)' }}>
          <p className="opacity-80">{t('admin.wrongPortal')}</p>
          <button type="button" onClick={logout} className="font-semibold underline">
            {t('nav.logout')}
          </button>
        </div>
      )}
      <form className="mt-4 grid gap-3" onSubmit={submit}>
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
