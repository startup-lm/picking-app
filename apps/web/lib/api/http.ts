export async function authFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
  });
}

export async function readError(res: Response): Promise<string> {
  try {
    const clone = res.clone();
    const data = await clone.json();
    if (data && typeof data === 'object' && typeof data.message === 'string' && data.message) {
      return data.message;
    }
  } catch {
    // fallback to text
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
    // ignore
  }
  return 'Ocurrió un error inesperado';
}
