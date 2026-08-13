import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	cookies.delete('gox_session', { path: '/' });
	throw redirect(303, '/giris');
};
