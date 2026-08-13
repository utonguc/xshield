import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const [u, s] = await Promise.all([
		fetch(`${API()}/users`, { headers: { authorization: `Bearer ${t}` } }),
		fetch(`${API()}/sites`, { headers: { authorization: `Bearer ${t}` } })
	]);
	return {
		users: u.ok ? (await u.json()).users : [],
		forbidden: u.status === 403,
		sites: s.ok ? (await s.json()).sites : []
	};
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const res = await fetch(`${API()}/users`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({
				email: String(f.get('email') ?? ''),
				password: String(f.get('password') ?? ''),
				site_id: Number(f.get('site_id') ?? 0)
			})
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Eklenemedi' });
		return { created: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		await fetch(`${API()}/users/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		return { ok: true };
	}
};
