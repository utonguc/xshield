<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const t = data.tenant;
	const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(n ?? 0);
	const statusLabel: Record<string, string> = { paid: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş' };

	let planId = $state(t?.plan_id ?? 0);
	let rooms = $state(t?.room_count ?? 0);
	const selPlan = $derived((data.plans ?? []).find((p: any) => p.id === planId));
	const fee = $derived(
		selPlan
			? selPlan.billing_model === 'flat'
				? selPlan.base_fee
				: selPlan.base_fee + selPlan.per_unit_fee * Math.max(0, rooms - selPlan.included_units)
			: (t?.monthly_fee ?? 0)
	);
</script>

<svelte:head><title>{t?.name ?? 'Tenant'} · goX Platform</title></svelte:head>

<a href="/owner/tenants" class="back eyebrow">← Tenantlar</a>

{#if !t}
	<p class="empty">Tenant bulunamadı.</p>
{:else}
	<h1>{t.name}</h1>
	<section class="stats">
		<div class="card sc"><span class="eyebrow">Lokasyon</span><strong>{t.sites}</strong></div>
		<div class="card sc"><span class="eyebrow">Cihaz</span><strong>{t.devices}</strong></div>
		<div class="card sc"><span class="eyebrow">Misafir (MAC)</span><strong>{t.guests}</strong></div>
		<div class="card sc"><span class="eyebrow">Aylık</span><strong>₺{fmt(t.monthly_fee)}</strong></div>
	</section>

	<div class="cols">
		<form class="card" method="POST" action="?/update" use:enhance>
			<h2>Tenant ayarları</h2>
			<label class="field"><span>İşletme adı</span><input class="input" name="name" value={t.name} /></label>
			<div class="g2">
				<label class="field"><span>Sektör</span>
					<select class="input" name="sector" value={t.sector}><option value="cafe">Cafe</option><option value="hotel">Otel</option><option value="office">Ofis</option></select></label>
				<label class="field"><span>Plan</span>
					<select class="input" name="plan_id" bind:value={planId}>
						<option value={0}>— Plan yok (ücreti elle) —</option>
						{#each data.plans as p}<option value={p.id}>{p.name}</option>{/each}
					</select></label>
				{#if selPlan && selPlan.billing_model !== 'flat'}
					<label class="field"><span>{selPlan.billing_model === 'per_room' ? 'Oda sayısı' : 'Cihaz sayısı'}</span><input class="input" name="room_count" type="number" min="0" bind:value={rooms} /></label>
				{:else}
					<input type="hidden" name="room_count" value={rooms} />
				{/if}
				<label class="field"><span>Aylık ücret (₺){#if selPlan}<small> (plandan)</small>{/if}</span>
					<input class="input" name="monthly_fee" type="number" min="0" step="0.01" value={fee} readonly={!!selPlan} /></label>
				<label class="field"><span>Durum</span>
					<select class="input" name="status" value={t.status}><option value="active">Aktif</option><option value="suspended">Askıda</option></select></label>
			</div>
			{#if selPlan && selPlan.billing_model !== 'flat'}
				<p class="planhint">{fmt(selPlan.base_fee)} taban + {selPlan.included_units} dahil, sonra ₺{fmt(selPlan.per_unit_fee)}/{selPlan.billing_model === 'per_room' ? 'oda' : 'cihaz'} → <strong>₺{fmt(fee)}/ay</strong></p>
			{/if}
			<button class="btn btn--accent" type="submit">Kaydet</button>
		</form>

		<div class="card">
			<h2>Ödemeler</h2>
			<form class="payadd" method="POST" action="?/addPayment" use:enhance={() => async ({ update }) => { await update(); }}>
				<input class="input" name="period" placeholder="Dönem (2026-06)" />
				<input class="input" name="amount" type="number" min="0" step="0.01" placeholder="Tutar ₺" required />
				<select class="input" name="status"><option value="paid">Ödendi</option><option value="pending">Bekliyor</option><option value="overdue">Gecikmiş</option></select>
				<button class="btn btn--accent btn--sm" type="submit">+ Ekle</button>
			</form>
			<table class="tbl">
				<thead><tr><th>Dönem</th><th>Tutar</th><th>Durum</th><th>Tarih</th><th></th></tr></thead>
				<tbody>
					{#each data.payments as p (p.id)}
						<tr>
							<td class="mono">{p.period || '—'}</td><td class="mono">₺{fmt(p.amount)}</td>
							<td><span class="tag {p.status === 'paid' ? 'tag--live' : 'tag--off'}">{statusLabel[p.status] ?? p.status}</span></td>
							<td class="mono">{p.date}</td>
							<td class="right"><form method="POST" action="?/delPayment" use:enhance><input type="hidden" name="id" value={p.id} /><button class="del" title="Sil">×</button></form></td>
						</tr>
					{/each}
					{#if data.payments.length === 0}<tr><td colspan="5" class="empty">Ödeme yok.</td></tr>{/if}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<style>
	.back { display: inline-block; text-decoration: none; margin-bottom: 0.8rem; }
	h1 { font-size: 2rem; margin: 0 0 1.2rem; }
	.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); margin-bottom: var(--gap); }
	.sc { padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.2rem; }
	.sc strong { font-family: var(--font-display); font-size: 1.8rem; line-height: 1; }
	.cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); align-items: start; }
	.card { padding: 1.4rem; }
	.card h2 { font-size: 1.2rem; margin: 0 0 1rem; }
	.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
	.planhint { font-size: 0.85rem; color: var(--ink-soft); margin: 0 0 0.9rem; }
	.field span small { color: var(--ink-soft); text-transform: none; letter-spacing: 0; }
	.payadd { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 0.5rem; margin-bottom: 1rem; align-items: center; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.7rem 0 0.5rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.6rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 15%, transparent); font-size: 0.9rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.mono { font-family: var(--font-mono); }
	.right { text-align: right; } .empty { text-align: center; color: var(--ink-soft); padding: 1.2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 26px; height: 26px; cursor: pointer; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } .stats { grid-template-columns: 1fr 1fr; } .payadd { grid-template-columns: 1fr 1fr; } }
</style>
