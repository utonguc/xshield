import { authed } from '$lib/server/gox';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const res = await authed(cookies, `/tickets/${params.id}`);
	if (!res.ok) return { ticket: null, messages: [] };
	const d = await res.json();
	return { ticket: d.ticket, messages: d.messages };
};

export const actions: Actions = {
	reply: async ({ params, request, cookies }) => {
		const body = String((await request.formData()).get('body') ?? '').trim();
		if (!body) return fail(400, { error: 'Mesaj boş' });
		await authed(cookies, `/tickets/${params.id}/messages`, {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body })
		});
		return { ok: true };
	}
};
