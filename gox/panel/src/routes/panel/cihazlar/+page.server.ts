import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const [dRes, sRes] = await Promise.all([
		fetch(`${API()}/devices`, { headers: { authorization: `Bearer ${t}` } }),
		fetch(`${API()}/sites`, { headers: { authorization: `Bearer ${t}` } })
	]);
	return {
		devices: dRes.ok ? (await dRes.json()).devices : [],
		sites: sRes.ok ? (await sRes.json()).sites : []
	};
};

export const actions: Actions = {
	create: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const body = {
			site_id: Number(f.get('site_id')),
			name: String(f.get('name') ?? '').trim(),
			routeros_ver: String(f.get('routeros_ver') ?? '7'),
			wan_mode: String(f.get('wan_mode') ?? 'dhcp'),
			wan_interface: String(f.get('wan_interface') ?? 'ether1').trim(),
			wan_ip: String(f.get('wan_ip') ?? '').trim(),
			wan_gateway: String(f.get('wan_gateway') ?? '').trim(),
			lan_interfaces: String(f.get('lan_interfaces') ?? '').trim(),
			lan_subnet: String(f.get('lan_subnet') ?? '').trim(),
			dns_servers: String(f.get('dns_servers') ?? '').trim()
		};
		const res = await fetch(`${API()}/devices`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return fail(res.status, { error: (await res.json().catch(() => ({}))).error ?? 'Cihaz eklenemedi' });
		const { device } = await res.json();
		return { created: device };
	},
	command: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const f = await request.formData();
		const id = String(f.get('id') ?? '');
		const cmd = String(f.get('cmd') ?? '');
		const res = await fetch(`${API()}/devices/${id}/command`, {
			method: 'POST',
			headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
			body: JSON.stringify({ action: cmd })
		});
		if (!res.ok) return fail(res.status, { error: 'Komut gönderilemedi' });
		return { commanded: cmd };
	},
	delete: async ({ request, cookies, fetch }) => {
		const t = cookies.get('gox_session');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await fetch(`${API()}/devices/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
		if (!res.ok) return fail(res.status, { error: 'Silinemedi' });
		return { ok: true };
	}
};
