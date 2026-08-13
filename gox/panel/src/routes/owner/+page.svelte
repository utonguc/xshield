<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const s = data.stats ?? {};
	const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(n ?? 0);
	const cards = [
		{ k: 'Tenant', v: fmt(s.tenants), d: `${fmt(s.active)} aktif` },
		{ k: 'Aylık gelir (MRR)', v: `₺${fmt(s.mrr)}`, d: 'aktif abonelik' },
		{ k: 'Cihaz', v: fmt(s.devices), d: 'toplam MikroTik' },
		{ k: 'Kayıtlı misafir', v: fmt(s.guests), d: 'MAC kaydı' },
		{ k: 'Anket yanıtı', v: fmt(s.responses), d: 'toplam' },
		{ k: 'Açık ticket', v: fmt(data.openTickets), d: 'destek' }
	];
</script>

<svelte:head><title>Platform · goX</title></svelte:head>

<p class="eyebrow">Platform yönetimi</p>
<h1>Genel Bakış</h1>

<section class="stats">
	{#each cards as c}
		<div class="card stat"><span class="eyebrow">{c.k}</span><strong>{c.v}</strong><span class="d">{c.d}</span></div>
	{/each}
</section>

<section class="card recent">
	<div class="bh"><h2>Tenantlar</h2><a class="btn btn--accent btn--sm" href="/owner/tenants">Tümünü yönet →</a></div>
	<table class="tbl">
		<thead><tr><th>İşletme</th><th>Sektör</th><th>Plan</th><th>Cihaz</th><th>Durum</th></tr></thead>
		<tbody>
			{#each data.tenants.slice(0, 6) as t}
				<tr>
					<td class="name">{t.name}</td>
					<td class="up">{t.sector}</td>
					<td>{t.plan}</td>
					<td class="mono">{t.devices}</td>
					<td><span class="tag {t.status === 'active' ? 'tag--live' : 'tag--off'}">{t.status === 'active' ? 'Aktif' : 'Askıda'}</span></td>
				</tr>
			{/each}
			{#if data.tenants.length === 0}<tr><td colspan="5" class="empty">Henüz tenant yok.</td></tr>{/if}
		</tbody>
	</table>
</section>

<!-- 5651 Zaman Damgası (TSA) — PLATFORM seviyesinde global. Tüm tenantların logları bununla imzalanır. -->
<section class="card tsa">
	<h2>Zaman Damgası (TSA) — KamuSM</h2>
	<p class="d">Platform geneli RFC 3161 zaman damgası entegrasyonu. goX olarak bir kez tanımlanır; <strong>tüm tenantların</strong> 5651 erişim kayıtları bu hesapla imzalanır. Tenantlar bu ayarı görmez, yalnız loglarını imzalar.</p>
	{#if form?.error}<p class="errbox">{form.error}</p>{/if}
	{#if form?.tsaSaved}<p class="okbox">Kaydedildi.</p>{/if}
	<form method="POST" action="?/saveTsa" use:enhance>
		<label class="chk"><input type="checkbox" name="enabled" checked={data.tsa?.enabled} /> Zaman damgası aktif</label>
		<div class="frow">
			<label class="field"><span>TSA URL</span><input class="input" name="url" value={data.tsa?.url ?? ''} placeholder="https://tsa.kamusm.gov.tr" /></label>
			<label class="field"><span>Kullanıcı adı</span><input class="input" name="username" value={data.tsa?.username ?? ''} autocomplete="off" /></label>
			<label class="field"><span>Parola {#if data.tsa?.has_pass}<small>(kayıtlı)</small>{/if}</span><input class="input" name="password" type="password" autocomplete="off" placeholder={data.tsa?.has_pass ? '••••••••' : 'parola'} /></label>
			<label class="field"><span>Özet</span><select class="input" name="hash_alg"><option value="sha256" selected={data.tsa?.hash_alg !== 'sha512'}>SHA-256</option><option value="sha512" selected={data.tsa?.hash_alg === 'sha512'}>SHA-512</option></select></label>
		</div>
		<button class="btn btn--accent" type="submit">Kaydet</button>
	</form>
</section>

<style>
	h1 { font-size: 2.1rem; margin: 0.4rem 0 1.6rem; }
	.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap); margin-bottom: var(--gap); }
	.stat { padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 0.25rem; }
	.stat strong { font-family: var(--font-display); font-size: 2.1rem; line-height: 1; letter-spacing: -0.03em; }
	.stat .d { font-size: 0.8rem; color: var(--ink-soft); }
	.recent { padding: 1.3rem 1.4rem 1rem; }
	.bh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
	.bh h2 { font-size: 1.2rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.6rem 0; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.7rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.up { font-family: var(--font-mono); font-size: 0.78rem; text-transform: uppercase; }
	.mono { font-family: var(--font-mono); }
	.empty { text-align: center; color: var(--ink-soft); padding: 1.5rem 0; }
	.tsa { padding: 1.3rem 1.4rem; margin-top: var(--gap); }
	.tsa h2 { font-size: 1.2rem; margin: 0 0 0.4rem; }
	.tsa .d { color: var(--ink-soft); font-size: 0.85rem; margin: 0 0 1rem; max-width: 70ch; }
	.chk { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.9rem; font-weight: 500; }
	.frow { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; margin-bottom: 0.9rem; }
	.field { display: flex; flex-direction: column; }
	.field span { font-size: 0.78rem; margin-bottom: 0.25rem; }
	.errbox { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 0.8rem; }
	.okbox { background: color-mix(in srgb, var(--acid) 18%, var(--card)); border: 1.4px solid var(--acid); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 0.8rem; }
	@media (max-width: 820px) { .stats { grid-template-columns: 1fr 1fr; } .frow { grid-template-columns: 1fr; } }
</style>
