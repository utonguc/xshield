<script lang="ts">
	let { data } = $props();
	const r = $derived(data.report ?? { locations: [], totals: {} });
	const t = $derived(r.totals ?? {});
	const a = $derived(data.analytics);
	const methodLabel: Record<string, string> = {
		guest: 'Misafir', temp: '2 saat', meeting: 'Toplantı', staff: 'Personel',
		mernis: 'TC', pms: 'Oda', voucher: 'Kod', '-': 'Diğer'
	};
	function pct(list: { count: number }[], v: number) {
		const m = Math.max(1, ...list.map((x) => x.count));
		return Math.round((v / m) * 100);
	}
	function fmtBps(b: number) {
		if (!b || b < 0) return '0';
		if (b >= 1e9) return (b / 1e9).toFixed(1) + ' Gb/s';
		if (b >= 1e6) return (b / 1e6).toFixed(1) + ' Mb/s';
		if (b >= 1e3) return Math.round(b / 1e3) + ' kb/s';
		return b + ' b/s';
	}
</script>

<svelte:head><title>Konsolide Rapor · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Tenant</p><h1>Konsolide Rapor</h1>
		<p class="sub">Tüm lokasyonların özeti tek ekranda — lokasyon kırılımlı.</p></div>
</section>

{#if data.forbidden}
	<p class="info">Konsolide rapor yalnız tenant yöneticisine açıktır.</p>
{:else}
	{#if a}
		<section class="card anblock">
			<div class="anhead">
				<h2>Misafir Analitiği</h2>
				<form class="filters" method="GET">
					<select class="input" name="site">
						<option value="">Tüm lokasyonlar</option>
						{#each data.sites as s}<option value={s.id} selected={String(s.id) === data.filters.site}>{s.name}</option>{/each}
					</select>
					<input class="input" name="from" type="date" value={data.filters.from} />
					<input class="input" name="to" type="date" value={data.filters.to} />
					<button class="btn btn--accent btn--sm" type="submit">Filtrele</button>
					<a class="btn btn--ghost btn--sm" href="?">Temizle</a>
				</form>
			</div>
			<div class="anstats">
				<div class="ast"><span class="eyebrow">Toplam giriş</span><strong>{a.total}</strong></div>
				<div class="ast"><span class="eyebrow">Benzersiz cihaz</span><strong>{a.unique}</strong></div>
			</div>
			<div class="charts">
				<div class="chart">
					<p class="ctitle">Günlük giriş</p>
					<div class="bars">
						{#each a.by_day as d}<div class="barcol" title={`${d.label}: ${d.count}`}><div class="bar" style="height:{pct(a.by_day, d.count)}%"></div><span class="bl">{d.label.slice(5)}</span></div>{/each}
						{#if a.by_day.length === 0}<p class="note">Veri yok.</p>{/if}
					</div>
				</div>
				<div class="chart">
					<p class="ctitle">Saatlik yoğunluk</p>
					<div class="bars">
						{#each a.by_hour as d}<div class="barcol" title={`${d.label}:00 — ${d.count}`}><div class="bar" style="height:{pct(a.by_hour, d.count)}%"></div><span class="bl">{d.label}</span></div>{/each}
						{#if a.by_hour.length === 0}<p class="note">Veri yok.</p>{/if}
					</div>
				</div>
			</div>
			<div class="charts">
				<div class="chart">
					<p class="ctitle">Yönteme göre</p>
					{#each a.by_method as d}<div class="hrow"><span class="hl">{methodLabel[d.label] ?? d.label}</span><div class="htrack"><div class="hbar" style="width:{pct(a.by_method, d.count)}%"></div></div><span class="hv">{d.count}</span></div>{/each}
				</div>
				<div class="chart">
					<p class="ctitle">Lokasyona göre</p>
					{#each a.by_site as d}<div class="hrow"><span class="hl">{d.label}</span><div class="htrack"><div class="hbar" style="width:{pct(a.by_site, d.count)}%"></div></div><span class="hv">{d.count}</span></div>{/each}
				</div>
			</div>
		</section>
	{/if}

	<section class="sum">
		<div class="card s"><span class="eyebrow">Lokasyon</span><strong>{t.locations ?? 0}</strong></div>
		<div class="card s"><span class="eyebrow">Online cihaz</span><strong>{t.devices_online ?? 0}<i>/{t.devices_total ?? 0}</i></strong></div>
		<div class="card s"><span class="eyebrow">Bağlı misafir</span><strong>{t.guests ?? 0}</strong></div>
		<div class="card s"><span class="eyebrow">↓ İndirme</span><strong>{fmtBps(t.rx_bps ?? 0)}</strong></div>
		<div class="card s"><span class="eyebrow">Otelde (PMS)</span><strong>{t.inhouse ?? 0}</strong></div>
		<div class="card s"><span class="eyebrow">Aktif alarm</span><strong class:warn={(t.alerts ?? 0) > 0}>{t.alerts ?? 0}</strong></div>
	</section>

	<section class="card list">
		<table class="tbl">
			<thead><tr>
				<th>Lokasyon</th><th>Cihaz</th><th>Misafir</th><th>↓ Bant</th><th>Otelde</th><th>Memnuniyet</th><th>Alarm</th>
			</tr></thead>
			<tbody>
				{#each r.locations as l (l.site_id)}
					<tr>
						<td class="name">{l.name}</td>
						<td><span class="dot {l.devices_online > 0 ? 'on' : 'off'}"></span>{l.devices_online}/{l.devices_total}</td>
						<td>{l.guests}</td>
						<td class="mono">{fmtBps(l.rx_bps)}</td>
						<td>{l.inhouse}</td>
						<td>{l.feedback_count > 0 ? (l.feedback_avg.toFixed(1) + ' ★ (' + l.feedback_count + ')') : '—'}</td>
						<td>{#if l.alerts > 0}<span class="abadge">{l.alerts}</span>{:else}—{/if}</td>
					</tr>
				{/each}
				{#if r.locations.length === 0}<tr><td colspan="7" class="empty">Lokasyon yok.</td></tr>{/if}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.head { margin-bottom: 1.4rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; }
	.sum { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--gap); margin-bottom: var(--gap); }
	.s { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; }
	.s strong { font-family: var(--font-display); font-size: 1.7rem; line-height: 1; }
	.s strong i { font-style: normal; font-size: 0.9rem; color: var(--ink-soft); }
	.s strong.warn { color: var(--danger); }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.8rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.mono { font-family: var(--font-mono); font-size: 0.85rem; }
	.dot { display: inline-block; width: 8px; height: 8px; border-radius: 99px; margin-right: 0.45rem; background: var(--ok); }
	.dot.off { background: var(--ink-mute); }
	.abadge { font-family: var(--font-mono); font-weight: 700; background: var(--danger); color: #fff; border-radius: 99px; padding: 0.05rem 0.45rem; font-size: 0.78rem; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	@media (max-width: 980px) { .sum { grid-template-columns: repeat(3, 1fr); } }

	.anblock { padding: 1.2rem 1.4rem; margin-bottom: var(--gap); }
	.anhead { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
	.anhead h2 { font-size: 1.15rem; margin: 0; }
	.filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
	.filters .input { min-width: 120px; }
	.anstats { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
	.ast strong { font-family: var(--font-display); font-size: 1.8rem; display: block; }
	.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; margin-bottom: 1rem; }
	.ctitle { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 0.6rem; }
	.bars { display: flex; align-items: flex-end; gap: 3px; height: 110px; overflow-x: auto; }
	.barcol { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 16px; flex: 1; height: 100%; }
	.bar { width: 70%; background: var(--acid); border-radius: 3px 3px 0 0; min-height: 2px; }
	.bl { font-size: 0.55rem; color: var(--ink-soft); margin-top: 2px; white-space: nowrap; }
	.hrow { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
	.hl { width: 90px; font-size: 0.82rem; flex: none; }
	.htrack { flex: 1; background: var(--paper-2); border-radius: 99px; height: 14px; overflow: hidden; }
	.hbar { height: 100%; background: var(--acid); border-radius: 99px; }
	.hv { width: 40px; text-align: right; font-family: var(--font-mono); font-size: 0.8rem; }
	.note { color: var(--ink-soft); font-size: 0.85rem; }
	@media (max-width: 820px) { .charts { grid-template-columns: 1fr; } }
</style>
