import { authed, jsonOr } from '$lib/server/gox';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const r = await authed(cookies, '/feedback');
	const d = r.ok ? await r.json() : { feedback: [], avg: 0, count: 0 };
	const sites = await jsonOr<any[]>(authed(cookies, '/sites'), 'sites', []);
	return { feedback: d.feedback ?? [], avg: d.avg ?? 0, count: d.count ?? 0, siteId: sites[0]?.id ?? null };
};
