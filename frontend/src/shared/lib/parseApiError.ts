/** Текст ошибки из ответа Nest (JSON в message у Error). */
export function parseApiError(err: unknown, fallback = 'Что-то пошло не так'): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message.trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ') || fallback;
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    /* plain text */
  }
  return raw;
}
