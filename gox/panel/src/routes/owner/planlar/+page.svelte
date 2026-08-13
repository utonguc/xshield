<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	let adding = $state(false);
	let editId = $state<number | null>(null);

	const sectorLabel: Record<string, string> = { all: 'Tümü', hotel: 'Otel', cafe: 'Cafe', restaurant: 'Restoran', office: 'Ofis' };
	const modelLabel: Record<string, string> = { flat: 'Sabit ücret', per_room: 'Oda başı', per_device: 'Cihaz başı' };
	const fmt = (n: number) => '₺' + new Intl.NumberFormat('tr-TR').format(n ?? 0);

	function calc(p: any, units: number) {
		if (p.billing_model === 'per_room' || p.billing_model === 'per_device') {
			return (p.base_fee ?? 0) + (p.per_unit_fee ?? 0) * Math.max(0, units - (p.included_units ?? 0));
		}
		return p.base_fee ?? 0;
	}

	// canlı önizleme için form değerlerini izleyen geçici state
	let pv = $state({ billing_model: 'flat', base_fee: 0, included_units: 0, per_unit_fee: 0, units: 50 });
	const pvFee = $derived(calc(pv, pv.units));

	function startEdit(p: any) {
		editId = p.id;
		adding = false;
		pv = { billing_model: p.billing_model, base_fee: p.base_fee, included_units: p.included_units, per_unit_fee: p.per_unit_fee, units: 50 };
	}
	function startAdd() {
		adding = !adding;
		editId = null;
		pv = { billing_model: 'per_room', base_fee: 0, included_units: 0, per_unit_fee: 0, units: 50 };
	}
</script>

<svelte:head><title>Planlar · goX Platform</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Faturalama</p><h1>Planlar</h1></div>
	<button class="btn btn--accent btn--inline" onclick={startAdd}>{adding ? 'Kapat' : '+ Yeni plan'}</button>
</section>

<p class="lede" style="margin-bottom:1.4rem">Müşterilere atanan plan kataloğu. Otel planlarında ücret <strong>oda sayısına</strong> göre otomatik hesaplanır: taban ücret + dahil üstü her oda için birim ücret.</p>

{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if adding}
	{@render editor(null, '?/create')}
{/if}

