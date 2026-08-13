import { authed } from '$lib/server/gox';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Impersonation'ı bitir: owner'a düz token ver, gox_imp temizle.
export const load: PageServerLoad = async ({ cookies }) => {
	const res = await authed(cookies, '/admin/impersonate', {
		method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customer_id: 0 })
	});
	if (res.ok) {
		const { token } = await res.json();
		cookies.set('gox_session', token, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
	}
	cookies.delete('gox_imp', { path: '/' });
	throw redirect(303, '/owner');
};
