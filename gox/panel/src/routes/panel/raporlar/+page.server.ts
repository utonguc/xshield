import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
	const t = cookies.get('gox_session');
	const h = { authorization: `Bearer ${t}` };
	const qs = new URLSearchParams();
	for (const k of ['site', 'from', 'to']) {
		const v = url.searchParams.get(k);
		if (v) qs.set(k, v);
	}
	const [loc, an, sites] = await Promise.all([
		fetch(`${API()}/reports/locations`, { headers: h }),
		fetch(`${API()}/reports?${qs}`, { headers: h }),
		fetch(`${API()}/sites`, { headers: h })
	]);
	return {
		report: loc.ok ? await loc.json() : { locations: [], totals: {} },
		analytics: an.ok ? await an.json() : null,
		forbidden: loc.status === 403,
		sites: sites.ok ? (await sites.json()).sites : [],
		filters: {
			site: url.searchParams.get('site') ?? '',
			from: url.searchParams.get('from') ?? '',
			to: url.searchParams.get('to') ?? ''
		}
	};
};
