import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Cihaz config yedeğini indirir (goX'un ürettiği .rsc)
export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/devices/${params.id}/backup`, {
		headers: { authorization: `Bearer ${t}` }
	});
	const body = await res.text();
	return new Response(body, {
		status: res.status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'content-disposition':
				res.headers.get('content-disposition') ?? 'attachment; filename="device_goX.rsc"'
		}
	});
};
