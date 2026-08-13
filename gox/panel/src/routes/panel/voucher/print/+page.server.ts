import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/vouchers`, { headers: { authorization: `Bearer ${t}` } });
	const all = res.ok ? (await res.json()).vouchers : [];
	// Yazdırmaya değer: süresi dolmamış, aktif kodlar
	return { vouchers: all.filter((v: any) => !v.expired && v.active) };
};
