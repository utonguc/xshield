<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
</script>

<svelte:head><title>Lokasyonlar · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Mekânlar</p>
		<h1>Lokasyonlar</h1>
		<p class="sub">Misafir Wi-Fi sunduğunuz her mekânı buraya ekleyin; cihazları lokasyonlara bağlarsınız.</p>
	</div>
	<button class="btn btn--accent" onclick={() => (adding = !adding)}>{adding ? 'Kapat' : '+ Yeni lokasyon'}</button>
</section>

{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if adding}
	<form class="card add" method="POST" action="?/create" use:enhance={() => async ({ update }) => { await update(); adding = false; }}>
		<label class="field"><span>Lokasyon adı</span>
			<input class="input" name="name" placeholder="örn. Merkez Şube" required /></label>
		<button class="btn btn--accent" type="submit">Kaydet</button>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>Lokasyon</th><th>Cihaz</th><th></th></tr></thead>
		<tbody>
			{#each data.sites as s (s.id)}
				<tr>
					<td class="name">{s.name}</td>
					<td class="mono">{s.device_count}</td>
					<td class="right">
						<form method="POST" action="?/delete" use:enhance={toastEnhance('Lokasyon silindi')}>
							<input type="hidden" name="id" value={s.id} />
							<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `"${s.name}" lokasyonu ve bağlı tüm kayıtları silinsin mi? Bu işlem geri alınamaz.`)}>×</button>
						</form>
					</td>
				</tr>
			{/each}
			{#if data.sites.length === 0}
				<tr><td colspan="3" class="empty">Henüz lokasyon yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 48ch; }
	.add { padding: 1.4rem; margin-bottom: 1.4rem; display: flex; gap: 1rem; align-items: flex-end; }
	.add .field { flex: 1; margin: 0; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.85rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.95rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.mono { font-family: var(--font-mono); }
	.right { text-align: right; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
</style>
