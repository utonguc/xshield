<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
	let copied = $state(false);
	let editId = $state<number | null>(null);

	const mbps = (kbps: number | null) => (kbps ? Math.round((kbps / 1024) * 10) / 10 + ' Mbps' : 'Sınırsız');
	const mbpsVal = (kbps: number | null) => (kbps ? Math.round((kbps / 1024) * 10) / 10 : '');
	const dtLocal = (s: string | null) => (s ? s.replace(' ', 'T') : '');

	async function copy(code: string) {
		try { await navigator.clipboard.writeText(code); copied = true; setTimeout(() => (copied = false), 1500); } catch {}
	}
</script>

<svelte:head><title>Kodlar · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Kod ile giriş</p>
		<h1>Erişim Kodları</h1>
		<p class="sub">Bir kod üretin: isim, bitiş süresi, kullanıcı adedi ve hız limitini girin; sistem size kodu versin. Misafir karşılama ekranında <strong>Kod ile giriş</strong> ile bu kodu girerek bağlanır.</p>
	</div>
	<div class="headbtns">
		{#if data.vouchers.length > 0}<a class="btn btn--ghost" href="/panel/voucher/print" target="_blank" rel="noopener">Kartları yazdır</a>{/if}
		<button class="btn btn--accent" onclick={() => (adding = !adding)} disabled={data.sites.length === 0}>
			{adding ? 'Kapat' : '+ Kod üret'}
		</button>
	</div>
</section>

{#if data.sites.length === 0}
	<p class="info">Önce bir <a href="/panel/lokasyonlar">lokasyon</a> ekleyin.</p>
{/if}
{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if form?.created}
	<div class="card codecard">
		<div>
			<p class="eyebrow">Kod oluşturuldu — <strong>{form.created.name}</strong></p>
			<p class="bigcode">{form.created.code}</p>
		</div>
		<button class="btn btn--accent" type="button" onclick={() => copy(form.created.code)}>{copied ? 'Kopyalandı ✓' : 'Kopyala'}</button>
	</div>
{/if}

{#if form?.bulkCodes && form.bulkCodes.length}
	<div class="card bulkcard">
		<div class="bulkhead">
			<p class="eyebrow"><strong>{form.bulkCount}</strong> kod üretildi</p>
			<a class="btn btn--sm" href="/panel/voucher/print" target="_blank" rel="noopener">Kartları yazdır →</a>
		</div>
		<div class="codegrid">
			{#each form.bulkCodes as c}<span class="mono codechip">{c}</span>{/each}
		</div>
	</div>
{/if}

{#if adding}
	<form class="card add" method="POST" action="?/create" use:enhance={toastEnhance('Kod oluşturuldu', { onSuccess: () => (adding = false) })}>
		<div class="grid">
			<label class="field"><span>Lokasyon</span>
				<select class="input" name="site_id" required>
					{#each data.sites as s}<option value={s.id}>{s.name}</option>{/each}
				</select></label>
			<label class="field"><span>Kod adı</span>
				<input class="input" name="name" placeholder="ör. Lobi Günlük" required /></label>
			<label class="field"><span>Bitiş tarihi</span>
				<input class="input" name="expires_at" type="datetime-local" />
				<small>Boş = süresiz</small></label>
			<label class="field"><span>Kullanıcı adedi</span>
				<input class="input" name="max_users" type="number" min="0" placeholder="0 = sınırsız" />
				<small>Kaç farklı cihaz kullanabilir</small></label>
			<label class="field"><span>İndirme (Mbps)</span>
				<input class="input" name="rate_down_mbps" type="number" min="0" step="0.5" placeholder="0 = sınırsız" /></label>
			<label class="field"><span>Yükleme (Mbps)</span>
				<input class="input" name="rate_up_mbps" type="number" min="0" step="0.5" placeholder="0 = sınırsız" /></label>
			<label class="field"><span>Adet (toplu)</span>
				<input class="input" name="count" type="number" min="1" max="500" value="1" />
				<small>1 = tek kod; çoklu için adet girin</small></label>
		</div>
		<div class="formbtns">
			<button class="btn btn--accent" type="submit" formaction="?/create">Tek kod üret</button>
			<button class="btn" type="submit" formaction="?/bulk">Toplu üret →</button>
		</div>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>Kod</th><th>Ad</th><th>Lokasyon</th><th>Kullanım</th><th>Hız (↓/↑)</th><th>Bitiş</th><th></th></tr></thead>
		<tbody>
			{#each data.vouchers as v (v.id)}
				{#if editId === v.id}
					<tr class="editing">
						<td class="mono code">{v.code}</td>
						<td colspan="6">
							<form class="editform" method="POST" action="?/update" use:enhance={toastEnhance('Kod güncellendi', { onSuccess: () => (editId = null) })}>
								<input type="hidden" name="id" value={v.id} />
								<input class="input" name="name" value={v.name} placeholder="ad" required />
								<input class="input narrow" name="max_users" type="number" min="0" value={v.max_users ?? 0} title="Kullanıcı adedi (0=sınırsız)" />
								<input class="input narrow" name="rate_down_mbps" type="number" min="0" step="0.5" value={mbpsVal(v.rate_down_kbps)} title="İndirme Mbps (0=sınırsız)" />
								<input class="input narrow" name="rate_up_mbps" type="number" min="0" step="0.5" value={mbpsVal(v.rate_up_kbps)} title="Yükleme Mbps (0=sınırsız)" />
								<input class="input" name="expires_at" type="datetime-local" value={dtLocal(v.expires_at)} title="Bitiş (boş=süresiz)" />
								<button class="btn btn--accent btn--sm" type="submit">Kaydet</button>
								<button class="btn btn--ghost btn--sm" type="button" onclick={() => (editId = null)}>Vazgeç</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr class:expired={v.expired}>
						<td class="mono code">{v.code}</td>
						<td>{v.name}</td>
						<td>{v.site_name}</td>
						<td>{v.used_count}{v.max_users ? ' / ' + v.max_users : ' / ∞'}</td>
						<td class="note">{mbps(v.rate_down_kbps)} / {mbps(v.rate_up_kbps)}</td>
						<td class="note">{v.expired ? 'Süresi doldu' : (v.expires_at ?? 'Süresiz')}</td>
						<td class="right">
							<button class="icon" type="button" title="Düzenle" onclick={() => (editId = v.id)}>✎</button>
							<form method="POST" action="?/delete" use:enhance={toastEnhance('Kod silindi')} style="display:inline">
								<input type="hidden" name="id" value={v.id} />
								<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `"${v.name}" (${v.code}) kodu silinsin mi?`)}>×</button>
							</form>
						</td>
					</tr>
				{/if}
			{/each}
			{#if data.vouchers.length === 0}
				<tr><td colspan="7" class="empty">Henüz kod yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 60ch; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; margin-bottom: 1rem; }
	.info a { text-decoration: underline; text-decoration-color: var(--acid); text-decoration-thickness: 2px; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.codecard { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.2rem 1.4rem; margin-bottom: 1.4rem; border: 1.6px solid var(--acid); }
	.bigcode { font-family: var(--font-mono); font-size: 2rem; letter-spacing: 0.2em; margin: 0.2rem 0 0; }
	.headbtns { display: flex; gap: 0.6rem; align-items: center; }
	.formbtns { display: flex; gap: 0.6rem; }
	.bulkcard { padding: 1.2rem 1.4rem; margin-bottom: 1.4rem; border: 1.6px solid var(--acid); }
	.bulkhead { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.7rem; }
	.codegrid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.codechip { background: var(--paper-2); border: 1.3px solid var(--line); border-radius: 6px; padding: 0.3rem 0.6rem; letter-spacing: 0.12em; font-size: 0.85rem; }
	.add { padding: 1.4rem; margin-bottom: 1.4rem; }
	.add .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 0.4rem; }
	.add .field { margin-bottom: 0.6rem; display: flex; flex-direction: column; }
	.add .field small { color: var(--ink-soft); font-size: 0.7rem; margin-top: 0.2rem; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.85rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.95rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.tbl tr.expired td { opacity: 0.5; }
	.mono { font-family: var(--font-mono); font-size: 0.88rem; }
	.code { letter-spacing: 0.14em; font-weight: 600; }
	.note { color: var(--ink-soft); }
	.right { text-align: right; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.icon { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 0.9rem; color: var(--ink); margin-right: 0.3rem; }
	.icon:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.editform { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 0.3rem 0; }
	.editform .input { min-width: 130px; }
	.editform .narrow { min-width: 80px; width: 90px; }
	@media (max-width: 860px) { .add .grid { grid-template-columns: 1fr 1fr; } }
</style>
