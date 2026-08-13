import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/sites`, { headers: { authorization: `Bearer ${t}` } });
	return { sites: res.ok ? (await res.json()).sites : [] };
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const name = String((await request.formData()).get('name') ?? '').trim();
		const res = await fetch(`${API()}/sites`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Eklenemedi' });
		return { ok: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/sites/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
