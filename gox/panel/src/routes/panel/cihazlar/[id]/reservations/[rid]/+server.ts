import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const DELETE: RequestHandler = async ({ params, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/devices/${params.id}/reservations/${params.rid}`, {
		method: 'DELETE',
		headers: { authorization: `Bearer ${t}` }
	});
	return json(await res.json().catch(() => ({})), { status: res.status });
};
