import { authed, jsonOr } from '$lib/server/gox';
import type { Actions, PageServerLoad } from './$types';

const J = (o: object) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });

export const load: PageServerLoad = async ({ params, cookies }) => ({
	tenant: await jsonOr<any>(authed(cookies, `/admin/tenants/${params.id}`), 'tenant', null),
	payments: await jsonOr<any[]>(authed(cookies, `/admin/tenants/${params.id}/payments`), 'payments', []),
	plans: await jsonOr<any[]>(authed(cookies, '/admin/plans'), 'plans', [])
});

export const actions: Actions = {
	update: async ({ params, request, cookies }) => {
		const f = await request.formData();
		await authed(cookies, `/admin/tenants/${params.id}`, {
			method: 'PUT', ...J({
				name: String(f.get('name') ?? ''), status: String(f.get('status') ?? 'active'),
				plan_id: Number(f.get('plan_id') || 0), room_count: Number(f.get('room_count') || 0),
				sector: String(f.get('sector') ?? ''),
				monthly_fee: Number(f.get('monthly_fee') || 0)
			})
		});
		return { ok: true };
	},
	addPayment: async ({ params, request, cookies }) => {
		const f = await request.formData();
		await authed(cookies, '/admin/payments', {
			method: 'POST', ...J({
				customer_id: Number(params.id), amount: Number(f.get('amount') || 0),
				period: String(f.get('period') ?? ''), status: String(f.get('status') ?? 'paid'), note: String(f.get('note') ?? '')
			})
		});
		return { ok: true };
	},
	delPayment: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		await authed(cookies, `/admin/payments/${id}`, { method: 'DELETE' });
		return { ok: true };
	}
};
