import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const h = { authorization: `Bearer ${t}` };
	const [v, s] = await Promise.all([
		fetch(`${API()}/vouchers`, { headers: h }),
		fetch(`${API()}/sites`, { headers: h })
	]);
	return {
		vouchers: v.ok ? (await v.json()).vouchers : [],
		sites: s.ok ? (await s.json()).sites : []
	};
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		// Hız Mbps girilir, sistemde kbps (1 Mbps = 1024 kbps konvansiyonu) saklanır. 0 = sınırsız.
		const dn = Number(f.get('rate_down_mbps') ?? 0);
		const up = Number(f.get('rate_up_mbps') ?? 0);
		const body = {
			site_id: Number(f.get('site_id')),
			name: String(f.get('name') ?? '').trim(),
			max_users: Number(f.get('max_users') ?? 0) || 0,
			expires_at: String(f.get('expires_at') ?? '').trim(),
			rate_down_kbps: dn > 0 ? Math.round(dn * 1024) : 0,
			rate_up_kbps: up > 0 ? Math.round(up * 1024) : 0
		};
		const res = await fetch(`${API()}/vouchers`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Oluşturulamadı' });
		return { ok: true, created: (await res.json()).voucher };
	},
	bulk: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const dn = Number(f.get('rate_down_mbps') ?? 0);
		const up = Number(f.get('rate_up_mbps') ?? 0);
		const body = {
			site_id: Number(f.get('site_id')),
			name: String(f.get('name') ?? '').trim(),
			count: Number(f.get('count') ?? 0),
			max_users: Number(f.get('max_users') ?? 0) || 0,
			expires_at: String(f.get('expires_at') ?? '').trim(),
			rate_down_kbps: dn > 0 ? Math.round(dn * 1024) : 0,
			rate_up_kbps: up > 0 ? Math.round(up * 1024) : 0
		};
		const res = await fetch(`${API()}/vouchers/bulk`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Üretilemedi' });
		const j = await res.json();
		return { ok: true, bulkCodes: j.codes ?? [], bulkCount: j.count ?? 0 };
	},
	update: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const dn = Number(f.get('rate_down_mbps') ?? 0);
		const up = Number(f.get('rate_up_mbps') ?? 0);
		const body = {
			name: String(f.get('name') ?? '').trim(),
			max_users: Number(f.get('max_users') ?? 0) || 0,
			expires_at: String(f.get('expires_at') ?? '').trim(),
			rate_down_kbps: dn > 0 ? Math.round(dn * 1024) : 0,
			rate_up_kbps: up > 0 ? Math.round(up * 1024) : 0
		};
		const res = await fetch(`${API()}/vouchers/${String(f.get('id') ?? '')}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Güncellenemedi' });
		return { ok: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/vouchers/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
