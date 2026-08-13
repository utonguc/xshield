import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Voucher QR (PNG) — Bearer ekleyerek gox_api'den çeker.
export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/vouchers/${params.id}/qr`, { headers: { authorization: `Bearer ${t}` } });
	if (!res.ok) return new Response('', { status: res.status });
	return new Response(res.body, { headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=3600' } });
};
