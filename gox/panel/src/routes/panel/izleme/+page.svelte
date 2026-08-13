<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();
	let mon = $state<any>(data.mon);
	let detail = $state<any>({ open: false, dev: null, range: '1h', points: [], loading: false });

	onMount(() => {
		const t = setInterval(refresh, 5000);
		return () => clearInterval(t);
	});
	async function refresh() {
		try { const r = await fetch('/panel/izleme/canli'); if (r.ok) mon = await r.json(); } catch {}
		if (detail.open) loadDetail();
	}
	function fmtBps(b: number) {
		if (!b || b < 0) return '0';
		if (b >= 1e9) return (b / 1e9).toFixed(1) + ' Gb/s';
		if (b >= 1e6) return (b / 1e6).toFixed(1) + ' Mb/s';
		if (b >= 1e3) return Math.round(b / 1e3) + ' kb/s';
		return b + ' b/s';
	}
	function fmtUp(s: number) {
		if (!s) return '—';
		const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
		if (d > 0) return `${d}g ${h}sa`;
		if (h > 0) return `${h}sa ${m}dk`;
		return `${m} dk`;
	}
	async function openDetail(dev: any) { detail = { open: true, dev, range: '1h', points: [], loading: true }; await loadDetail(); }
	async function loadDetail() {
		if (!detail.dev) return;
		try { const r = await fetch(`/panel/cihazlar/${detail.dev.id}/metrics?range=${detail.range}`); detail.points = (await r.json()).points ?? []; } catch {}
		detail.loading = false;
	}
	function setRange(rg: string) { detail.range = rg; detail.loading = true; loadDetail(); }
	function linePath(vals: number[], w: number, h: number, pad = 3) {
		if (!vals.length) return '';
		const max = Math.max(...vals, 1), n = vals.length, dx = n > 1 ? (w - 2 * pad) / (n - 1) : 0;
		return vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * dx).toFixed(1)},${(h - pad - (v / max) * (h - 2 * pad)).toFixed(1)}`).join(' ');
	}

	const sum = $derived(mon?.summary ?? {});
	const devices = $derived(mon?.devices ?? []);
</script>

<svelte:head><title>İzleme · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Filo</p><h1>İzleme</h1></div>
	<span class="tag tag--live">● canlı</span>
</section>

<section class="sum">
	<div class="card s"><span class="eyebrow">Online cihaz</span><strong>{sum.online ?? 0}<i>/{sum.total ?? 0}</i></strong></div>
	<div class="card s"><span class="eyebrow">Bağlı misafir</span><strong>{sum.active_guests ?? 0}</strong></div>
	<div class="card s"><span class="eyebrow">↓ İndirme</span><strong>{fmtBps(sum.rx_bps ?? 0)}</strong></div>
	<div class="card s"><span class="eyebrow">↑ Yükleme</span><strong>{fmtBps(sum.tx_bps ?? 0)}</strong></div>
</section>

<section class="fleet">
	{#each devices as d (d.id)}
		<button class="card dcard" onclick={() => openDetail(d)}>
			<div class="dh">
				<span class="dot {d.live ? 'on' : 'off'}"></span>
				<div class="dn"><strong>{d.name}</strong><small>{d.site}</small></div>
				<span class="tag {d.live ? 'tag--live' : 'tag--off'}">{d.live ? 'online' : (d.status === 'pending' ? 'bekliyor' : 'çevrimdışı')}</span>
			</div>
			<div class="dmeta">{d.board || '—'}{#if d.version} · v{(d.version || '').split(' ')[0]}{/if} · ↑{fmtUp(d.uptime_s)}{#if d.temp_c}<span class="temp" class:hot={d.temp_c >= 70}> · {d.temp_c}°C</span>{/if}</div>
			<div class="bar"><span class="bl">CPU</span><div class="bt"><div class="bf" style="width:{Math.min(100, d.cpu)}%"></div></div><span class="bv">%{d.cpu}</span></div>
			<div class="bar"><span class="bl">RAM</span><div class="bt"><div class="bf" style="width:{Math.min(100, d.mem_pct)}%"></div></div><span class="bv">%{d.mem_pct}</span></div>
			<div class="dstats">
				<span>{d.active} misafir</span>
				<span class="mono">↓{fmtBps(d.rx_bps)}</span>
				<span class="mono">↑{fmtBps(d.tx_bps)}</span>
			</div>
		</button>
	{/each}
	{#if devices.length === 0}
		<p class="empty">Henüz cihaz yok. <a href="/panel/cihazlar">Cihaz ekleyin →</a></p>
	{/if}
</section>

{#if detail.open}
	<div class="overlay" onclick={() => (detail.open = false)} role="presentation">
		<div class="modal card card--raised" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="mhead">
				<div><p class="eyebrow">İzleme · {detail.dev.board}</p><h3>{detail.dev.name}</h3></div>
				<button class="del" onclick={() => (detail.open = false)}>×</button>
			</div>
			<div class="ranges">
				{#each [['1h', 'Son 1s'], ['6h', 'Son 6s'], ['24h', 'Son 24s']] as [rg, lbl]}
					<button class="rb" class:on={detail.range === rg} onclick={() => setRange(rg)}>{lbl}</button>
				{/each}
			</div>
			{#if detail.dev.sensors && Object.keys(detail.dev.sensors).length}
				<div class="sensors">
					{#each Object.entries(detail.dev.sensors) as [name, s]}
						<div class="sensor"><span class="sn">{name}</span><strong>{(s as any).value}{(s as any).unit ? ' ' + (s as any).unit : ''}</strong></div>
					{/each}
				</div>
			{/if}
			{#if detail.loading && !detail.points.length}<p class="mono">yükleniyor…</p>
			{:else if !detail.points.length}<p class="mono">Bu aralıkta veri yok.</p>
			{:else}
				{@const rx = detail.points.map((p: any) => p.rx_bps)}
				{@const tx = detail.points.map((p: any) => p.tx_bps)}
				{@const cpu = detail.points.map((p: any) => p.cpu)}
				{@const act = detail.points.map((p: any) => p.active)}
				{@const tmp = detail.points.map((p: any) => p.temp_c ?? 0)}
				<div class="gtitle">Bant genişliği <span class="lg"><i class="rx"></i>indirme <i class="tx"></i>yükleme</span></div>
				<svg class="graph" viewBox="0 0 300 70" preserveAspectRatio="none">
					<path d={linePath(rx, 300, 70)} class="grx" /><path d={linePath(tx, 300, 70)} class="gtx" />
				</svg>
				<div class="gtitle">CPU %</div>
				<svg class="graph" viewBox="0 0 300 50" preserveAspectRatio="none"><path d={linePath(cpu, 300, 50)} class="gcpu" /></svg>
				{#if tmp.some((v: number) => v > 0)}
					<div class="gtitle">Sıcaklık °C</div>
					<svg class="graph" viewBox="0 0 300 50" preserveAspectRatio="none"><path d={linePath(tmp, 300, 50)} class="gtmp" /></svg>
				{/if}
				<div class="gtitle">Bağlı misafir</div>
				<svg class="graph" viewBox="0 0 300 50" preserveAspectRatio="none"><path d={linePath(act, 300, 50)} class="gact" /></svg>
			{/if}
		</div>
	</div>
{/if}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.4rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0; }
	.sum { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); margin-bottom: var(--gap); }
	.s { padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.3rem; }
	.s strong { font-family: var(--font-display); font-size: 1.9rem; line-height: 1; }
	.s strong i { font-style: normal; font-size: 1rem; color: var(--ink-soft); }
	.fleet { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--gap); }
	.dcard { text-align: left; padding: 1.1rem 1.2rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.6rem; font: inherit; }
	.dcard:hover { border-color: var(--ink); }
	.dh { display: flex; align-items: center; gap: 0.6rem; }
	.dot { width: 9px; height: 9px; border-radius: 99px; background: var(--ok); flex: none; }
	.dot.off { background: var(--ink-mute); }
	.dn { flex: 1; display: flex; flex-direction: column; line-height: 1.1; }
	.dn strong { font-family: var(--font-display); }
	.dn small { color: var(--ink-soft); font-size: 0.78rem; }
	.dmeta { font-family: var(--font-mono); font-size: 0.68rem; color: var(--ink-soft); }
	.bar { display: flex; align-items: center; gap: 0.5rem; }
	.bl { font-family: var(--font-mono); font-size: 0.6rem; width: 28px; color: var(--ink-soft); }
	.bt { flex: 1; height: 7px; background: color-mix(in srgb, var(--line) 30%, transparent); border-radius: 99px; overflow: hidden; }
	.bf { height: 100%; background: var(--acid); }
	.bv { font-family: var(--font-mono); font-size: 0.7rem; width: 36px; text-align: right; }
	.dstats { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--ink-soft); border-top: 1px solid color-mix(in srgb, var(--line) 20%, transparent); padding-top: 0.5rem; }
	.mono { font-family: var(--font-mono); font-size: 0.78rem; }
	.empty { color: var(--ink-soft); padding: 2rem; }
	.empty a { text-decoration: underline; }

	.overlay { position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 55%, transparent); display: grid; place-items: center; padding: 1.5rem; z-index: 50; }
	.modal { width: 100%; max-width: 560px; padding: 1.5rem; }
	.mhead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; }
	.mhead h3 { font-size: 1.3rem; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; }
	.ranges { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
	.rb { padding: 0.35rem 0.8rem; border: 1.4px solid var(--line); border-radius: 99px; background: var(--paper); cursor: pointer; font-size: 0.8rem; font-family: var(--font-mono); }
	.rb.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.gtitle { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-soft); margin: 0.9rem 0 0.3rem; display: flex; justify-content: space-between; }
	.lg i { display: inline-block; width: 10px; height: 3px; margin: 0 0.2rem 0 0.5rem; vertical-align: middle; }
	.lg i.rx { background: var(--acid); } .lg i.tx { background: var(--ink); }
	.graph { width: 100%; height: 70px; background: color-mix(in srgb, var(--line) 10%, transparent); border-radius: 5px; }
	.graph path { fill: none; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
	.grx { stroke: var(--acid); } .gtx { stroke: var(--ink); } .gcpu { stroke: var(--danger); } .gact { stroke: var(--ink); } .gtmp { stroke: #e07a1f; }
	.temp.hot { color: var(--danger); font-weight: 700; }
	.sensors { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 0.5rem; }
	.sensor { border: 1.4px solid var(--line); border-radius: 6px; padding: 0.4rem 0.7rem; display: flex; flex-direction: column; gap: 0.1rem; }
	.sn { font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
	.sensor strong { font-family: var(--font-display); font-size: 1.05rem; }

	@media (max-width: 760px) { .sum { grid-template-columns: repeat(2, 1fr); } }
</style>
