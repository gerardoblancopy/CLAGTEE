// Cliente HTTP del CMS: adjunta el token de sesion a cada peticion.
//
// El token lo emiten /api/auth/login y /api/auth/register y vive en el mismo
// objeto de sesion que guarda AuthContext en localStorage.

export const SESSION_STORAGE_KEY = 'clagtee_session';
export const SESSION_EXPIRED_EVENT = 'clagtee:session-expired';

export interface StoredSession<TUser> {
  user: TUser;
  token: string;
}

export const readSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return typeof parsed?.token === 'string' && parsed.token ? parsed.token : null;
  } catch (error) {
    return null;
  }
};

// Un 401 significa que el token falta, expiro o fue revocado: avisamos a
// AuthContext para cerrar la sesion en vez de dejar la UI en un estado muerto.
const notifySessionExpired = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

export const apiFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers || {});
  const token = readSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    notifySessionExpired();
  }
  return response;
};

// Descarga autenticada: pedimos la URL firmada con el header Authorization y
// recien despues navegamos a ella, para no exponer el token en la URL.
export const requestDownloadUrl = async (fileKey: string, fileName?: string): Promise<string> => {
  const params = new URLSearchParams({ object: fileKey });
  if (fileName) params.set('filename', fileName);

  const response = await apiFetch(`/api/gcs-sign?${params.toString()}`);
  if (!response.ok) {
    throw new Error('No se pudo generar el enlace de descarga.');
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error('No se pudo generar el enlace de descarga.');
  }
  return payload.url;
};
