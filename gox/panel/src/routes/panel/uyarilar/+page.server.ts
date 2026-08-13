import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const [a, s] = await Promise.all([
		fetch(`${API()}/alerts`, { headers: { authorization: `Bearer ${t}` } }),
		fetch(`${API()}/alerts/settings`, { headers: { authorization: `Bearer ${t}` } })
	]);
	return {
		init: a.ok ? await a.json() : { alerts: [], active: 0 },
		settings: s.ok ? await s.json() : {}
	};
};
