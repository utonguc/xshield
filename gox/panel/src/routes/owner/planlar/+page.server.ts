import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => ({
	plans: await jsonOr<any[]>(authed(cookies, '/admin/plans'), 'plans', [])
});

function body(f: FormData) {
	return {
		name: String(f.get('name') ?? '').trim(),
		sector: String(f.get('sector') ?? 'all'),
		billing_model: String(f.get('billing_model') ?? 'flat'),
		base_fee: Number(f.get('base_fee') || 0),
		included_units: Number(f.get('included_units') || 0),
		per_unit_fee: Number(f.get('per_unit_fee') || 0),
		max_devices: Number(f.get('max_devices') || 0),
		max_locations: Number(f.get('max_locations') || 0),
		active: f.get('active') === 'on' || f.get('active') === 'true',
		sort: Number(f.get('sort') || 0),
		features: String(f.get('features') ?? '')
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean)
	};
}

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const res = await authed(cookies, '/admin/plans', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body(await request.formData()))
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Oluşturulamadı' });
		return { ok: true };
	},
	update: async ({ request, cookies }) => {
		const f = await request.formData();
		const res = await authed(cookies, `/admin/plans/${f.get('id')}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body(f))
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Güncellenemedi' });
		return { ok: true };
	},
	delete: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const res = await authed(cookies, `/admin/plans/${id}`, { method: 'DELETE' });
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Silinemedi' });
		return { ok: true };
	}
};
