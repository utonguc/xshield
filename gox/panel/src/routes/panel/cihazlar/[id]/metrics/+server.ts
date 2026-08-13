import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Cihaz zaman-serisi geçmişi (grafikler)
export const GET: RequestHandler = async ({ params, url, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const range = url.searchParams.get('range') ?? '1h';
	const res = await fetch(`${API()}/devices/${params.id}/metrics/history?range=${encodeURIComponent(range)}`, {
		headers: { authorization: `Bearer ${t}` }
	});
	return json(await res.json().catch(() => ({ points: [] })), { status: res.status });
};
