import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// Captive portal — PUBLIC. MikroTik hotspot misafiri buraya yönlendirir.
// Hotspot redirect parametreleri: link-login-only, link-orig, mac ...
export const load: PageServerLoad = async ({ url, fetch }) => {
	const site = url.searchParams.get('site') ?? '1';
	const linkLogin = url.searchParams.get('link-login-only') ?? url.searchParams.get('link-login') ?? '';
	const linkOrig = url.searchParams.get('link-orig') ?? '';
	const mac = url.searchParams.get('mac') ?? '';
	const ip = url.searchParams.get('ip') ?? '';
	const code = url.searchParams.get('code') ?? '';

	const res = await fetch(`${API()}/portal/${site}?mac=${encodeURIComponent(mac)}`);
	if (!res.ok) throw error(404, 'Karşılama ekranı bulunamadı');
	const d = await res.json();
	// Zorunlu anket (gate): aktif anket varsa ve bu MAC yanıtlamadıysa, internetten önce doldurulur.
	let survey = null;
	try {
		const sRes = await fetch(`${API()}/survey/active?site=${site}&mac=${encodeURIComponent(mac)}`);
		if (sRes.ok) survey = (await sRes.json()).survey;
	} catch {
		/* anket alınamazsa gate yok */
	}
	return {
		portal: d.portal, sector: d.sector ?? 'cafe', pmsEnabled: d.pms_enabled ?? false,
		suspended: d.suspended ?? false,
		site, linkLogin, linkOrig, mac, ip, code, survey, preview: url.searchParams.has('preview')
	};
};
