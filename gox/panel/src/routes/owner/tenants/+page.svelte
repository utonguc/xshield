<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
	const sectorLabel: Record<string, string> = { hotel: 'Otel', cafe: 'Cafe', office: 'Ofis' };
	const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(n ?? 0);

	let planId = $state(0);
	let rooms = $state(0);
	const selPlan = $derived((data.plans ?? []).find((p: any) => p.id === planId));
	const fee = $derived(
		selPlan
			? selPlan.billing_model === 'flat'
				? selPlan.base_fee
				: selPlan.base_fee + selPlan.per_unit_fee * Math.max(0, rooms - selPlan.included_units)
			: 0
	);
</script>

<svelte:head><title>Tenantlar · goX Platform</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Müşteriler</p><h1>Tenantlar</h1></div>
	<button class="btn btn--accent" onclick={() => (adding = !adding)}>{adding ? 'Kapat' : '+ Yeni tenant'}</button>
</section>

{#if form?.error}<p class="err">{form.error}</p>{/if}
{#if form?.created}
	<div class="card created">
		<p class="eyebrow" style="color:var(--ok)">Tenant oluşturuldu — {form.created.name}</p>
		<p>Yönetici giriş bilgilerini tenant'a iletin (yalnızca burada gösterilir):</p>
		<div class="creds"><div><span class="eyebrow">E-posta</span><code>{form.created.email}</code></div><div><span class="eyebrow">Parola</span><code>{form.created.password}</code></div></div>
	</div>
{/if}

{#if adding}
	<form class="card add" method="POST" action="?/create" use:enhance={() => async ({ update }) => { await update({ reset: false }); adding = false; }}>
		<div class="grid">
			<label class="field"><span>İşletme adı</span><input class="input" name="name" required /></label>
			<label class="field"><span>Sektör</span>
				<select class="input" name="sector"><option value="cafe">Cafe</option><option value="hotel">Otel</option><option value="office">Ofis</option></select></label>
			<label class="field"><span>Plan</span>
				<select class="input" name="plan_id" bind:value={planId}>
					<option value={0}>— Plan seç —</option>
					{#each data.plans as p}<option value={p.id}>{p.name}</option>{/each}
				</select></label>
			{#if selPlan && selPlan.billing_model !== 'flat'}
				<label class="field"><span>{selPlan.billing_model === 'per_room' ? 'Oda sayısı' : 'Cihaz sayısı'}</span><input class="input" name="room_count" type="number" min="0" bind:value={rooms} /></label>
			{:else}
				<input type="hidden" name="room_count" value="0" />
			{/if}
			<label class="field"><span>Yönetici e-posta</span><input class="input" name="admin_email" type="email" required /></label>
			<label class="field"><span>Parola (boş = otomatik)</span><input class="input" name="admin_password" placeholder="otomatik üret" /></label>
		</div>
		{#if selPlan}
			<div class="feebox">
				Hesaplanan aylık ücret: <strong>₺{fmt(fee)}</strong>
				<input type="hidden" name="monthly_fee" value={fee} />
				{#if selPlan.billing_model !== 'flat'}<small>({fmt(selPlan.base_fee)} taban + {selPlan.included_units} dahil, sonra ₺{fmt(selPlan.per_unit_fee)}/{selPlan.billing_model === 'per_room' ? 'oda' : 'cihaz'})</small>{/if}
			</div>
		{:else}
			<input type="hidden" name="monthly_fee" value="0" />
		{/if}
		<button class="btn btn--accent" type="submit">Tenant oluştur</button>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>İşletme</th><th>Sektör</th><th>Plan</th><th>Aylık</th><th>Lok.</th><th>Cihaz</th><th>Durum</th><th></th></tr></thead>
		<tbody>
			{#each data.tenants as t (t.id)}
				<tr>
					<td class="name">{t.name}</td>
					<td class="up">{sectorLabel[t.sector] ?? t.sector}</td>
					<td>{t.plan_name || t.plan}{#if t.room_count > 0}<small class="rc"> · {t.room_count} oda</small>{/if}</td>
					<td class="mono">₺{fmt(t.monthly_fee)}</td>
					<td class="mono">{t.sites}</td>
					<td class="mono">{t.devices}</td>
					<td><span class="tag {t.status === 'active' ? 'tag--live' : 'tag--off'}">{t.status === 'active' ? 'Aktif' : 'Askıda'}</span></td>
					<td class="right">
						<a class="btn btn--ghost btn--sm" href={`/owner/tenants/${t.id}`}>Detay</a>
						<form method="POST" action="?/impersonate" use:enhance style="display:inline">
							<input type="hidden" name="id" value={t.id} />
							<button class="btn btn--accent btn--sm" type="submit">Panele gir</button>
						</form>
						<form method="POST" action="?/toggle" use:enhance style="display:inline">
							<input type="hidden" name="id" value={t.id} />
							<input type="hidden" name="status" value={t.status === 'active' ? 'suspended' : 'active'} />
							<button class="btn btn--ghost btn--sm" type="submit">{t.status === 'active' ? 'Askıya al' : 'Aktif et'}</button>
						</form>
						<form method="POST" action="?/delete" use:enhance style="display:inline">
							<input type="hidden" name="id" value={t.id} />
							<button class="del" type="submit" title="Sil">×</button>
						</form>
					</td>
				</tr>
			{/each}
			{#if data.tenants.length === 0}<tr><td colspan="8" class="empty">Henüz tenant yok.</td></tr>{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.created { padding: 1.4rem; margin-bottom: 1.2rem; border-color: var(--ok); }
	.creds { display: flex; gap: 2rem; margin-top: 0.8rem; flex-wrap: wrap; }
	.creds code { font-family: var(--font-mono); font-size: 1.05rem; display: block; }
	.add { padding: 1.5rem; margin-bottom: 1.2rem; }
	.add .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 0.6rem; }
	.feebox { background: color-mix(in srgb, var(--acid) 16%, var(--card)); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.6rem 0.9rem; margin-bottom: 0.8rem; }
	.feebox strong { font-family: var(--font-display); font-size: 1.2rem; }
	.feebox small { color: var(--ink-soft); margin-left: 0.4rem; }
	.rc { color: var(--ink-soft); font-family: var(--font-mono); font-size: 0.72rem; }
	.list { padding: 0.4rem 1.4rem 0.8rem; overflow-x: auto; }
	.tbl { width: 100%; border-collapse: collapse; min-width: 720px; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.9rem 0 0.6rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.7rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.9rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.up { font-family: var(--font-mono); font-size: 0.74rem; text-transform: uppercase; }
	.mono { font-family: var(--font-mono); }
	.right { text-align: right; white-space: nowrap; }
	.empty { text-align: center; color: var(--ink-soft); padding: 1.6rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 28px; height: 28px; cursor: pointer; color: var(--ink); margin-left: 0.3rem; }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	@media (max-width: 820px) { .add .grid { grid-template-columns: 1fr 1fr; } }
</style>
