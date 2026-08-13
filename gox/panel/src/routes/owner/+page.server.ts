import { authed, jsonOr } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const stats = await jsonOr<any>(authed(cookies, '/admin/stats'), 'stats', {});
	const tenants = await jsonOr<any[]>(authed(cookies, '/admin/tenants'), 'tenants', []);
	const tickets = await jsonOr<any[]>(authed(cookies, '/admin/tickets'), 'tickets', []);
	const tsaR = await authed(cookies, '/legal/tsa');
	return {
		stats,
		tenants,
		openTickets: tickets.filter((t) => t.status === 'open').length,
		tsa: tsaR.ok ? (await tsaR.json()).tsa : null
	};
};

export const actions: Actions = {
	saveTsa: async ({ request, cookies }) => {
		const f = await request.formData();
		const pw = String(f.get('password') ?? '');
		const body: Record<string, unknown> = {
			enabled: f.get('enabled') === 'on',
			url: String(f.get('url') ?? '').trim(),
			username: String(f.get('username') ?? '').trim(),
			hash_alg: String(f.get('hash_alg') ?? 'sha256')
		};
		if (pw) body.password = pw;
		const res = await authed(cookies, '/legal/tsa', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Kaydedilemedi' });
		return { tsaSaved: true };
	}
};
