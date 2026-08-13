import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Cihaz provizyon config'ini auth ile proxy'ler (tarayıcı text/plain alır).
export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/devices/${params.id}/config`, {
		headers: { authorization: `Bearer ${t}` }
	});
	const text = await res.text();
	return new Response(text, {
		status: res.status,
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
