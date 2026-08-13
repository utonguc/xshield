import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) throw redirect(303, '/panel');
};

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		if (!email || !password) return fail(400, { error: 'E-posta ve parola gerekli', email });

		const api = env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';
		let res: Response;
		try {
			res = await fetch(`${api}/auth/login`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
		} catch {
			return fail(503, { error: 'Sunucuya ulaşılamadı', email });
		}

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, { error: body.error ?? 'Giriş başarısız', email });
		}

		const { token, user } = await res.json();
		cookies.set('gox_session', token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7
		});
		cookies.delete('gox_imp', { path: '/' });
		throw redirect(303, user?.role === 'owner' ? '/owner' : '/panel');
	}
};
