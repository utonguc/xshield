<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
	let resetFor = $state<number | null>(null);
	let editId = $state<number | null>(null);
</script>

<svelte:head><title>Personel · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Personel girişi</p>
		<h1>Personel</h1>
		<p class="sub">Lokasyon personeline kullanıcı adı + parola oluşturun. Personel, karşılama ekranındaki <strong>Personel girişi</strong> ile bu bilgilerle bağlanır. PMS/İK entegrasyonu varsa personel oradan da gelebilir.</p>
	</div>
	<button class="btn btn--accent" onclick={() => (adding = !adding)} disabled={data.sites.length === 0}>
		{adding ? 'Kapat' : '+ Personel ekle'}
	</button>
</section>

{#if data.sites.length === 0}
	<p class="info">Önce bir <a href="/panel/lokasyonlar">lokasyon</a> ekleyin.</p>
{/if}
{#if form?.error}<p class="err">{form.error}</p>{/if}
{#if form?.pwreset}<p class="ok">Parola güncellendi.</p>{/if}

{#if adding}
	<form class="card add" method="POST" action="?/create" use:enhance={toastEnhance('Personel eklendi', { onSuccess: () => (adding = false) })}>
		<div class="grid">
			<label class="field"><span>Lokasyon</span>
				<select class="input" name="site_id" required>
					{#each data.sites as s}<option value={s.id}>{s.name}</option>{/each}
				</select></label>
			<label class="field"><span>Ad Soyad</span>
				<input class="input" name="full_name" placeholder="Ahmet Yılmaz" required /></label>
			<label class="field"><span>Kullanıcı adı</span>
				<input class="input" name="username" placeholder="ahmet" autocomplete="off" required /></label>
			<label class="field"><span>Unvan / Birim</span>
				<input class="input" name="title" placeholder="Resepsiyon (opsiyonel)" /></label>
			<label class="field"><span>Parola</span>
				<input class="input" name="password" type="text" placeholder="en az 4 karakter" required /></label>
		</div>
		<button class="btn btn--accent" type="submit">Ekle</button>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>Ad Soyad</th><th>Kullanıcı adı</th><th>Lokasyon</th><th>Unvan</th><th>Durum</th><th></th></tr></thead>
		<tbody>
			{#each data.staff as s (s.id)}
				{#if editId === s.id}
					<tr class="editing">
						<td colspan="6">
							<form class="editform" method="POST" action="?/update" use:enhance={toastEnhance('Personel güncellendi', { onSuccess: () => (editId = null) })}>
								<input type="hidden" name="id" value={s.id} />
								<input class="input" name="full_name" value={s.full_name} placeholder="Ad Soyad" required />
								<input class="input" name="username" value={s.username} placeholder="kullanıcı adı" autocomplete="off" required />
								<input class="input" name="title" value={s.title ?? ''} placeholder="unvan" />
								<button class="btn btn--accent btn--sm" type="submit">Kaydet</button>
								<button class="btn btn--ghost btn--sm" type="button" onclick={() => (editId = null)}>Vazgeç</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr>
						<td>{s.full_name}</td>
						<td class="mono">{s.username}</td>
						<td>{s.site_name}</td>
						<td class="note">{s.title || '—'}</td>
						<td>
							<form method="POST" action="?/toggle" use:enhance={toastEnhance(s.active ? 'Pasife alındı' : 'Aktife alındı')} style="display:inline">
								<input type="hidden" name="id" value={s.id} />
								<input type="hidden" name="active" value={(!s.active).toString()} />
								<button class="tag {s.active ? 'tag--live' : 'tag--off'} tag-btn" type="submit" title="Aktif/Pasif">{s.active ? 'Aktif' : 'Pasif'}</button>
							</form>
						</td>
						<td class="right">
							<button class="icon" type="button" title="Düzenle" onclick={() => (editId = s.id)}>✎</button>
							<button class="icon" type="button" title="Parola sıfırla" onclick={() => (resetFor = resetFor === s.id ? null : s.id)}>⟳</button>
							<form method="POST" action="?/delete" use:enhance={toastEnhance('Personel silindi')} style="display:inline">
								<input type="hidden" name="id" value={s.id} />
								<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `${s.full_name} (${s.username}) personeli silinsin mi?`)}>×</button>
							</form>
							{#if resetFor === s.id}
								<form class="pwrow" method="POST" action="?/resetpw" use:enhance={toastEnhance('Parola güncellendi', { onSuccess: () => (resetFor = null) })}>
									<input type="hidden" name="id" value={s.id} />
									<input class="input pwin" name="password" type="text" placeholder="yeni parola" required />
									<button class="btn btn--sm" type="submit">Kaydet</button>
								</form>
							{/if}
						</td>
					</tr>
				{/if}
			{/each}
			{#if data.staff.length === 0}
				<tr><td colspan="6" class="empty">Henüz personel yok.</td></tr>
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
	.ok { background: color-mix(in srgb, var(--acid) 18%, var(--card)); border: 1.4px solid var(--acid); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.add { padding: 1.4rem; margin-bottom: 1.4rem; }
	.add .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 0.4rem; }
	.add .field { margin-bottom: 0.6rem; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.85rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.95rem; vertical-align: middle; }
	.tbl tr:last-child td { border-bottom: none; }
	.mono { font-family: var(--font-mono); font-size: 0.88rem; }
	.note { color: var(--ink-soft); }
	.right { text-align: right; white-space: nowrap; }
	.icon { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 0.9rem; color: var(--ink); margin-right: 0.3rem; }
	.icon:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.editform { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 0.3rem 0; }
	.editform .input { min-width: 150px; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.tag-btn { cursor: pointer; border: 1.4px solid var(--line); border-radius: 999px; padding: 0.15rem 0.7rem; font-size: 0.72rem; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); margin-left: 0.3rem; }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.del.small:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.pwrow { display: inline-flex; gap: 0.4rem; margin-top: 0.5rem; align-items: center; }
	.pwin { width: 140px; }
	@media (max-width: 860px) { .add .grid { grid-template-columns: 1fr 1fr; } }
</style>
