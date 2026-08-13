import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/alerts`, { headers: { authorization: `Bearer ${t}` } });
	return json(await res.json().catch(() => ({ alerts: [], active: 0 })), { status: res.status });
};
