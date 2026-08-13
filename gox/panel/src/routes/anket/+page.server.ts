import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// PUBLIC anket sayfası — MikroTik hotspot Advertisement buraya yönlendirir (bağlantı kesilmez).
export const load: PageServerLoad = async ({ url, fetch }) => {
	const site = url.searchParams.get('site') ?? '1';
	const mac = url.searchParams.get('mac') ?? '';
	const cont = url.searchParams.get('link-orig') ?? url.searchParams.get('continue') ?? '';
	const res = await fetch(`${API()}/survey/active?site=${encodeURIComponent(site)}`);
	const survey = res.ok ? (await res.json()).survey : null;
	return { survey, mac, cont };
};
