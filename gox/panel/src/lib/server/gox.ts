import { env } from '$env/dynamic/private';

export const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Oturum token'ı ile gox_api'ye istek (server-side).
export function authed(cookies: { get: (n: string) => string | undefined }, path: string, init: RequestInit = {}) {
	const t = cookies.get('gox_session');
	return fetch(`${API()}${path}`, {
		...init,
		headers: { authorization: `Bearer ${t}`, ...(init.headers ?? {}) }
	});
}

export async function jsonOr<T>(p: Promise<Response>, key: string, fallback: T): Promise<T> {
	try {
		const res = await p;
		if (!res.ok) return fallback;
		return (await res.json())[key] ?? fallback;
	} catch {
		return fallback;
	}
}
