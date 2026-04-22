import { getApiBase } from '@/shared/config/api';

/** Путь из БД (/uploads/...) или старый внешний URL */
export function resolvePublicMediaUrl(pathOrUrl: string): string {
  const s = pathOrUrl?.trim() ?? '';
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  const base = getApiBase();
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/${s}`;
}
