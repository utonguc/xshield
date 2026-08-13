import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ fetch }) => {
	let plans: any[] = [];
	try {
		const r = await fetch(`${API()}/public/plans`);
		if (r.ok) plans = (await r.json()).plans ?? [];
	} catch {
		/* landing fiyat bölümü opsiyonel — sessiz geç */
	}
	return { plans };
};
