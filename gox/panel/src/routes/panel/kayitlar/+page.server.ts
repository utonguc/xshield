import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => ({
	connections: await jsonOr<any[]>(authed(cookies, '/connections'), 'connections', [])
});

async function act(cookies: any, body: any) {
	const res = await authed(cookies, '/connections/action', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'İşlem başarısız' });
	return { ok: true };
}

export const actions: Actions = {
	kick: async ({ request, cookies }) => {
		const f = await request.formData();
		return act(cookies, { site_id: Number(f.get('site_id')), mac: String(f.get('mac')), action: 'kick' });
	},
	block: async ({ request, cookies }) => {
		const f = await request.formData();
		return act(cookies, { site_id: Number(f.get('site_id')), mac: String(f.get('mac')), action: 'block' });
	},
	allow: async ({ request, cookies }) => {
		const f = await request.formData();
		return act(cookies, { site_id: Number(f.get('site_id')), mac: String(f.get('mac')), action: 'allow' });
	}
};
