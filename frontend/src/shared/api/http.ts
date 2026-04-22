import { getApiBase } from '../config/api';

function isNetworkFetchError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && (e.message === 'Failed to fetch' || e.name === 'NetworkError'))
  );
}

function apiUnreachableError(): Error {
  return new Error(
    `Сервер API недоступен (${getApiBase()}). Запустите бэкенд в папке backend: npm run start:dev или npm run start`,
  );
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
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Request failed');
  }
  return response.json() as Promise<T>;
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
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Request failed');
  }
  return response.json() as Promise<T>;
}
