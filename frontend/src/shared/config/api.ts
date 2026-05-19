/**
 * Базовый URL Nest API (REST + Socket.IO на том же порту).
 * Явно задайте NEXT_PUBLIC_API_BASE, если API на другом хосте/порту.
 * Иначе в браузере: LAN с портом фронта (например :3000) → API на том же хосте :4000.
 * Если страница на стандартном 80/443 за nginx с прокси API на тот же хост — задайте
 * NEXT_PUBLIC_API_SAME_ORIGIN=1, иначе для *.vercel.app / *.now.sh тот же origin даст запросы в Next, а не в Nest.
 * Для IPv6 host в URL строится как [addr]:port.
 */
function normalizeApiBase(raw: string): string {
  return raw.replace(/\/+$/, '');
}

const FALLBACK_LOCAL = 'http://127.0.0.1:4000';

/** IPv6 host в URL должен быть в квадратных скобках, иначе запись ломается на `:`. */
function hostForApiUrl(hostname: string): string {
  if (hostname.includes(':')) {
    return `[${hostname}]`;
  }
  return hostname;
}

export function getApiBase(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE
      ? String(process.env.NEXT_PUBLIC_API_BASE).trim()
      : '';
  if (fromEnv) return normalizeApiBase(fromEnv);

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const host = hostForApiUrl(hostname);
      const defaultPort = protocol === 'https:' ? '443' : '80';
      const effective = port || defaultPort;
      if (effective === '80' || effective === '443') {
        const onVercel =
          hostname.endsWith('.vercel.app') || hostname.endsWith('.now.sh');
        const sameOriginApi =
          typeof process !== 'undefined' &&
          process.env.NEXT_PUBLIC_API_SAME_ORIGIN === '1';
        if (!onVercel || sameOriginApi) {
          return normalizeApiBase(`${protocol}//${host}`);
        }
        return FALLBACK_LOCAL;
      }
      return normalizeApiBase(`${protocol}//${host}:4000`);
    }
  }

  return FALLBACK_LOCAL;
}
