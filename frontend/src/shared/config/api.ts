/**
 * Базовый URL Nest API (REST + Socket.IO на том же порту).
 * Явно задайте NEXT_PUBLIC_API_BASE, если API на другом хосте/порту.
 * Иначе в браузере: при открытии сайта по IP в LAN (например 192.168.x.x:3000)
 * API берётся с того же хоста и порта 4000 — иначе с телефона 127.0.0.1 не ваш ПК.
 */
function normalizeApiBase(raw: string): string {
  return raw.replace(/\/+$/, '');
}

const FALLBACK_LOCAL = 'http://127.0.0.1:4000';

export function getApiBase(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE
      ? String(process.env.NEXT_PUBLIC_API_BASE).trim()
      : '';
  if (fromEnv) return normalizeApiBase(fromEnv);

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return normalizeApiBase(`${protocol}//${hostname}:4000`);
    }
  }

  return FALLBACK_LOCAL;
}
