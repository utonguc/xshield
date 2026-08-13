<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();
	let alerts = $state<any[]>(data.init?.alerts ?? []);
	let cfg = $state<any>({ ...data.settings });
	let savedMsg = $state('');
	let showSettings = $state(false);

	onMount(() => {
		const t = setInterval(refresh, 7000);
		return () => clearInterval(t);
	});
	async function refresh() {
		try { const r = await fetch('/panel/uyarilar/list'); if (r.ok) alerts = (await r.json()).alerts ?? []; } catch {}
	}
	async function ack(id: number) {
		await fetch(`/panel/uyarilar/${id}/ack`, { method: 'POST' });
		await refresh();
	}
	async function saveSettings() {
		const body = {
			enabled: !!cfg.enabled,
			offline_sec: Number(cfg.offline_sec) || 120,
			cpu_pct: Number(cfg.cpu_pct) || 90,
			mem_pct: Number(cfg.mem_pct) || 90,
			temp_c: Number(cfg.temp_c) || 75,
			telegram_token: cfg.telegram_token ?? '',
			telegram_chat: cfg.telegram_chat ?? ''
		};
		const r = await fetch('/panel/uyarilar/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
		savedMsg = r.ok ? 'Kaydedildi.' : 'Kaydedilemedi.';
		setTimeout(() => (savedMsg = ''), 2500);
	}
	const active = $derived(alerts.filter((a) => a.status === 'active' && !a.acknowledged));
	const history = $derived(alerts.filter((a) => a.status !== 'active' || a.acknowledged).slice(0, 40));
	const tlabel: any = { offline: 'Çevrimdışı', high_cpu: 'Yüksek CPU', high_mem: 'Yüksek RAM' };
</script>

<svelte:head><title>Uyarılar · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">İzleme</p><h1>Uyarılar {#if active.length}<span class="cnt">{active.length}</span>{/if}</h1></div>
	<button class="btn btn--ghost" onclick={() => (showSettings = !showSettings)}>{showSettings ? 'Kapat' : 'Ayarlar'}</button>
</section>

{#if showSettings}
	<section class="card setbox">
		<h2>Alarm ayarları</h2>
		<label class="chk"><input type="checkbox" bind:checked={cfg.enabled} /> Uyarılar açık</label>
		<div class="grid">
			<label class="field"><span>Çevrimdışı eşiği (sn)</span><input class="input" type="number" bind:value={cfg.offline_sec} /></label>
			<label class="field"><span>CPU eşiği (%)</span><input class="input" type="number" bind:value={cfg.cpu_pct} /></label>
			<label class="field"><span>RAM eşiği (%)</span><input class="input" type="number" bind:value={cfg.mem_pct} /></label>
			<label class="field"><span>Sıcaklık eşiği (°C)</span><input class="input" type="number" bind:value={cfg.temp_c} /></label>
		</div>
		<h3>Telegram bildirimi (opsiyonel)</h3>
		<p class="hint">Doldurursanız alarmlar Telegram'a da düşer. BotFather'dan bot token + sohbet (chat) ID.</p>
		<div class="grid">
			<label class="field"><span>Bot token</span><input class="input" bind:value={cfg.telegram_token} placeholder="123456:ABC..." /></label>
			<label class="field"><span>Chat ID</span><input class="input" bind:value={cfg.telegram_chat} placeholder="-1001234567890" /></label>
		</div>
		<div class="row"><button class="btn btn--accent" onclick={saveSettings}>Kaydet</button>{#if savedMsg}<span class="ok">{savedMsg}</span>{/if}</div>
	</section>
{/if}

<section class="card block">
	<div class="bh"><h2>Aktif uyarılar</h2><span class="tag tag--live">● canlı</span></div>
	{#if active.length === 0}
		<p class="none">Aktif uyarı yok — her şey yolunda.</p>
	{:else}
		{#each active as a (a.id)}
			<div class="alert {a.severity}">
				<span class="sev">{a.severity === 'critical' ? '●' : '▲'}</span>
				<div class="amsg"><strong>{a.message}</strong><small>{tlabel[a.type] ?? a.type} · {a.started_at}</small></div>
				<button class="btn btn--ghost btn--sm" onclick={() => ack(a.id)}>Onayla</button>
			</div>
		{/each}
	{/if}
</section>

{#if history.length}
	<section class="card block">
		<div class="bh"><h2>Geçmiş</h2></div>
		<table class="tbl">
			<thead><tr><th>Cihaz</th><th>Tür</th><th>Başlangıç</th><th>Durum</th></tr></thead>
			<tbody>
				{#each history as a (a.id)}
					<tr>
						<td>{a.device}</td>
						<td>{tlabel[a.type] ?? a.type}</td>
						<td class="mono">{a.started_at}</td>
						<td>{#if a.status === 'resolved'}<span class="tag tag--ok2">düzeldi {a.resolved_at}</span>{:else}<span class="tag tag--off">onaylandı</span>{/if}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.4rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0; display: flex; align-items: center; gap: 0.6rem; }
	.cnt { font-family: var(--font-mono); font-size: 1rem; background: var(--danger); color: #fff; border-radius: 99px; padding: 0.1rem 0.6rem; }
	.block { padding: 1.2rem 1.4rem; margin-bottom: var(--gap); }
	.bh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
	.none { color: var(--ink-soft); padding: 0.6rem 0; }
	.alert { display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem 0.9rem; border: 1.4px solid var(--line); border-radius: 6px; margin-bottom: 0.6rem; }
	.alert.critical { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 8%, var(--card)); }
	.alert.warning { border-color: color-mix(in srgb, var(--danger) 40%, var(--line)); }
	.sev { font-size: 1rem; color: var(--danger); }
	.amsg { flex: 1; display: flex; flex-direction: column; line-height: 1.2; }
	.amsg small { color: var(--ink-soft); font-size: 0.78rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0 0 0.6rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.6rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.9rem; }
	.mono { font-family: var(--font-mono); font-size: 0.82rem; }
	.tag--ok2 { background: color-mix(in srgb, var(--ok) 22%, var(--card)); border-color: var(--ok); }

	.setbox { padding: 1.4rem; margin-bottom: var(--gap); }
	.setbox h2 { font-size: 1.3rem; margin-bottom: 0.8rem; }
	.setbox h3 { font-size: 1rem; margin: 1.2rem 0 0.3rem; }
	.chk { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-weight: 500; }
	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.4rem; }
	.field span { font-size: 0.8rem; color: var(--ink-soft); }
	.hint { font-size: 0.84rem; color: var(--ink-soft); margin: 0.2rem 0 0.6rem; }
	.row { display: flex; align-items: center; gap: 0.8rem; margin-top: 0.8rem; }
	.ok { color: var(--ok); font-size: 0.9rem; }
	@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
</style>
