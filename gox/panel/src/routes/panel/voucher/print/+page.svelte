<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const mbps = (kbps: number | null) => (kbps ? Math.round((kbps / 1024) * 10) / 10 + ' Mbps' : 'Sınırsız');
	onMount(() => { setTimeout(() => window.print(), 400); });
</script>

<svelte:head><title>Erişim Kodları — Yazdır</title></svelte:head>

<div class="toolbar">
	<button class="btn btn--accent" onclick={() => window.print()}>Yazdır</button>
	<a class="btn btn--ghost" href="/panel/voucher">← Geri</a>
	<span class="cnt">{data.vouchers.length} kart</span>
</div>

<div class="sheet">
	{#each data.vouchers as v (v.id)}
		<div class="card">
			<div class="brand">Wi-Fi Erişim Kodu</div>
			<img class="qr" src={`/panel/voucher/${v.id}/qr`} alt="QR" />
			<div class="code">{v.code}</div>
			<div class="meta">
				<span>{v.site_name}</span>
				<span>{mbps(v.rate_down_kbps)}</span>
			</div>
			<div class="how">Wi-Fi'a bağlanın → <strong>Kod ile giriş</strong> → bu kodu girin<br />ya da QR'ı okutun.</div>
			{#if v.expires_at}<div class="exp">Son geçerlilik: {v.expires_at}</div>{/if}
		</div>
	{/each}
	{#if data.vouchers.length === 0}<p class="empty">Yazdırılacak aktif kod yok.</p>{/if}
</div>

<style>
	.toolbar { display: flex; gap: 0.6rem; align-items: center; padding: 1rem 1.4rem; border-bottom: 1px solid var(--line); }
	.cnt { color: var(--ink-soft); font-size: 0.85rem; }
	.sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 16px; }
	.card { border: 1.5px dashed #999; border-radius: 10px; padding: 14px; text-align: center; break-inside: avoid; background: #fff; color: #111; }
	.brand { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
	.qr { width: 150px; height: 150px; display: block; margin: 0 auto 8px; }
	.code { font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.18em; margin-bottom: 6px; }
	.meta { display: flex; justify-content: space-between; font-size: 0.72rem; color: #555; margin-bottom: 8px; }
	.how { font-size: 0.72rem; color: #333; line-height: 1.4; }
	.exp { font-size: 0.65rem; color: #888; margin-top: 6px; }
	.empty { padding: 3rem; text-align: center; color: var(--ink-soft); }
	@media print {
		.toolbar { display: none; }
		.sheet { gap: 8px; }
		.card { border-color: #bbb; }
	}
</style>
