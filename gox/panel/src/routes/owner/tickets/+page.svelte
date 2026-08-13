<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
</script>

<svelte:head><title>Destek · goX Platform</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Ticket yönetimi</p><h1>Destek</h1></div>
	<button class="btn btn--accent" onclick={() => (adding = !adding)} disabled={data.tenants.length === 0}>{adding ? 'Kapat' : '+ Yeni ticket'}</button>
</section>

{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if adding}
	<form class="card add" method="POST" action="?/create" use:enhance={() => async ({ update }) => { await update(); adding = false; }}>
		<div class="grid">
			<label class="field"><span>Tenant</span>
				<select class="input" name="customer_id" required>{#each data.tenants as t}<option value={t.id}>{t.name}</option>{/each}</select></label>
			<label class="field"><span>Öncelik</span>
				<select class="input" name="priority"><option value="normal">Normal</option><option value="high">Yüksek</option><option value="low">Düşük</option></select></label>
		</div>
		<label class="field"><span>Konu</span><input class="input" name="subject" required /></label>
		<label class="field"><span>İlk mesaj</span><textarea class="input" name="body" rows="3"></textarea></label>
		<button class="btn btn--accent" type="submit">Ticket aç</button>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>Konu</th><th>Tenant</th><th>Öncelik</th><th>Mesaj</th><th>Güncelleme</th><th>Durum</th></tr></thead>
		<tbody>
			{#each data.tickets as t (t.id)}
				<tr onclick={() => (window.location.href = `/owner/tickets/${t.id}`)} class="clickable">
					<td class="name">{t.subject}</td>
					<td>{t.customer}</td>
					<td class="up">{t.priority}</td>
					<td class="mono">{t.messages}</td>
					<td class="mono">{t.updated}</td>
					<td><span class="tag {t.status === 'open' ? 'tag--live' : 'tag--off'}">{t.status === 'open' ? 'Açık' : 'Kapalı'}</span></td>
				</tr>
			{/each}
			{#if data.tickets.length === 0}<tr><td colspan="6" class="empty">Ticket yok.</td></tr>{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.add { padding: 1.5rem; margin-bottom: 1.2rem; }
	.add .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.add textarea { font-family: var(--font-text); resize: vertical; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.9rem 0 0.6rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.8rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.clickable { cursor: pointer; }
	.clickable:hover td { background: var(--paper-2); }
	.name { font-family: var(--font-display); font-weight: 600; }
	.up { font-family: var(--font-mono); font-size: 0.74rem; text-transform: uppercase; }
	.mono { font-family: var(--font-mono); }
	.empty { text-align: center; color: var(--ink-soft); padding: 1.6rem 0; }
</style>
