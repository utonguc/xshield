<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	// Canlı veri: SSR ilk yük + 5 sn'de bir /panel/canli'den tazelenir (cihaz ajanı yazıyor).
	let ov = $state(data.ov);
	const sector: string = data.sector;

	onMount(() => {
		const t = setInterval(async () => {
			try {
				const r = await fetch('/panel/canli');
				if (r.ok) {
					const j = await r.json();
					if (j) ov = j;
				}
			} catch {
				/* sessiz geç */
			}
		}, 5000);
		return () => clearInterval(t);
	});

	function fmtBps(b: number): string {
		if (!b || b < 0) return '0';
		if (b >= 1e9) return (b / 1e9).toFixed(1) + ' Gb/s';
		if (b >= 1e6) return (b / 1e6).toFixed(1) + ' Mb/s';
		if (b >= 1e3) return Math.round(b / 1e3) + ' kb/s';
		return b + ' b/s';
	}
	function fmtDur(s: number | null): string {
		if (s == null) return 'Sınırsız';
		if (s < 60) return s + ' sn';
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		if (h > 0) return h + 'sa ' + String(m).padStart(2, '0') + 'dk';
		return m + ' dk';
	}

	const stats = $derived.by(() => {
		const s = ov?.stats ?? {};
		const arr: { k: string; v: string | number; d: string }[] = [
			{ k: 'Şu an bağlı', v: s.connected ?? 0, d: 'misafir' },
			{ k: 'Anlık indirme', v: fmtBps(s.download_bps ?? 0), d: 'tüm lokasyonlar' },
			{ k: 'Aktif lokasyon', v: s.active_sites ?? 0, d: 'çevrimiçi' },
			{ k: 'Personel', v: s.staff_count ?? 0, d: 'kayıtlı' }
		];
		if (sector === 'hotel') arr.push({ k: 'PMS · in-house', v: s.pms_inhouse ?? 0, d: 'otelde' });
		arr.push({ k: 'Anket yanıtı', v: s.survey_week ?? 0, d: 'bu hafta' });
		return arr;
	});

	const guests = $derived.by(() =>
		(ov?.guests ?? []).map((g: any) => ({
			ad: 'Cihaz · ' + String(g.mac ?? '').slice(-5).toLowerCase(),
			tur: g.type ?? '—',
			sure: fmtDur(g.uptime_s ?? 0),
			kalan: fmtDur(g.time_left_s),
			durum: g.time_left_s != null && g.time_left_s < 300 ? 'warn' : 'on'
		}))
	);

	const options = $derived(ov?.options ?? []);

	// Abonelik / plan
	const plan = data.plan;
	const fmtTl = (n: number) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round(n ?? 0));
	const unitWord = $derived(plan?.plan?.billing_model === 'per_device' ? 'cihaz' : 'oda');
	// limit kullanım yüzdesi + uyarı eşiği (>=%80 sarı, dolu kırmızı)
	function usePct(cur: number, max: number) {
		if (!max || max <= 0) return 0;
		return Math.min(100, Math.round((cur / max) * 100));
	}
	const locMax = $derived(plan?.plan?.max_locations ?? 0);
	const devMax = $derived(plan?.plan?.max_devices ?? 0);
	const locCur = $derived(plan?.usage?.sites ?? 0);
	const devCur = $derived(plan?.usage?.devices ?? 0);
</script>

<svelte:head><title>Genel Bakış · goX</title></svelte:head>

