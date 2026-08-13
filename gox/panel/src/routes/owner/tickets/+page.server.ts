import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => ({
	tickets: await jsonOr<any[]>(authed(cookies, '/admin/tickets'), 'tickets', []),
	tenants: await jsonOr<any[]>(authed(cookies, '/admin/tenants'), 'tenants', [])
});

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const f = await request.formData();
		const body = {
			customer_id: Number(f.get('customer_id')),
			subject: String(f.get('subject') ?? '').trim(),
			priority: String(f.get('priority') ?? 'normal'),
			body: String(f.get('body') ?? '').trim()
		};
		const res = await authed(cookies, '/admin/tickets', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Oluşturulamadı' });
		return { ok: true };
	}
};
