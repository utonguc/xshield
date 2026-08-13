import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// CSV export'u Bearer ekleyerek gox_api'den çekip tarayıcıya indirir.
export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/legal/logs/export`, { headers: { authorization: `Bearer ${t}` } });
	if (!res.ok) return new Response('Erişim reddedildi', { status: res.status });
	return new Response(res.body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="5651-erisim-kayitlari.csv"'
		}
	});
};
