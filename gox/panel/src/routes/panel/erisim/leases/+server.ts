import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Seçili lokasyonun güncel DHCP havuzunu döner (MAC seçici için).
export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const site = url.searchParams.get('site') ?? '';
	const res = await fetch(`${API()}/sites/${site}/leases`, { headers: { authorization: `Bearer ${t}` } });
	if (!res.ok) return json({ leases: [] });
	return json(await res.json());
};
