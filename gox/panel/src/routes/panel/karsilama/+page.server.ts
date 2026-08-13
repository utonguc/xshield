import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch, parent }) => {
	const t = cookies.get('gox_session');
	const h = { authorization: `Bearer ${t}` };
	// Karşılama ekranı aktif lokasyona özeldir (seçici yok). Aktif lokasyon layout'tan (token sid asıl kaynak).
	const { activeLocId, activeLocName } = await parent();
	const sel = Number(activeLocId ?? 0);
	const selName = activeLocName ?? '';
	let portal = null;
	if (sel) {
		const pRes = await fetch(`${API()}/sites/${sel}/portal`, { headers: h });
		if (pRes.ok) portal = (await pRes.json()).portal;
	}
	return { sel, selName, portal };
};

export const actions: Actions = {
	save: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const sid = String(f.get('site_id') ?? '');
		const body = {
			brand_name: String(f.get('brand_name') ?? '').trim(),
			welcome_title: String(f.get('welcome_title') ?? '').trim(),
			welcome_text: String(f.get('welcome_text') ?? '').trim(),
			primary_color: String(f.get('primary_color') ?? '#C7F24E'),
			opt_guest: f.get('opt_guest') === 'on',
			opt_staff: f.get('opt_staff') === 'on',
			opt_meeting: f.get('opt_meeting') === 'on',
			opt_temp: f.get('opt_temp') === 'on',
			opt_mernis: f.get('opt_mernis') === 'on',
			opt_voucher: f.get('opt_voucher') === 'on',
			opt_email: f.get('opt_email') === 'on',
			opt_whatsapp: f.get('opt_whatsapp') === 'on',
			theme: String(f.get('theme') ?? 'editorial'),
			logo: String(f.get('logo') ?? ''),
			welcome_title_en: String(f.get('welcome_title_en') ?? '').trim(),
			welcome_text_en: String(f.get('welcome_text_en') ?? '').trim(),
			kvkk_text: String(f.get('kvkk_text') ?? '').trim(),
			redirect_url: String(f.get('redirect_url') ?? '').trim(),
			opt_order: String(f.get('opt_order') ?? '').trim(),
			temp_label: String(f.get('temp_label') ?? '').trim(),
			temp_minutes: Number(f.get('temp_minutes') ?? 120) || 120,
			temp_once: f.get('temp_once') === 'on',
			temp_rate_down_kbps: Number(f.get('temp_rate_down_mbps') ?? 0) > 0 ? Math.round(Number(f.get('temp_rate_down_mbps')) * 1024) : null,
			temp_rate_up_kbps: Number(f.get('temp_rate_up_mbps') ?? 0) > 0 ? Math.round(Number(f.get('temp_rate_up_mbps')) * 1024) : null
		};
		const res = await fetch(`${API()}/sites/${sid}/portal`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: 'Kaydedilemedi' });
		return { ok: true };
	}
};
