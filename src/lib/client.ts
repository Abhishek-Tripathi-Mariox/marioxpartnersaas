// Browser-side API client. Every page goes through this so errors are handled the same way.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: 'same-origin',
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !url.startsWith('/api/auth')) {
    window.location.href = '/login';
  }
  if (!res.ok) throw new ApiError(res.status, json.error || `Request failed (${res.status})`);
  return json as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, data?: unknown) => request<T>('POST', url, data ?? {}),
  patch: <T>(url: string, data: unknown) => request<T>('PATCH', url, data),
  put: <T>(url: string, data: unknown) => request<T>('PUT', url, data),
  del: <T>(url: string) => request<T>('DELETE', url),
};
