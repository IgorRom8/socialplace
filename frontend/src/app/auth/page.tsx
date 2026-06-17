'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { User } from '@/entities/user/model/types';
import { AuthCard } from '@/features/auth/ui/AuthCard';
import { apiRequest } from '@/shared/api/http';
import { bumpAuthSession } from '@/shared/lib/authSession';
import { parseApiError } from '@/shared/lib/parseApiError';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';

export default function AuthPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(true);
  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const authEndpoint = isRegister ? 'register' : 'login';
  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json' }), []);

  function switchAuthMode(register: boolean) {
    setIsRegister(register);
    setAuthError('');
  }

  function updateAuthForm(next: { fullName: string; email: string; password: string }) {
    setAuthForm(next);
    if (authError) setAuthError('');
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    router.replace('/');
  }, [router]);

  async function onAuth(e: FormEvent) {
    e.preventDefault();
    setAuthError('');
    const payload: Record<string, string> = {
      email: authForm.email.trim(),
      password: authForm.password,
    };
    if (isRegister) payload.fullName = authForm.fullName.trim();
    try {
      const result = await apiRequest<{ accessToken: string; user: User }>(`/auth/${authEndpoint}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      localStorage.setItem('token', result.accessToken);
      bumpAuthSession();
      router.push('/');
    } catch (err) {
      setAuthError(parseApiError(err));
    }
  }

  return (
    <main className="vkPage">
      <div className="vkLayout">
        <SiteHeader />
        <div className="vkColumns">
          <AppSidebar active="auth" />
          <section className="vkMain">
            <div className="authPage">
              <div className="authCardWrap">
                <AuthCard
                  isRegister={isRegister}
                  authForm={authForm}
                  authError={authError}
                  setIsRegister={switchAuthMode}
                  setAuthForm={updateAuthForm}
                  onSubmit={onAuth}
                />
                <Link href="/" className="backLink">
                  ← Назад в ленту
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
