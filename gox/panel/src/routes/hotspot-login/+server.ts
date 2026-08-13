import type { RequestHandler } from './$types';

// MikroTik hotspot login.html şablonu. Cihaza fetch'lenip html-directory'ye konur.
// MikroTik servis ederken $(mac), $(ip), $(link-login-only), $(link-orig-esc), $(error) yerine koyar.
export const GET: RequestHandler = ({ url }) => {
	const site = url.searchParams.get('site') ?? '1';
	const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=https://gox.xshield.com.tr/portal?site=${site}&mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only)&link-orig=$(link-orig-esc)&err=$(error)">
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding-top:60px;color:#16150f;background:#f1eee3">
<p>goX karşılama ekranına yönlendiriliyorsunuz…</p>
<p><a href="https://gox.xshield.com.tr/portal?site=${site}&mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only)&link-orig=$(link-orig-esc)">Devam et</a></p>
</body></html>`;
	return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};
