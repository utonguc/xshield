import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) throw redirect(303, '/giris');
	if (locals.user.role !== 'owner') throw redirect(303, '/panel');
	return { user: locals.user };
};
