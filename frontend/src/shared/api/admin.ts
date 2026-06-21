import { apiRequest } from './http';
import { getApiBase } from '../config/api';
import { parseApiError } from '../lib/parseApiError';

function adminHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

function adminNotFoundError(path: string): Error {
  const base = getApiBase();
  const onFrontendHost =
    typeof window !== 'undefined' &&
    (base === `${window.location.protocol}//${window.location.host}` ||
      base.includes('.vercel.app') ||
      base.includes('.now.sh'));
  if (onFrontendHost) {
    return new Error(
      `Маршрут ${path} не найден: запрос ушёл на фронт (${base}), а не на Nest API. ` +
        'В Vercel задайте NEXT_PUBLIC_API_BASE = HTTPS URL бэкенда на Render и пересоберите деплой.',
    );
  }
  return new Error(
    `Маршрут ${path} не найден на API (${base}). Задеплойте бэкенд на Render с последним кодом (модуль admin/) и проверьте Root Directory = backend.`,
  );
}

async function adminFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(path, {
      ...options,
      headers: adminHeaders(token, options?.headers),
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('HTTP 404')) {
      throw adminNotFoundError(path);
    }
    throw e;
  }
}

export async function adminLogin(login: string, password: string) {
  try {
    return await apiRequest<{ accessToken: string }>('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
  } catch (e) {
    if (e instanceof Error && (e.message.includes('HTTP 404') || e.message.includes('HTML'))) {
      throw adminNotFoundError('/admin/login');
    }
    throw new Error(parseApiError(e, 'Неверный логин или пароль'));
  }
}

export function deleteAdminPost(token: string, postId: string) {
  return adminFetch<{ ok: boolean }>(`/admin/posts/${encodeURIComponent(postId)}`, token, {
    method: 'DELETE',
  });
}

export function deleteAdminComment(token: string, commentId: string) {
  return adminFetch<{ ok: boolean }>(`/admin/comments/${encodeURIComponent(commentId)}`, token, {
    method: 'DELETE',
  });
}

export function banAdminUser(token: string, userId: string) {
  return adminFetch<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}/ban`, token, {
    method: 'POST',
  });
}

export function unbanAdminUser(token: string, userId: string) {
  return adminFetch<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}/unban`, token, {
    method: 'POST',
  });
}
