import { authed } from '$lib/server/gox';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const r = await authed(cookies, `/surveys/${params.id}/results`);
	if (!r.ok) throw error(404, 'Anket bulunamadı');
	return await r.json();
};
