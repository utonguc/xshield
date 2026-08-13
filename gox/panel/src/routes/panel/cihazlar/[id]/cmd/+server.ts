import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Panelden cihaz komutu gönder (tünel üstünden ajan uygular)
export const POST: RequestHandler = async ({ params, request, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const body = await request.json();
	const res = await fetch(`${API()}/devices/${params.id}/command`, {
		method: 'POST',
		headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	return json(await res.json().catch(() => ({})), { status: res.status });
};
