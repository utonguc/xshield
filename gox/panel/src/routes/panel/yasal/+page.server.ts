import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
	const t = cookies.get('gox_session');
	const h = { authorization: `Bearer ${t}` };
	const limit = 100;
	const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0)) || 0;
	const qs = new URLSearchParams();
	for (const k of ['site', 'q', 'from', 'to']) {
		const v = url.searchParams.get(k);
		if (v) qs.set(k, v);
	}
	qs.set('limit', String(limit));
	qs.set('offset', String(offset));
	const [logs, ts, sites] = await Promise.all([
		fetch(`${API()}/legal/logs?${qs}`, { headers: h }),
		fetch(`${API()}/legal/timestamps`, { headers: h }),
		fetch(`${API()}/sites`, { headers: h })
	]);
	const logsJson = logs.ok ? await logs.json() : { logs: [], total: 0, stamped: 0 };
	return {
		forbidden: logs.status === 403,
		logs: logsJson.logs ?? [],
		total: logsJson.total ?? 0,
		stampedCount: logsJson.stamped ?? 0,
		limit,
		offset,
		filters: {
			site: url.searchParams.get('site') ?? '',
			q: url.searchParams.get('q') ?? '',
			from: url.searchParams.get('from') ?? '',
			to: url.searchParams.get('to') ?? ''
		},
		sites: sites.ok ? (await sites.json()).sites : [],
		timestamps: ts.ok ? (await ts.json()).timestamps : []
	};
};

export const actions: Actions = {
	stamp: async ({ cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const res = await fetch(`${API()}/legal/stamp`, { method: 'POST', headers: { authorization: `Bearer ${t}` } });
		const j = await res.json().catch(() => ({}));
		if (!res.ok || j.ok === false) return fail(400, { error: j.error ?? 'Damgalama başarısız' });
		return { ok: true, stamped: true };
	},
	verify: async ({ cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const res = await fetch(`${API()}/legal/verify`, { headers: { authorization: `Bearer ${t}` } });
		const j = await res.json().catch(() => ({}));
		if (!res.ok) return fail(res.status, { error: 'Doğrulama başarısız' });
		return { ok: true, verify: j };
	}
};
