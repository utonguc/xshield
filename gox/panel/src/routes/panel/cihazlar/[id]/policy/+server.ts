import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/devices/${params.id}/policy`, { headers: { authorization: `Bearer ${t}` } });
	return json(await res.json().catch(() => ({})), { status: res.status });
};

// Tek POST → op alanına göre ilgili API ucuna yönlendirir.
export const POST: RequestHandler = async ({ params, request, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const b = await request.json();
	const id = params.id;
	const h = { authorization: `Bearer ${t}`, 'content-type': 'application/json' };
	let url = '';
	let method = 'POST';
	let body: string | undefined;
	switch (b.op) {
		case 'wg-add': url = `/devices/${id}/walled-garden`; body = JSON.stringify({ host: b.host }); break;
		case 'wg-del': url = `/devices/${id}/walled-garden/${b.wid}`; method = 'DELETE'; break;
		case 'block-add': url = `/devices/${id}/blocks`; body = JSON.stringify({ kind: b.kind, value: b.value, note: b.note ?? '' }); break;
		case 'block-del': url = `/devices/${id}/blocks/${b.bid}`; method = 'DELETE'; break;
		case 'block-mac': url = `/devices/${id}/block-mac`; body = JSON.stringify({ mac: b.mac }); break;
		case 'limit-mac': url = `/devices/${id}/limit-mac`; body = JSON.stringify({ mac: b.mac, down_kbps: b.down_kbps, up_kbps: b.up_kbps }); break;
		default: return json({ error: 'bilinmeyen işlem' }, { status: 400 });
	}
	const res = await fetch(`${API()}${url}`, { method, headers: h, body });
	return json(await res.json().catch(() => ({})), { status: res.status });
};
