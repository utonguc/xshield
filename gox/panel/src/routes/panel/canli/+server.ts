import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Genel Bakış canlı verisi — sayfa 5 sn'de bir bunu çeker.
export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const token = cookies.get('gox_session');
	const res = await fetch(`${API()}/overview`, { headers: { authorization: `Bearer ${token}` } });
	if (!res.ok) return json(null, { status: 200 });
	return json(await res.json());
};
