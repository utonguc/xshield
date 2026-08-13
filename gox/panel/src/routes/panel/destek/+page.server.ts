import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => ({
	tickets: await jsonOr<any[]>(authed(cookies, '/tickets'), 'tickets', [])
});

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const f = await request.formData();
		const body = {
			subject: String(f.get('subject') ?? '').trim(),
			priority: String(f.get('priority') ?? 'normal'),
			body: String(f.get('body') ?? '').trim()
		};
		const res = await authed(cookies, '/tickets', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Açılamadı' });
		return { ok: true };
	}
};
