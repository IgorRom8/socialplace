export const ADMIN_SESSION_BUMP = 'admin-session-bump';

export const ADMIN_TOKEN_KEY = 'adminToken';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  bumpAdminSession();
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  bumpAdminSession();
}

export function bumpAdminSession() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_SESSION_BUMP));
}
