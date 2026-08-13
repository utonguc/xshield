import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Cihaz komut geçmişi/sonuçları (modal poll eder)
export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/devices/${params.id}/commands`, {
		headers: { authorization: `Bearer ${t}` }
	});
	return json(await res.json().catch(() => ({ commands: [] })), { status: res.status });
};
