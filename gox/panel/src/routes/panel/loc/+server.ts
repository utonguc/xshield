import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Aktif lokasyonu değiştirir: API token'ı sid ile yeniden üretir, cookie'leri günceller.
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const { site_id } = await request.json();
	const res = await fetch(`${API()}/set-location`, {
		method: 'POST',
		headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
		body: JSON.stringify({ site_id: Number(site_id) || 0 })
	});
	if (!res.ok) return json({ error: 'değiştirilemedi' }, { status: res.status });
	const j = await res.json();
	const base = { path: '/', secure: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 7 };
	cookies.set('gox_session', j.token, { ...base, httpOnly: true });
	cookies.set('gox_loc', j.site_name, { ...base, httpOnly: false });
	cookies.set('gox_locid', String(j.site_id), { ...base, httpOnly: false });
	return json({ ok: true, site_name: j.site_name, site_id: j.site_id });
};
