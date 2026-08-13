import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const J = (o: object) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });

export const load: PageServerLoad = async ({ cookies }) => ({
	categories: await jsonOr<any[]>(authed(cookies, '/menu'), 'categories', []),
	sites: await jsonOr<any[]>(authed(cookies, '/sites'), 'sites', [])
});

export const actions: Actions = {
	addCategory: async ({ request, cookies }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		const res = await authed(cookies, '/menu/categories', J({ name }));
		if (!res.ok) return fail(400, { error: 'Kategori eklenemedi' });
		return { ok: true };
	},
	delCategory: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		await authed(cookies, `/menu/categories/${id}`, { method: 'DELETE' });
		return { ok: true };
	},
	addItem: async ({ request, cookies }) => {
		const f = await request.formData();
		const res = await authed(cookies, '/menu/items', J({
			category_id: Number(f.get('category_id')),
			name: String(f.get('name') ?? '').trim(),
			description: String(f.get('description') ?? '').trim(),
			price: Number(f.get('price') || 0),
			available: true
		}));
		if (!res.ok) return fail(400, { error: 'Ürün eklenemedi' });
		return { ok: true };
	},
	toggleItem: async ({ request, cookies }) => {
		const f = await request.formData();
		await authed(cookies, `/menu/items/${f.get('id')}`, {
			method: 'PUT', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: String(f.get('name') ?? ''), description: String(f.get('description') ?? ''),
				price: Number(f.get('price') || 0), available: String(f.get('available')) === 'true'
			})
		});
		return { ok: true };
	},
	delItem: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		await authed(cookies, `/menu/items/${id}`, { method: 'DELETE' });
		return { ok: true };
	}
};
