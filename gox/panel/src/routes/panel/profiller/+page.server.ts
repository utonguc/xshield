import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

function num(v: FormDataEntryValue | null): number | null {
	if (v === null || String(v).trim() === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

// Form Mbit girişini API'nin beklediği kbps'e çevirir.
function parseProfile(data: FormData) {
	const down = num(data.get('rate_down_mbit'));
	const up = num(data.get('rate_up_mbit'));
	return {
		name: String(data.get('name') ?? '').trim(),
		kind: String(data.get('kind') ?? ''),
		duration_min: num(data.get('duration_min')),
		rate_down_kbps: down === null ? null : Math.round(down * 1024),
		rate_up_kbps: up === null ? null : Math.round(up * 1024)
	};
}

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get('gox_session');
	const res = await fetch(`${API()}/profiles`, { headers: { authorization: `Bearer ${token}` } });
	if (!res.ok) return { profiles: [], locationRequired: false };
	const body = await res.json();
	return { profiles: body.profiles ?? [], locationRequired: body.location_required ?? false };
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const token = cookies.get('gox_session');
		const res = await fetch(`${API()}/profiles`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
			body: JSON.stringify(parseProfile(await request.formData()))
		});
		if (!res.ok) {
			const b = await res.json().catch(() => ({}));
			return fail(res.status, { error: b.error ?? 'Profil eklenemedi' });
		}
		return { ok: true };
	},
	update: async ({ request, cookies, fetch }) => {
		const token = cookies.get('gox_session');
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const res = await fetch(`${API()}/profiles/${id}`, {
			method: 'PUT',
			headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
			body: JSON.stringify(parseProfile(data))
		});
		if (!res.ok) {
			const b = await res.json().catch(() => ({}));
			return fail(res.status, { error: b.error ?? 'Güncellenemedi' });
		}
		return { ok: true };
	},
	delete: async ({ request, cookies, fetch }) => {
		const token = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/profiles/${id}`, {
			method: 'DELETE',
			headers: { authorization: `Bearer ${token}` }
		});
		if (!res.ok) {
			const b = await res.json().catch(() => ({}));
			return fail(res.status, { error: b.error ?? 'Silinemedi' });
		}
		return { ok: true };
	}
};
