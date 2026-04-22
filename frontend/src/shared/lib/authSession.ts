/** Событие для перезапуска клиентских подписок (сокет, уведомления) после входа */
export const SOCIAL_AUTH_SESSION_BUMP = 'social-auth-session-bump';

export function bumpAuthSession() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SOCIAL_AUTH_SESSION_BUMP));
}