<section class="plans">
	{#each data.plans as p (p.id)}
		{#if editId === p.id}
			{@render editor(p, '?/update')}
		{:else}
			<div class="card plan" class:off={!p.active}>
				<div class="ptop">
					<div>
						<span class="tag {p.sector === 'hotel' ? 'tag--live' : 'tag--off'}">{sectorLabel[p.sector] ?? p.sector}</span>
						{#if !p.active}<span class="tag tag--off">Pasif</span>{/if}
						<h3>{p.name}</h3>
					</div>
					<div class="pactions">
						<button class="btn btn--ghost btn--sm btn--inline" onclick={() => startEdit(p)}>Düzenle</button>
						<form method="POST" action="?/delete" use:enhance style="display:inline">
							<input type="hidden" name="id" value={p.id} />
							<button class="del" type="submit" title="Sil" onclick={(e) => { if (!confirm(`"${p.name}" planı silinsin mi?`)) e.preventDefault(); }}>×</button>
						</form>
					</div>
				</div>
				<div class="pricing">
					<span class="model">{modelLabel[p.billing_model]}</span>
					{#if p.billing_model === 'flat'}
						<strong>{fmt(p.base_fee)}<small>/ay</small></strong>
					{:else}
						<strong>{fmt(p.base_fee)}<small>/ay taban</small></strong>
						<span class="perunit">{p.included_units} dahil, sonra {fmt(p.per_unit_fee)}/{p.billing_model === 'per_room' ? 'oda' : 'cihaz'}</span>
						<span class="ex">Örn. 60 {p.billing_model === 'per_room' ? 'oda' : 'cihaz'}: <b>{fmt(calc(p, 60))}/ay</b></span>
					{/if}
				</div>
				{#if p.features?.length}
					<ul class="feats">{#each p.features as f}<li>{f}</li>{/each}</ul>
				{/if}
				<div class="limits">
					{#if p.max_locations > 0}<span>{p.max_locations} lokasyon</span>{:else}<span>Sınırsız lokasyon</span>{/if}
					{#if p.max_devices > 0}<span>{p.max_devices} cihaz</span>{:else}<span>Sınırsız cihaz</span>{/if}
				</div>
			</div>
		{/if}
	{/each}
	{#if data.plans.length === 0 && !adding}<p class="empty">Henüz plan yok. Sağ üstten ekleyin.</p>{/if}
</section>

{#snippet editor(p: any, action: string)}
	<form class="card edit" method="POST" {action} use:enhance={() => async ({ update }) => { await update({ reset: false }); adding = false; editId = null; }}>
		{#if p}<input type="hidden" name="id" value={p.id} />{/if}
		<h3>{p ? 'Planı düzenle' : 'Yeni plan'}</h3>
		<div class="grid">
			<label class="field"><span>Plan adı</span><input class="input" name="name" value={p?.name ?? ''} required /></label>
			<label class="field"><span>Sektör</span>
				<select class="input" name="sector" value={p?.sector ?? 'hotel'}>
					<option value="all">Tümü</option><option value="hotel">Otel</option><option value="cafe">Cafe</option><option value="restaurant">Restoran</option><option value="office">Ofis</option>
				</select></label>
			<label class="field"><span>Faturalama modeli</span>
				<select class="input" name="billing_model" bind:value={pv.billing_model}>
					<option value="flat">Sabit ücret</option><option value="per_room">Oda başı (otel)</option><option value="per_device">Cihaz başı</option>
				</select></label>
			<label class="field"><span>Taban aylık ücret (₺)</span><input class="input" name="base_fee" type="number" min="0" step="0.01" bind:value={pv.base_fee} /></label>
			{#if pv.billing_model !== 'flat'}
				<label class="field"><span>Tabana dahil {pv.billing_model === 'per_room' ? 'oda' : 'cihaz'}</span><input class="input" name="included_units" type="number" min="0" bind:value={pv.included_units} /></label>
				<label class="field"><span>Dahil üstü birim ücret (₺)</span><input class="input" name="per_unit_fee" type="number" min="0" step="0.01" bind:value={pv.per_unit_fee} /></label>
			{:else}
				<input type="hidden" name="included_units" value="0" />
				<input type="hidden" name="per_unit_fee" value="0" />
			{/if}
			<label class="field"><span>Maks. lokasyon (0=sınırsız)</span><input class="input" name="max_locations" type="number" min="0" value={p?.max_locations ?? 0} /></label>
			<label class="field"><span>Maks. cihaz (0=sınırsız)</span><input class="input" name="max_devices" type="number" min="0" value={p?.max_devices ?? 0} /></label>
			<label class="field"><span>Sıra</span><input class="input" name="sort" type="number" value={p?.sort ?? 0} /></label>
		</div>
		<label class="field"><span>Özellikler (her satır bir madde)</span><textarea class="input" name="features" rows="4">{(p?.features ?? []).join('\n')}</textarea></label>
		<label class="chk"><input type="checkbox" name="active" checked={p ? p.active : true} /> Plan aktif (yeni tenanta atanabilir)</label>

		{#if pv.billing_model !== 'flat'}
			<div class="pvbox">
				<span>Önizleme:</span>
				<input class="input pvin" type="number" min="0" bind:value={pv.units} />
				<span>{pv.billing_model === 'per_room' ? 'oda' : 'cihaz'} →</span>
				<strong>{fmt(pvFee)}/ay</strong>
			</div>
		{/if}

		<div class="erow">
			<button class="btn btn--accent btn--inline" type="submit">{p ? 'Kaydet' : 'Plan oluştur'}</button>
			<button class="btn btn--ghost btn--inline" type="button" onclick={() => { adding = false; editId = null; }}>Vazgeç</button>
		</div>
	</form>
{/snippet}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.plans { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--gap); }
	.plan { padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 0.7rem; }
	.plan.off { opacity: 0.6; }
	.ptop { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; }
	.ptop h3 { font-size: 1.25rem; margin: 0.5rem 0 0; }
	.pactions { display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
	.pricing { display: flex; flex-direction: column; gap: 0.2rem; border-top: 1px solid color-mix(in srgb, var(--line) 18%, transparent); padding-top: 0.6rem; }
	.pricing .model { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); }
	.pricing strong { font-family: var(--font-display); font-size: 1.7rem; letter-spacing: -0.02em; }
	.pricing strong small { font-size: 0.8rem; font-weight: 500; color: var(--ink-soft); margin-left: 0.2rem; }
	.perunit { font-size: 0.85rem; color: var(--ink-soft); }
	.ex { font-size: 0.8rem; color: var(--ink-soft); }
	.feats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
	.feats li { font-size: 0.86rem; padding-left: 1.1rem; position: relative; }
	.feats li::before { content: '✓'; position: absolute; left: 0; color: var(--ok); font-weight: 700; }
	.limits { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: auto; }
	.limits span { font-family: var(--font-mono); font-size: 0.66rem; background: var(--paper-2); border: 1px solid var(--line); border-radius: 99px; padding: 0.15rem 0.5rem; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 28px; height: 28px; cursor: pointer; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.empty { color: var(--ink-soft); }

	.edit { padding: 1.4rem; grid-column: 1 / -1; }
	.edit h3 { margin-bottom: 1rem; }
	.edit .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 0.6rem; }
	.field { margin: 0; }
	.chk { display: flex; align-items: center; gap: 0.5rem; margin: 0.4rem 0 0.8rem; font-weight: 500; }
	.pvbox { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; background: color-mix(in srgb, var(--acid) 16%, var(--card)); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.6rem 0.9rem; margin-bottom: 0.9rem; }
	.pvbox strong { font-family: var(--font-display); font-size: 1.2rem; }
	.pvin { width: 90px; }
	.erow { display: flex; gap: 0.6rem; flex-wrap: wrap; }
	@media (max-width: 720px) { .edit .grid { grid-template-columns: 1fr 1fr; } }
	@media (max-width: 480px) { .edit .grid { grid-template-columns: 1fr; } }
</style>
