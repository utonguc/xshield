import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch, parent }) => {
	const { sector } = await parent();
	const token = cookies.get('gox_session');
	const h = { authorization: `Bearer ${token}` };
	const [res, pres] = await Promise.all([
		fetch(`${API()}/overview`, { headers: h }),
		fetch(`${API()}/my/plan`, { headers: h })
	]);
	const ov = res.ok ? await res.json() : null;
	const plan = pres.ok ? await pres.json() : null;
	return { ov, plan, sector };
};
