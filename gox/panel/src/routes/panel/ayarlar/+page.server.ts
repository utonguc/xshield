import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const J = (o: object) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });

export const load: PageServerLoad = async ({ cookies }) => {
	const ctxR = await authed(cookies, '/context');
	const ctx = ctxR.ok ? await ctxR.json() : {};
	const payments = await jsonOr<any[]>(authed(cookies, '/my/payments'), 'payments', []);
	const pmsR = await authed(cookies, '/pms/config');
	const pmsJson = pmsR.ok ? await pmsR.json() : { config: { provider: 'manual' }, location_required: true };
	return {
		ctxUser: ctx.user ?? null,
		customer: ctx.customer ?? null,
		activeLocName: ctx.active_site_name ?? '',
		payments,
		pmsConfig: pmsJson.config ?? { provider: 'manual' },
		pmsLocationRequired: pmsJson.location_required ?? false
	};
};

export const actions: Actions = {
	password: async ({ request, cookies }) => {
		const f = await request.formData();
		const res = await authed(cookies, '/auth/password', {
			method: 'POST', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ old_password: String(f.get('old') ?? ''), new_password: String(f.get('new') ?? '') })
		});
		if (!res.ok) return fail(res.status, { pwError: (await res.json().catch(() => ({}))).error ?? 'Değiştirilemedi' });
		return { pwOk: true };
	},
	savePms: async ({ request, cookies }) => {
		const f = await request.formData();
		const body: Record<string, unknown> = {
			provider: String(f.get('provider') ?? 'manual'),
			endpoint: String(f.get('endpoint') ?? '').trim(),
			api_key: String(f.get('api_key') ?? '').trim(),
			hotel_code: String(f.get('hotel_code') ?? '').trim(),
			enabled: f.get('enabled') === 'on',
			conn_mode: String(f.get('conn_mode') ?? 'manual'),
			db_kind: String(f.get('db_kind') ?? 'sqlserver'),
			db_host: String(f.get('db_host') ?? '').trim(),
			db_port: Number(f.get('db_port') ?? 0) || 0,
			db_name: String(f.get('db_name') ?? '').trim(),
			db_user: String(f.get('db_user') ?? '').trim(),
			db_query: String(f.get('db_query') ?? '').trim()
		};
		const pw = String(f.get('db_pass') ?? '');
		if (pw) body.db_pass = pw; // boşsa mevcut korunur
		const res = await authed(cookies, '/pms/config', { method: 'PUT', ...J(body) });
		if (!res.ok) return fail(res.status, { pmsError: (await res.json().catch(() => ({}))).error ?? 'Kaydedilemedi' });
		return { pmsOk: true };
	},
	syncPms: async ({ cookies }) => {
		const res = await authed(cookies, '/pms/sync', { method: 'POST' });
		const d = await res.json().catch(() => ({}));
		return { pmsSyncMsg: res.ok ? (d.note ?? 'Senkron tamamlandı') : (d.error ?? 'Senkron hatası'), pmsSyncOk: res.ok };
	}
};
