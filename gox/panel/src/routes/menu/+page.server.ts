import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const site = url.searchParams.get('site') ?? '1';
	const res = await fetch(`${API()}/menu/public?site=${encodeURIComponent(site)}`);
	if (!res.ok) throw error(404, 'Menü bulunamadı');
	const d = await res.json();
	return { brand: d.brand, categories: d.categories ?? [] };
};
