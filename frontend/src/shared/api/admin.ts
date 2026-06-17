import { getApiBase } from '../config/api';
import { parseApiError } from '../lib/parseApiError';

function adminHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function adminFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: adminHeaders(token, options?.headers),
    });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(`Сервер API недоступен (${getApiBase()})`);
    }
    throw e;
  }
  const errText = !response.ok ? await response.text() : '';
  if (!response.ok) {
    throw new Error(parseApiError(new Error(errText || 'Request failed')));
  }
  const body = await response.text();
  if (!body) return undefined as T;
  return JSON.parse(body) as T;
}

export async function adminLogin(login: string, password: string) {
  const response = await fetch(`${getApiBase()}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const errText = !response.ok ? await response.text() : '';
  if (!response.ok) {
    throw new Error(parseApiError(new Error(errText || 'Request failed')));
  }
  return (await response.json()) as { accessToken: string };
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
