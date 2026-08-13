import { authed, jsonOr } from '$lib/server/gox';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => ({
	tenants: await jsonOr<any[]>(authed(cookies, '/admin/tenants'), 'tenants', []),
	plans: await jsonOr<any[]>(authed(cookies, '/admin/plans'), 'plans', [])
});

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const f = await request.formData();
		const body = {
			name: String(f.get('name') ?? '').trim(),
			sector: String(f.get('sector') ?? 'cafe'),
			plan_id: Number(f.get('plan_id') || 0),
			room_count: Number(f.get('room_count') || 0),
			monthly_fee: Number(f.get('monthly_fee') || 0),
			admin_email: String(f.get('admin_email') ?? '').trim(),
			admin_password: String(f.get('admin_password') ?? '').trim()
		};
		const res = await authed(cookies, '/admin/tenants', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Oluşturulamadı' });
		const d = await res.json();
		return { created: { email: d.admin_email, password: d.admin_password, name: body.name } };
	},
	toggle: async ({ request, cookies }) => {
		const f = await request.formData();
		await authed(cookies, `/admin/tenants/${f.get('id')}`, {
			method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: String(f.get('status')) })
		});
		return { ok: true };
	},
	delete: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		await authed(cookies, `/admin/tenants/${id}`, { method: 'DELETE' });
		return { ok: true };
	},
	impersonate: async ({ request, cookies }) => {
		const id = Number((await request.formData()).get('id'));
		const res = await authed(cookies, '/admin/impersonate', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customer_id: id })
		});
		if (!res.ok) return fail(400, { error: 'Tenant paneline girilemedi' });
		const { token, customer_name } = await res.json();
		const opt = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 7 };
		cookies.set('gox_session', token, opt);
		cookies.set('gox_imp', customer_name, opt);
		throw redirect(303, '/panel');
	}
};
