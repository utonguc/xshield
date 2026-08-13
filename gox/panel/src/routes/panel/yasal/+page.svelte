<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const methodLabel: Record<string, string> = {
		guest: 'Misafir', temp: '2 saat', meeting: 'Toplantı', staff: 'Personel',
		mernis: 'TC (MERNIS)', pms: 'Oda (PMS)', voucher: 'Kod', login: 'Giriş', logout: 'Çıkış'
	};
	function pageUrl(off: number) {
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) if (v) p.set(k, String(v));
		if (off > 0) p.set('offset', String(off));
		const s = p.toString();
		return s ? '?' + s : '?';
	}
</script>

<svelte:head><title>5651 Yasal Loglar · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">5651 · Erişim kayıtları & zaman damgası</p>
		<h1>Yasal Loglar</h1>
		<p class="sub">Misafir erişim kayıtları otomatik tutuluyor ve hash-zinciriyle değişmez kılınıyor; goX tarafından RFC 3161 zaman damgasıyla (TÜBİTAK Kamu SM) imzalanıp mühürleniyor.</p>
	</div>
</section>

{#if data.forbidden}
	<p class="info">Bu sayfa yalnız tenant yöneticisi içindir.</p>
{:else}

{#if form?.error}<p class="err">{form.error}</p>{/if}
{#if form?.stamped}<p class="ok">Loglar zaman damgasıyla mühürlendi.</p>{/if}
{#if form?.verify}
	{#if form.verify.ok}
		<p class="ok">✓ Bütünlük doğrulandı — {form.verify.checked} kayıt sağlam, zincir kırılmamış.</p>
	{:else}
		<p class="err">⚠ Bütünlük BOZUK — kayıt #{form.verify.broken_at} hatalı/değiştirilmiş ({form.verify.checked} kayıt doğrulandıktan sonra).</p>
	{/if}
{/if}

<div class="cols">
	<!-- Damgalama (TSA goX tarafından global yönetilir; tenant yapılandırmaz) -->
	<section class="card">
		<h2>Zaman Damgası</h2>
		<p class="hint">Erişim kayıtlarınız goX tarafından RFC 3161 zaman damgasıyla (TÜBİTAK Kamu SM) otomatik imzalanır. Aşağıdan elle de tetikleyebilirsiniz.</p>
		<form method="POST" action="?/stamp" use:enhance>
			<button class="btn btn--accent" type="submit">Şimdi damgala</button>
			<span class="hint inline">Kayıt: <strong>{data.total}</strong> · Mühürlenen: <strong>{data.stampedCount}</strong></span>
		</form>
	</section>

	<!-- Zaman damgası çapaları -->
	<section class="card">
		<h2>Damga Çapaları</h2>
		<p class="hint">Her çapa, bir log aralığını TSA token'ıyla mühürler (değişmezlik kanıtı).</p>
		<div class="tslist">
			{#each data.timestamps as t}
				<div class="tsrow">
					<span class="tag {t.status === 'ok' ? 'tag--live' : 'tag--bad'}">{t.status}</span>
					<span class="mono">#{t.from_id}–{t.to_id}</span>
					<span class="note">{t.row_count} kayıt · {t.created_at}</span>
					{#if t.status !== 'ok'}<span class="note err-inline">{t.detail}</span>{/if}
				</div>
			{/each}
			{#if data.timestamps.length === 0}<p class="note">Henüz mühür yok.</p>{/if}
		</div>
	</section>
</div>

<!-- Erişim kayıtları -->
<section class="card list">
	<div class="listhead">
		<h2>Erişim Kayıtları <span class="note">({data.total} kayıt · {data.stampedCount} mühürlü)</span></h2>
		<div class="headbtns">
			<form method="POST" action="?/verify" use:enhance style="display:inline"><button class="btn btn--sm" type="submit">Bütünlüğü doğrula</button></form>
			<a class="btn btn--sm" href="/panel/yasal/export" target="_blank" rel="noopener">CSV indir</a>
		</div>
	</div>

	<form class="filters" method="GET">
		<select class="input" name="site">
			<option value="">Tüm lokasyonlar</option>
			{#each data.sites as s}<option value={s.id} selected={String(s.id) === data.filters.site}>{s.name}</option>{/each}
		</select>
		<input class="input" name="q" value={data.filters.q} placeholder="Ara: MAC, kimlik, IP" />
		<label class="dt">Başl. <input class="input" name="from" type="date" value={data.filters.from} /></label>
		<label class="dt">Bitiş <input class="input" name="to" type="date" value={data.filters.to} /></label>
		<button class="btn btn--accent btn--sm" type="submit">Filtrele</button>
		<a class="btn btn--ghost btn--sm" href="?">Temizle</a>
	</form>

	<table class="tbl">
		<thead><tr><th>#</th><th>Zaman</th><th>Lokasyon</th><th>MAC</th><th>IP</th><th>Kimlik</th><th>Yöntem</th><th>Olay</th><th>Damga</th></tr></thead>
		<tbody>
			{#each data.logs as l (l.id)}
				<tr>
					<td class="mono">{l.id}</td>
					<td class="mono">{l.ts}</td>
					<td>{l.site || '—'}</td>
					<td class="mono">{l.mac || '—'}</td>
					<td class="mono">{l.ip || '—'}</td>
					<td>{l.identity || '—'}</td>
					<td><span class="tag tag--off">{methodLabel[l.method] ?? l.method}</span></td>
					<td>{methodLabel[l.event] ?? l.event}</td>
					<td>{l.stamped ? '✓' : '—'}</td>
				</tr>
			{/each}
			{#if data.logs.length === 0}<tr><td colspan="9" class="empty">Kayıt bulunamadı.</td></tr>{/if}
		</tbody>
	</table>

	{#if data.total > data.limit}
		<div class="pager">
			{#if data.offset > 0}<a class="btn btn--ghost btn--sm" href={pageUrl(Math.max(0, data.offset - data.limit))}>← Önceki</a>{/if}
			<span class="note">{data.offset + 1}–{Math.min(data.offset + data.limit, data.total)} / {data.total}</span>
			{#if data.offset + data.limit < data.total}<a class="btn btn--ghost btn--sm" href={pageUrl(data.offset + data.limit)}>Sonraki →</a>{/if}
		</div>
	{/if}
</section>

{/if}

<style>
	.head { margin-bottom: 1.6rem; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 70ch; }
	.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-bottom: 1.2rem; }
	.card { padding: 1.4rem; }
	.card h2 { font-size: 1.1rem; margin: 0 0 0.4rem; }
	.hint { color: var(--ink-soft); font-size: 0.85rem; margin: 0 0 0.9rem; }
	.hint.inline { margin: 0 0 0 0.8rem; }
	.field { display: flex; flex-direction: column; margin-bottom: 0.7rem; }
	.field span { font-size: 0.8rem; margin-bottom: 0.25rem; }
	.field small { color: var(--ink-soft); }
	.chk { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.9rem; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.ok { background: color-mix(in srgb, var(--acid) 18%, var(--card)); border: 1.4px solid var(--acid); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.list { padding: 1rem 1.4rem; }
	.listhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; gap: 0.6rem; flex-wrap: wrap; }
	.headbtns { display: flex; gap: 0.5rem; }
	.filters { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; }
	.filters .input { min-width: 120px; }
	.filters .dt { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--ink-soft); }
	.filters .dt .input { min-width: 0; }
	.pager { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 0.9rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.8rem 0.5rem 0.6rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.6rem 0.5rem; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.85rem; }
	.mono { font-family: var(--font-mono); font-size: 0.78rem; }
	.note { color: var(--ink-soft); font-size: 0.8rem; font-weight: 400; }
	.err-inline { color: var(--danger); }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.tslist { display: flex; flex-direction: column; gap: 0.5rem; max-height: 280px; overflow-y: auto; }
	.tsrow { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
	@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
</style>
