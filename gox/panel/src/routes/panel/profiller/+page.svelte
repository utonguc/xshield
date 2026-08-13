<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
	let editId = $state<number | null>(null);
	let draft = $state({ name: '', kind: 'guest', duration_min: '', rate_down_mbit: '', rate_up_mbit: '' });

	const kindLabels: Record<string, string> = { guest: 'Misafir', staff: 'Personel', meeting: 'Toplantı', temporary: 'Geçici' };

	function mbit(kbps: number | null): string {
		if (kbps === null || kbps === undefined) return '';
		const m = kbps / 1024;
		return Number.isInteger(m) ? String(m) : m.toFixed(1);
	}
	function openNew() {
		draft = { name: '', kind: 'guest', duration_min: '', rate_down_mbit: '', rate_up_mbit: '' };
		editId = null;
		showForm = true;
	}
	function openEdit(p: any) {
		draft = {
			name: p.name, kind: p.kind,
			duration_min: p.duration_min ?? '',
			rate_down_mbit: mbit(p.rate_down_kbps),
			rate_up_mbit: mbit(p.rate_up_kbps)
		};
		editId = p.id;
		showForm = true;
	}
	function fmtDuration(min: number | null): string {
		if (min === null || min === undefined) return 'Sınırsız';
		if (min % 60 === 0) return `${min / 60} sa`;
		if (min < 60) return `${min} dk`;
		return `${Math.floor(min / 60)} sa ${min % 60} dk`;
	}
</script>

<svelte:head><title>Erişim Profilleri · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Bağlantı kuralları</p>
		<h1>Erişim Profilleri</h1>
		<p class="sub">Misafirlerinize uygulanacak süre ve hız kurallarını tanımlayın. Profiller <strong>tesis (lokasyon) bazlıdır</strong> — yalnız seçili lokasyonda görünür ve uygulanır.</p>
	</div>
	<button class="btn btn--accent" onclick={openNew} disabled={data.locationRequired}>+ Yeni profil</button>
</section>

{#if data.locationRequired}
	<p class="info">Profiller tesis bazlıdır. Eklemek/yönetmek için üst çubuktan bir <strong>lokasyon seçin</strong>. (Tüm lokasyonlar görünümünde eski/ortak profiller listelenir.)</p>
{/if}
{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if showForm}
	<form class="card add" method="POST" action={editId ? '?/update' : '?/create'}
		use:enhance={() => async ({ update }) => { await update(); showForm = false; }}>
		{#if editId}<input type="hidden" name="id" value={editId} />{/if}
		<div class="grid">
			<label class="field"><span>İsim</span>
				<input class="input" name="name" bind:value={draft.name} required /></label>
			<label class="field"><span>Tür</span>
				<select class="input" name="kind" bind:value={draft.kind}>
					<option value="guest">Misafir</option><option value="staff">Personel</option>
					<option value="meeting">Toplantı</option>
				</select>
				<small>Tür, karşılama ekranındaki ilgili giriş seçeneğine bağlıdır (Misafir→Misafir girişi, Personel→Personel girişi, Toplantı→Toplantı girişi). Geçici erişim "Geçici Erişim" sekmesinde, kodlar "Erişim Kodları" ekranında yönetilir.</small></label>
			<label class="field"><span>Süre (dk · boş = sınırsız)</span>
				<input class="input" name="duration_min" type="number" min="0" bind:value={draft.duration_min} /></label>
			<label class="field"><span>İndirme (Mbit/s)</span>
				<input class="input" name="rate_down_mbit" type="number" min="0" step="0.5" bind:value={draft.rate_down_mbit} /></label>
			<label class="field"><span>Yükleme (Mbit/s)</span>
				<input class="input" name="rate_up_mbit" type="number" min="0" step="0.5" bind:value={draft.rate_up_mbit} /></label>
		</div>
		<div class="row">
			<button class="btn btn--accent" type="submit">{editId ? 'Değişiklikleri kaydet' : 'Profili kaydet'}</button>
			<button class="btn btn--ghost" type="button" onclick={() => (showForm = false)}>İptal</button>
		</div>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>Profil</th><th>Lokasyon</th><th>Tür</th><th>Süre</th><th>İndirme</th><th>Yükleme</th><th></th></tr></thead>
		<tbody>
			{#each data.profiles as p (p.id)}
				<tr>
					<td class="name">{p.name}</td>
					<td>{p.site_name || '— tüm lokasyonlar'}</td>
					<td><span class="tag">{kindLabels[p.kind] ?? p.kind}</span></td>
					<td>{fmtDuration(p.duration_min)}</td>
					<td class="mono">{mbit(p.rate_down_kbps) || '—'} <small>Mbit</small></td>
					<td class="mono">{mbit(p.rate_up_kbps) || '—'} <small>Mbit</small></td>
					<td class="right">
						<button class="btn btn--ghost btn--sm" onclick={() => openEdit(p)}>Düzenle</button>
						<form method="POST" action="?/delete" use:enhance={toastEnhance('Profil silindi')} style="display:inline">
							<input type="hidden" name="id" value={p.id} />
							<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `"${p.name}" profili silinsin mi?`)}>×</button>
						</form>
					</td>
				</tr>
			{/each}
			{#if data.profiles.length === 0}
				<tr><td colspan="7" class="empty">Henüz profil yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 48ch; }
	.add { padding: 1.4rem; margin-bottom: 1.4rem; }
	.add .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 0.4rem; }
	.add .field { margin-bottom: 0.6rem; }
	.row { display: flex; gap: 0.8rem; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.85rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.95rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.mono { font-family: var(--font-mono); }
	.mono small { color: var(--ink-soft); font-size: 0.7rem; }
	.right { text-align: right; white-space: nowrap; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); margin-left: 0.4rem; }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.7rem 0.9rem; margin-bottom: 1rem; }
	@media (max-width: 820px) { .add .grid { grid-template-columns: 1fr 1fr; } }
</style>
