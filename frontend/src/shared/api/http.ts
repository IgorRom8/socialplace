import { getApiBase } from '../config/api';

function isNetworkFetchError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && (e.message === 'Failed to fetch' || e.name === 'NetworkError'))
  );
}

function apiUnreachableError(): Error {
  return new Error(
    `Сервер API недоступен (${getApiBase()}). Локально: запустите backend (npm run start:dev). ` +
      `Если сайт на Vercel — в Environment Variables задайте NEXT_PUBLIC_API_BASE с публичным URL Nest (https://...).`,
  );
}

function htmlInsteadOfApiError(): Error {
  return new Error(
    'Ответ пришёл как HTML (страница сайта), а не JSON API. Обычно это значит, что запрос ушёл на Vercel-фронт. ' +
      'В панели Vercel добавьте NEXT_PUBLIC_API_BASE = URL вашего бэкенда и пересоберите деплой.',
  );
}

function throwIfHtmlApiResponse(text: string): void {
  const t = text.trimStart();
  if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
    throw htmlInsteadOfApiError();
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, options);
  } catch (e) {
    if (isNetworkFetchError(e)) {
      throw apiUnreachableError();
    }
    throw e;
  }
  const errText = !response.ok ? await response.text() : '';
  if (!response.ok) {
    throwIfHtmlApiResponse(errText);
    throw new Error(`HTTP ${response.status}: ${errText || 'Request failed'}`);
  }
  const body = await response.text();
  throwIfHtmlApiResponse(body);
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(body.slice(0, 200) || 'Invalid JSON from API');
  }
}

/** POST multipart (без заголовка Content-Type — браузер выставит boundary) */
export async function apiFormPost<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      method: 'POST',
      body: formData,
    });
  } catch (e) {
    if (isNetworkFetchError(e)) {
      throw apiUnreachableError();
    }
    throw e;
  }
  const errText = !response.ok ? await response.text() : '';
  if (!response.ok) {
    throwIfHtmlApiResponse(errText);
    throw new Error(`HTTP ${response.status}: ${errText || 'Request failed'}`);
  }
  const body = await response.text();
  throwIfHtmlApiResponse(body);
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(body.slice(0, 200) || 'Invalid JSON from API');
  }
}
