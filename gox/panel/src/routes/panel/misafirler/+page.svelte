<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let importing = $state(false);
	let editId = $state<number | null>(null);
</script>

<svelte:head><title>Misafirler · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Otel · misafir listesi</p><h1>Misafirler</h1>
		<p class="sub">Oda + soyad ile giriş yapacak misafirleri yönetin. PMS entegrasyonu Ayarlar'dadır; entegrasyon açıksa liste oradan da senkronlanır.</p></div>
</section>

{#if form?.error}<p class="err">{form.error}</p>{/if}
{#if form?.imported !== undefined}<p class="ok">{form.imported} misafir içe aktarıldı.</p>{/if}

<div class="card">
	<h2>Misafir ekle</h2>
	<form method="POST" action="?/addGuest" use:enhance={toastEnhance('Misafir eklendi')}>
		<div class="grid">
			<label class="field"><span>Oda</span><input class="input" name="room" placeholder="101" /></label>
			<label class="field"><span>Ad Soyad</span><input class="input" name="full_name" /></label>
			<label class="field"><span>Soyad (giriş için)</span><input class="input" name="surname" /></label>
			<label class="field"><span>Giriş</span><input class="input" name="checkin" type="date" /></label>
			<label class="field"><span>Çıkış</span><input class="input" name="checkout" type="date" /></label>
		</div>
		<button class="btn btn--accent btn--sm" type="submit">Ekle</button>
	</form>
	<details class="bulk">
		<summary>CSV ile toplu içe aktar</summary>
		<form method="POST" action="?/bulk" use:enhance={() => { importing = true; return async ({ update }) => { await update(); importing = false; }; }}>
			<p class="hint">Satır başına: <code>oda,ad soyad,soyad,giriş,çıkış</code> (tarihler YYYY-MM-DD, ops.)</p>
			<textarea class="input" name="csv" rows="4" placeholder="101,Ahmet Yılmaz,Yılmaz,2026-06-13,2026-06-16"></textarea>
			<button class="btn btn--accent btn--sm" type="submit" disabled={importing}>{importing ? 'Aktarılıyor…' : 'İçe aktar'}</button>
		</form>
	</details>
</div>

<section class="card list">
	<h2>Liste <span class="count">{data.guests.length}</span></h2>
	<table class="tbl">
		<thead><tr><th>Oda</th><th>Ad</th><th>Soyad</th><th>Giriş</th><th>Çıkış</th><th>Kaynak</th><th></th></tr></thead>
		<tbody>
			{#each data.guests as g (g.id)}
				{#if editId === g.id}
					<tr class="editing">
						<td colspan="7">
							<form class="editform" method="POST" action="?/editGuest" use:enhance={toastEnhance('Misafir güncellendi', { onSuccess: () => (editId = null) })}>
								<input type="hidden" name="id" value={g.id} />
								<input class="input narrow" name="room" value={g.room} placeholder="oda" />
								<input class="input" name="full_name" value={g.full_name} placeholder="ad" />
								<input class="input" name="surname" value={g.surname} placeholder="soyad" />
								<input class="input" name="checkin" type="date" value={g.checkin} />
								<input class="input" name="checkout" type="date" value={g.checkout} />
								<button class="btn btn--accent btn--sm" type="submit">Kaydet</button>
								<button class="btn btn--ghost btn--sm" type="button" onclick={() => (editId = null)}>Vazgeç</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="mono">{g.room}</td><td>{g.full_name}</td><td>{g.surname}</td>
						<td class="mono">{g.checkin}</td><td class="mono">{g.checkout}</td>
						<td class="up">{g.source}</td>
						<td class="right">
							<button class="icon" type="button" title="Düzenle" onclick={() => (editId = g.id)}>✎</button>
							<form method="POST" action="?/delGuest" use:enhance={toastEnhance('Misafir silindi')} style="display:inline"><input type="hidden" name="id" value={g.id} /><button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `${g.room || ''} ${g.full_name} kaydı silinsin mi?`)}>×</button></form>
						</td>
					</tr>
				{/if}
			{/each}
			{#if data.guests.length === 0}<tr><td colspan="7" class="empty">Henüz misafir yok.</td></tr>{/if}
		</tbody>
	</table>
</section>

<style>
	.head { margin-bottom: 1.6rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 62ch; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.ok { background: color-mix(in srgb, var(--ok) 14%, var(--card)); border: 1.4px solid var(--ok); color: var(--ok); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.card { padding: 1.4rem; margin-bottom: var(--gap); }
	.card h2 { font-size: 1.2rem; margin: 0 0 1rem; }
	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
	.bulk { margin-top: 1rem; }
	.bulk summary { cursor: pointer; font-family: var(--font-mono); font-size: 0.8rem; }
	.bulk textarea { font-family: var(--font-mono); font-size: 0.82rem; resize: vertical; margin: 0.5rem 0; }
	.hint { font-size: 0.8rem; color: var(--ink-soft); } .hint code { font-family: var(--font-mono); }
	.list { padding: 1.4rem; }
	.count { font-family: var(--font-mono); font-size: 0.9rem; color: var(--ink-soft); }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.9rem 0 0.5rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.65rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 15%, transparent); font-size: 0.9rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.mono { font-family: var(--font-mono); font-size: 0.85rem; } .up { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; }
	.right { text-align: right; } .empty { text-align: center; color: var(--ink-soft); padding: 1.5rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 26px; height: 26px; cursor: pointer; color: var(--ink); }
	.icon { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 26px; height: 26px; cursor: pointer; font-size: 0.8rem; color: var(--ink); margin-right: 0.3rem; }
	.icon:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.editform { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; padding: 0.3rem 0; }
	.editform .input { min-width: 120px; } .editform .narrow { min-width: 70px; width: 80px; }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	@media (max-width: 700px) { .grid { grid-template-columns: 1fr 1fr; } }
</style>
