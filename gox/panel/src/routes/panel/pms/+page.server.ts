import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const J = (o: object) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });

export const load: PageServerLoad = async ({ cookies }) => ({
	config: await jsonOr<any>(authed(cookies, '/pms/config'), 'config', { provider: 'manual' }),
	guests: await jsonOr<any[]>(authed(cookies, '/pms/guests'), 'guests', [])
});

export const actions: Actions = {
	saveConfig: async ({ request, cookies }) => {
		const f = await request.formData();
		const res = await authed(cookies, '/pms/config', {
			method: 'PUT', ...J({
				provider: String(f.get('provider') ?? 'manual'),
				endpoint: String(f.get('endpoint') ?? ''),
				api_key: String(f.get('api_key') ?? ''),
				hotel_code: String(f.get('hotel_code') ?? ''),
				enabled: f.get('enabled') === 'on'
			})
		});
		if (!res.ok) return fail(400, { error: 'Kaydedilemedi' });
		return { ok: true };
	},
	sync: async ({ cookies }) => {
		const res = await authed(cookies, '/pms/sync', { method: 'POST' });
		const d = await res.json().catch(() => ({}));
		return { syncMsg: res.ok ? (d.note ?? 'Senkron tamamlandı') : (d.error ?? 'Senkron hatası'), syncOk: res.ok };
	},
	addGuest: async ({ request, cookies }) => {
		const f = await request.formData();
		const res = await authed(cookies, '/pms/guests', {
			method: 'POST', ...J({
				room: String(f.get('room') ?? ''), full_name: String(f.get('full_name') ?? ''),
				surname: String(f.get('surname') ?? ''), checkin: String(f.get('checkin') ?? ''), checkout: String(f.get('checkout') ?? '')
			})
		});
		if (!res.ok) return fail(400, { error: 'Eklenemedi' });
		return { ok: true };
	},
	bulk: async ({ request, cookies }) => {
		const csv = String((await request.formData()).get('csv') ?? '');
		const res = await authed(cookies, '/pms/guests/bulk', { method: 'POST', ...J({ csv }) });
		const d = await res.json().catch(() => ({}));
		return { ok: true, imported: d.imported ?? 0 };
	},
	editGuest: async ({ request, cookies }) => {
		const f = await request.formData();
		const res = await authed(cookies, `/pms/guests/${String(f.get('id') ?? '')}`, {
			method: 'PUT', ...J({
				room: String(f.get('room') ?? ''), full_name: String(f.get('full_name') ?? ''),
				surname: String(f.get('surname') ?? ''), checkin: String(f.get('checkin') ?? ''), checkout: String(f.get('checkout') ?? '')
			})
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Güncellenemedi' });
		return { ok: true };
	},
	delGuest: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const res = await authed(cookies, `/pms/guests/${id}`, { method: 'DELETE' });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
