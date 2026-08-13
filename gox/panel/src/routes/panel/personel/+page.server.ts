import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const h = { authorization: `Bearer ${t}` };
	const [st, s] = await Promise.all([
		fetch(`${API()}/staff`, { headers: h }),
		fetch(`${API()}/sites`, { headers: h })
	]);
	return {
		staff: st.ok ? (await st.json()).staff : [],
		sites: s.ok ? (await s.json()).sites : []
	};
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const body = {
			site_id: Number(f.get('site_id')),
			full_name: String(f.get('full_name') ?? '').trim(),
			username: String(f.get('username') ?? '').trim(),
			title: String(f.get('title') ?? '').trim(),
			password: String(f.get('password') ?? '')
		};
		const res = await fetch(`${API()}/staff`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Eklenemedi' });
		return { ok: true };
	},
	update: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const res = await fetch(`${API()}/staff/${String(f.get('id') ?? '')}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({
				full_name: String(f.get('full_name') ?? '').trim(),
				username: String(f.get('username') ?? '').trim(),
				title: String(f.get('title') ?? '').trim()
			})
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Güncellenemedi' });
		return { ok: true };
	},
	resetpw: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const id = String(f.get('id') ?? '');
		const res = await fetch(`${API()}/staff/${id}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({ password: String(f.get('password') ?? '') })
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Güncellenemedi' });
		return { ok: true, pwreset: true };
	},
	toggle: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const id = String(f.get('id') ?? '');
		const active = String(f.get('active') ?? '') === 'true';
		const res = await fetch(`${API()}/staff/${id}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({ active })
		});
		if (!res.ok) return fail(res.status, { error: 'Güncellenemedi' });
		return { ok: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/staff/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
