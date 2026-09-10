const BASE = '';

function headers(token?: string): HeadersInit {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers(token) });
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(res.status, path, detail?.error?.message);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message?: string,
  ) {
    super(message ?? `API ${status}: ${path}`);
  }
}
