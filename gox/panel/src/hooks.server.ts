import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	const token = event.cookies.get('gox_session');
	if (token && env.GOX_JWT_SECRET) {
		try {
			const secret = new TextEncoder().encode(env.GOX_JWT_SECRET);
			const { payload } = await jwtVerify(token, secret);
			event.locals.user = {
				id: Number(payload.sub),
				email: String(payload.email ?? ''),
				role: String(payload.role ?? '')
			};
		} catch {
			event.cookies.delete('gox_session', { path: '/' });
		}
	}
	return resolve(event);
};
