<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
</script>

<svelte:head><title>Kullanıcılar · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Ekip</p>
		<h1>Kullanıcılar</h1>
		<p class="sub">Tenant yöneticileri tüm lokasyonları görür; lokasyon yöneticileri yalnız kendi lokasyonunu yönetir.</p>
	</div>
	{#if !data.forbidden}
		<button class="btn btn--accent" onclick={() => (adding = !adding)}>{adding ? 'Kapat' : '+ Kullanıcı'}</button>
	{/if}
</section>

{#if data.forbidden}
	<p class="info">Kullanıcı yönetimi yalnız tenant yöneticisine açıktır.</p>
{:else}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	{#if adding}
		<form class="card add" method="POST" action="?/create"
			use:enhance={() => async ({ update }) => { await update({ reset: true }); adding = false; }}>
			<div class="grid">
				<label class="field"><span>E-posta</span><input class="input" name="email" type="email" required /></label>
				<label class="field"><span>Parola</span><input class="input" name="password" type="text" placeholder="en az 6 karakter" required /></label>
				<label class="field"><span>Yetki / Lokasyon</span>
					<select class="input" name="site_id">
						<option value="0">Tüm lokasyonlar (tenant yöneticisi)</option>
						{#each data.sites as s}<option value={s.id}>{s.name} (lokasyon yöneticisi)</option>{/each}
					</select>
				</label>
			</div>
			<button class="btn btn--accent" type="submit">Kullanıcı oluştur</button>
		</form>
	{/if}

	<section class="card list">
		<table class="tbl">
			<thead><tr><th>E-posta</th><th>Yetki</th><th>Kapsam</th><th></th></tr></thead>
			<tbody>
				{#each data.users as u (u.id)}
					<tr>
						<td class="mono">{u.email}{#if u.self}<span class="me">siz</span>{/if}</td>
						<td>{u.role === 'location_manager' ? 'Lokasyon yöneticisi' : u.role === 'owner' ? 'Platform sahibi' : 'Tenant yöneticisi'}</td>
						<td>{u.scope}</td>
						<td class="right">
							{#if !u.self}
								<form method="POST" action="?/delete" use:enhance={toastEnhance('Kullanıcı silindi')} style="display:inline">
									<input type="hidden" name="id" value={u.id} />
									<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `${u.email} kullanıcısı silinsin mi?`)}>×</button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
				{#if data.users.length === 0}<tr><td colspan="4" class="empty">Henüz kullanıcı yok.</td></tr>{/if}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 56ch; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.add { padding: 1.4rem; margin-bottom: 1.4rem; }
	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.3rem; }
	.field span { font-size: 0.82rem; color: var(--ink-soft); }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.8rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.mono { font-family: var(--font-mono); font-size: 0.85rem; }
	.me { font-family: var(--font-mono); font-size: 0.6rem; background: var(--acid); color: var(--ink); padding: 0.05rem 0.4rem; border-radius: 99px; margin-left: 0.4rem; }
	.right { text-align: right; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
</style>
