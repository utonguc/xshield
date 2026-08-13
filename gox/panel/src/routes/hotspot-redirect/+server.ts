import type { RequestHandler } from './$types';

// MikroTik hotspot redirect.html — Advertisement tetiklendiğinde gösterilir.
// Yerleşik "Sponsorlu bağlantı" sayfası JS ile yönlendirir ve captive tarayıcı blokluyor;
// bu meta-refresh sürümü (login.html gibi) güvenilir yönlendirir. $(link-redirect) = advertise-url.
export const GET: RequestHandler = () => {
	const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=$(link-redirect)">
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding-top:60px;color:#16150f;background:#f1eee3">
<p>Kısa bir anket açılıyor…</p>
<p><a href="$(link-redirect)" style="display:inline-block;margin-top:14px;padding:12px 26px;background:#16150f;color:#f1eee3;border-radius:6px;text-decoration:none;font-weight:600">Devam et</a></p>
</body></html>`;
	return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};
