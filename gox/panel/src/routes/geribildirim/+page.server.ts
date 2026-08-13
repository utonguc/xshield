import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const site = url.searchParams.get('site') ?? '1';
	let brand = 'goX';
	try {
		const r = await fetch(`${API()}/portal/${site}`);
		if (r.ok) brand = (await r.json()).portal?.brand_name ?? 'goX';
	} catch {
		/* ignore */
	}
	return { brand, site };
};
