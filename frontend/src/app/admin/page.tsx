'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { adminLogin } from '@/shared/api/admin';
import { parseApiError } from '@/shared/lib/parseApiError';
import { getAdminToken, setAdminToken } from '@/shared/lib/adminSession';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getAdminToken()) {
      router.replace('/');
    }
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await adminLogin(form.login.trim(), form.password);
      setAdminToken(result.accessToken);
      router.replace('/');
    } catch (err) {
      setError(parseApiError(err, 'Неверный логин или пароль'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="vkPage">
      <div className="vkLayout">
        <SiteHeader />
        <div className="vkColumns">
          <AppSidebar active="admin" />
          <section className="vkMain">
            <div className="authPage">
              <div className="authCardWrap">
                <section className="card">
                  <h2>Вход для администратора</h2>
                  <p className="muted adminLoginHint">
                    После входа вы увидите обычный сайт с кнопками модерации.
                  </p>
                  {error ? (
                    <p className="authError" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <form className="grid" onSubmit={(e) => void onSubmit(e)}>
                    <input
                      placeholder="Логин"
                      value={form.login}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, login: e.target.value }));
                        if (error) setError('');
                      }}
                      autoComplete="username"
                    />
                    <input
                      type="password"
                      placeholder="Пароль"
                      value={form.password}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, password: e.target.value }));
                        if (error) setError('');
                      }}
                      autoComplete="current-password"
                    />
                    <button type="submit" disabled={busy}>
                      {busy ? 'Вход…' : 'Войти как администратор'}
                    </button>
                  </form>
                </section>
                <Link href="/" className="backLink">
                  ← На главную
                </Link>
              </div>
            </div>
          </section>
          <aside className="vkAside" aria-hidden />
        </div>
      </div>
    </main>
  );
}
