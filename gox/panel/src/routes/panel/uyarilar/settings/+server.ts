import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const PUT: RequestHandler = async ({ request, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const body = await request.json();
	const res = await fetch(`${API()}/alerts/settings`, {
		method: 'PUT',
		headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	return json(await res.json().catch(() => ({})), { status: res.status });
};
