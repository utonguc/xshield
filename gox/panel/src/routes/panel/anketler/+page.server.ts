import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const res = await fetch(`${API()}/surveys`, { headers: { authorization: `Bearer ${t}` } });
	return { surveys: res.ok ? (await res.json()).surveys : [] };
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		let questions: any[] = [];
		try {
			questions = JSON.parse(String(f.get('questions_json') ?? '[]'));
		} catch {
			questions = [];
		}
		const body = {
			title: String(f.get('title') ?? '').trim(),
			frequency: String(f.get('frequency') ?? 'once'),
			questions
		};
		const res = await fetch(`${API()}/surveys`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Oluşturulamadı' });
		return { ok: true };
	},
	toggle: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const id = String(f.get('id') ?? '');
		const status = String(f.get('status') ?? 'draft');
		const res = await fetch(`${API()}/surveys/${id}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({ status })
		});
		if (!res.ok) return fail(res.status, { error: 'Güncellenemedi' });
		return { ok: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/surveys/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
