import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const API = () => env.GOX_API_INTERNAL_URL ?? 'http://gox_api:8080';

// PMS connector script'ini (PHP/PowerShell) Bearer ekleyerek indirir.
export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const t = cookies.get('gox_session');
	const fmt = url.searchParams.get('fmt') === 'ps1' ? 'ps1' : 'php';
	const res = await fetch(`${API()}/pms/connector?fmt=${fmt}`, { headers: { authorization: `Bearer ${t}` } });
	if (!res.ok) return new Response(await res.text(), { status: res.status });
	const fn = fmt === 'ps1' ? 'gox-pms-connector.ps1' : 'gox-pms-connector.php';
	return new Response(res.body, {
		headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': `attachment; filename="${fn}"` }
	});
};
