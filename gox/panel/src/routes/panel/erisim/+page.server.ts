import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const h = { authorization: `Bearer ${t}` };
	const [m, s, p] = await Promise.all([
		fetch(`${API()}/macs`, { headers: h }),
		fetch(`${API()}/sites`, { headers: h }),
		fetch(`${API()}/profiles`, { headers: h })
	]);
	return {
		macs: m.ok ? (await m.json()).macs : [],
		sites: s.ok ? (await s.json()).sites : [],
		profiles: p.ok ? (await p.json()).profiles : []
	};
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const pid = String(f.get('profile_id') ?? '');
		const body = {
			site_id: Number(f.get('site_id')),
			mac: String(f.get('mac') ?? '').trim(),
			list_type: String(f.get('list_type') ?? 'normal'),
			profile_id: pid ? Number(pid) : null,
			note: String(f.get('note') ?? '').trim()
		};
		const res = await fetch(`${API()}/macs`, {
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
		const pid = String(f.get('profile_id') ?? '');
		const body = {
			site_id: Number(f.get('site_id')),
			list_type: String(f.get('list_type') ?? 'normal'),
			profile_id: pid ? Number(pid) : null,
			note: String(f.get('note') ?? '').trim()
		};
		const res = await fetch(`${API()}/macs/${String(f.get('id') ?? '')}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Güncellenemedi' });
		return { ok: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/macs/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