{#if plan?.has_plan}
	<section class="card sub">
		<div class="sub-main">
			<div>
				<span class="eyebrow">Aboneliğiniz</span>
				<h2>{plan.plan.name}</h2>
				<p class="subdesc">
					{#if plan.plan.billing_model === 'per_room'}
						{plan.room_count} oda · {fmtTl(plan.plan.base_fee)} taban + {plan.plan.included_units} dahil, sonra {fmtTl(plan.plan.per_unit_fee)}/oda
					{:else if plan.plan.billing_model === 'per_device'}
						{plan.usage.devices} cihaz · {fmtTl(plan.plan.base_fee)} taban + {plan.plan.included_units} dahil, sonra {fmtTl(plan.plan.per_unit_fee)}/cihaz
					{:else}
						Sabit aylık paket
					{/if}
				</p>
			</div>
			<div class="subfee">
				<strong>{fmtTl(plan.monthly_fee)}</strong><span>/ay</span>
			</div>
		</div>
		<div class="meters">
			<div class="meter">
				<div class="ml"><span>Lokasyon</span><span class="mv">{locCur}{#if locMax > 0} / {locMax}{:else} / ∞{/if}</span></div>
				{#if locMax > 0}<div class="bar"><i class:warn={usePct(locCur, locMax) >= 80} style="width:{usePct(locCur, locMax)}%"></i></div>{/if}
			</div>
			<div class="meter">
				<div class="ml"><span>Cihaz</span><span class="mv">{devCur}{#if devMax > 0} / {devMax}{:else} / ∞{/if}</span></div>
				{#if devMax > 0}<div class="bar"><i class:warn={usePct(devCur, devMax) >= 80} style="width:{usePct(devCur, devMax)}%"></i></div>{/if}
			</div>
		</div>
		{#if plan.plan.features?.length}
			<ul class="subfeats">{#each plan.plan.features as f}<li>{f}</li>{/each}</ul>
		{/if}
	</section>
{/if}

<!-- istatistikler -->
<section class="stats">
	{#each stats as s}
		<div class="card stat">
			<span class="eyebrow">{s.k}</span>
			<strong class="num">{s.v}</strong>
			<span class="unit">{s.d}</span>
		</div>
	{/each}
</section>

<div class="cols">
	<!-- şu an bağlı -->
	<section class="card panel-block">
		<div class="bh">
			<h2>Şu an bağlı olanlar</h2>
			<span class="tag tag--live">● canlı</span>
		</div>
		<table class="tbl">
			<thead>
				<tr><th>Ziyaretçi</th><th>Tür</th><th>Süre</th><th>Kalan</th></tr>
			</thead>
			<tbody>
				{#each guests as g}
					<tr>
						<td class="mono">{g.ad}</td>
						<td>{g.tur}</td>
						<td>{g.sure}</td>
						<td><span class="dot {g.durum}"></span>{g.kalan}</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="empty">Şu an bağlı misafir yok</td></tr>
				{/each}
			</tbody>
		</table>
	</section>

	<!-- giriş seçenekleri -->
	<section class="card panel-block">
		<div class="bh"><h2>Giriş seçenekleri</h2></div>
		<ul class="opts">
			{#each options as o}
				<li>
					<span>{o.ad}</span>
					<span class="tag {o.acik ? 'tag--live' : 'tag--off'}">{o.acik ? 'açık' : 'kapalı'}</span>
				</li>
			{/each}
		</ul>
		<a class="btn btn--ghost btn--sm" href="/panel/karsilama">Karşılama ekranını düzenle →</a>
	</section>
</div>

<style>
	.sub { padding: 1.3rem 1.4rem; margin-bottom: var(--gap); }
	.sub-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	.sub h2 { font-size: 1.4rem; margin: 0.3rem 0 0; }
	.subdesc { color: var(--ink-soft); font-size: 0.88rem; margin: 0.3rem 0 0; }
	.subfee { text-align: right; white-space: nowrap; }
	.subfee strong { font-family: var(--font-display); font-size: 2rem; letter-spacing: -0.03em; }
	.subfee span { color: var(--ink-soft); }
	.meters { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1.6rem; margin-top: 1rem; }
	.ml { display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.3rem; }
	.ml .mv { font-family: var(--font-mono); }
	.bar { height: 7px; background: var(--paper-2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
	.bar i { display: block; height: 100%; background: var(--ok); }
	.bar i.warn { background: var(--danger); }
	.subfeats { list-style: none; margin: 1rem 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; }
	.subfeats li { font-size: 0.84rem; padding-left: 1.1rem; position: relative; color: var(--ink-soft); }
	.subfeats li::before { content: '✓'; position: absolute; left: 0; color: var(--ok); font-weight: 700; }

	.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap); margin-bottom: var(--gap); }
	.stat { padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 0.3rem; }
	.num { font-family: var(--font-display); font-size: 2.4rem; line-height: 1; letter-spacing: -0.03em; }
	.unit { font-size: 0.82rem; color: var(--ink-soft); }

	.cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--gap); }
	.panel-block { padding: 1.3rem 1.4rem 1.5rem; }
	.bh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1rem; }
	.bh h2 { font-size: 1.2rem; }

	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 0 0 0.6rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.72rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.empty { color: var(--ink-soft); text-align: center; padding: 1.6rem 0; }
	.mono { font-family: var(--font-mono); font-size: 0.85rem; }
	.dot { display: inline-block; width: 8px; height: 8px; border-radius: 99px; margin-right: 0.5rem; background: var(--ok); }
	.dot.warn { background: var(--danger); }

	.opts { list-style: none; margin: 0 0 1.2rem; padding: 0; }
	.opts li { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-weight: 500; }
	.opts li:last-child { border-bottom: none; }

	@media (max-width: 980px) {
		.stats { grid-template-columns: repeat(2, 1fr); }
		.cols { grid-template-columns: 1fr; }
	}
	@media (max-width: 520px) {
		.meters { grid-template-columns: 1fr; }
		.subfee { text-align: left; }
	}
</style>
