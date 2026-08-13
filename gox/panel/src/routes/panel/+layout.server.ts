import { redirect } from '@sveltejs/kit';
import { authed } from '$lib/server/gox';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(303, '/giris');
	const imp = cookies.get('gox_imp') ?? null;
	if (locals.user.role === 'owner' && !imp) throw redirect(303, '/owner');

	let sector = 'cafe';
	let ctx: any = {};
	try {
		const r = await authed(cookies, '/context');
		if (r.ok) {
			ctx = await r.json();
			sector = ctx.customer?.sector ?? 'cafe';
		}
	} catch {
		/* sektör alınamazsa cafe varsay */
	}
	let alertCount = 0;
	try {
		const r = await authed(cookies, '/alerts');
		if (r.ok) alertCount = (await r.json()).active ?? 0;
	} catch {
		/* alarm sayısı alınamazsa 0 */
	}
	// Lokasyon seçici: müşterinin lokasyonları + aktif lokasyon
	let sites: { id: number; name: string }[] = [];
	try {
		const r = await authed(cookies, '/sites');
		if (r.ok) sites = (await r.json()).sites ?? [];
	} catch {
		/* lokasyonlar alınamazsa boş */
	}
	// Aktif lokasyon: token (sid) asıl kaynak; yoksa cookie. Lokasyon yöneticisi seçici göremez.
	const isManager = !!ctx.is_location_manager;
	const activeLocId = Number(ctx.active_site_id ?? cookies.get('gox_locid') ?? 0);
	const activeLocName = ctx.active_site_name || cookies.get('gox_loc') || 'Tüm lokasyonlar';
	const canSwitch = !isManager;
	return { user: locals.user, imp, sector, alertCount, sites, activeLocId, activeLocName, canSwitch };
};
