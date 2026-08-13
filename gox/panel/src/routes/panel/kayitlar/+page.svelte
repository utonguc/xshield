<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toastEnhance, confirmAction } from '$lib/ui.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const methodLabel: Record<string, string> = {
		guest: 'Misafir', staff: 'Personel', voucher: 'Kod', mernis: 'TC', pms: 'Oda',
		email: 'E-posta', whatsapp: 'WhatsApp', none: 'Otomatik', '': 'Otomatik'
	};

	let q = $state('');
	let fMethod = $state('');
	let fStatus = $state('');

	const all = $derived((data.connections ?? []) as any[]);
	const methods = $derived([...new Set(all.map((c) => c.method).filter(Boolean))]);
	const multiSite = $derived(new Set(all.map((c) => c.site_name)).size > 1);

	const rows = $derived(
		all.filter((c) => {
			if (q) {
				const s = q.toLowerCase();
				if (!(`${c.mac}`.includes(s) || `${c.identity}`.toLowerCase().includes(s) || `${c.ip}`.includes(s))) return false;
			}
			if (fMethod && c.method !== fMethod) return false;
			if (fStatus === 'online' && !c.online) return false;
			if (fStatus === 'offline' && c.online) return false;
			if (fStatus === 'blocked' && c.list_type !== 'blacklist') return false;
			return true;
		})
	);
	const onlineCount = $derived(all.filter((c) => c.online).length);

	function dur(s: number) {
		if (!s || s < 0) return '—';
		const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
		if (h > 0) return `${h}sa ${m}dk`;
		if (m > 0) return `${m}dk`;
		return `${s}sn`;
	}
	function mbps(kbps: number | null) {
		if (!kbps) return '';
		return (kbps / 1024).toFixed(kbps / 1024 < 10 ? 1 : 0) + ' Mb';
	}

	async function confirmSubmit(e: Event, message: string, label: string) {
		const form = (e.currentTarget as HTMLElement).closest('form');
		if (!form) return;
		if (await confirmAction(message, { confirmLabel: label, danger: true })) {
			await tick();
			(form as HTMLFormElement).requestSubmit();
		}
	}

	onMount(() => {
		const t = setInterval(() => invalidateAll(), 10000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>Bağlantılar · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Misafir cihazları</p>
		<h1>Bağlantılar</h1>
		<p class="sub">Giriş yapan ve oturumdaki tüm cihazlar. Filtreleyin, satırdan çıkarın veya engelleyin.</p>
	</div>
	<div class="live"><span class="dot on"></span> {onlineCount} çevrimiçi · {all.length} kayıt</div>
</section>

<section class="filters">
	<input class="input" placeholder="Ara: kimlik, MAC, IP" bind:value={q} />
	<select class="input" bind:value={fMethod}>
		<option value="">Tüm yöntemler</option>
		{#each methods as m}<option value={m}>{methodLabel[m] ?? m}</option>{/each}
	</select>
	<select class="input" bind:value={fStatus}>
		<option value="">Tüm durumlar</option>
		<option value="online">Çevrimiçi</option>
		<option value="offline">Çevrimdışı</option>
		<option value="blocked">Engelli</option>
	</select>
	<button class="btn btn--ghost btn--sm" type="button" onclick={() => invalidateAll()}>Yenile</button>
</section>

<section class="card list">
	<table class="tbl">
		<thead>
			<tr>
				<th>Durum</th><th>Kimlik</th><th>Yöntem</th><th>MAC</th><th>IP</th>
				{#if multiSite}<th>Lokasyon</th>{/if}
				<th>Cihaz</th><th>Süre</th><th>Hız/Profil</th><th>Son görülme</th><th></th>
			</tr>
		</thead>
		<tbody>
			{#each rows as c (c.mac + c.site_id)}
				<tr class:blocked={c.list_type === 'blacklist'}>
					<td>
						{#if c.list_type === 'blacklist'}<span class="badge red">Engelli</span>
						{:else if c.online}<span class="dot on"></span> <span class="st">Çevrimiçi</span>
						{:else}<span class="dot off"></span> <span class="st off">Çevrimdışı</span>{/if}
					</td>
					<td class="name">{c.identity || '—'}</td>
					<td><span class="up">{methodLabel[c.method] ?? c.method ?? 'Otomatik'}</span></td>
					<td class="mono">{c.mac}</td>
					<td class="mono">{c.ip || '—'}</td>
					{#if multiSite}<td>{c.site_name || '—'}</td>{/if}
					<td>{c.device || '—'}</td>
					<td class="mono">{dur(c.uptime_s)}</td>
					<td class="mono">{c.profile || (c.down_kbps ? '' : '—')}{#if c.down_kbps}<span class="rate"> {mbps(c.down_kbps)}↓</span>{/if}</td>
					<td class="mono dim">{c.last_seen || '—'}</td>
					<td class="right">
						<form method="POST" action="?/kick" use:enhance={toastEnhance('Misafir çıkarıldı')} style="display:inline">
							<input type="hidden" name="site_id" value={c.site_id} /><input type="hidden" name="mac" value={c.mac} />
							<button class="act" type="button" title="Çıkar (erişimi sonlandır)"
								onclick={(e) => confirmSubmit(e, `${c.identity || c.mac} bağlantısı sonlandırılsın mı?`, 'Çıkar')}>Çıkar</button>
						</form>
						{#if c.list_type === 'blacklist'}
							<form method="POST" action="?/allow" use:enhance={toastEnhance('Engel kaldırıldı')} style="display:inline">
								<input type="hidden" name="site_id" value={c.site_id} /><input type="hidden" name="mac" value={c.mac} />
								<button class="act ok" type="submit" title="Engeli kaldır">İzin ver</button>
							</form>
						{:else}
							<form method="POST" action="?/block" use:enhance={toastEnhance('Cihaz engellendi')} style="display:inline">
								<input type="hidden" name="site_id" value={c.site_id} /><input type="hidden" name="mac" value={c.mac} />
								<button class="act danger" type="button" title="Engelle (tekrar bağlanamaz)"
									onclick={(e) => confirmSubmit(e, `${c.identity || c.mac} kalıcı engellensin mi?`, 'Engelle')}>Engelle</button>
							</form>
						{/if}
					</td>
				</tr>
			{/each}
			{#if rows.length === 0}
				<tr><td colspan={multiSite ? 11 : 10} class="empty">Eşleşen bağlantı yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 56ch; }
	.live { font-family: var(--font-mono); font-size: 0.8rem; color: var(--ink-soft); white-space: nowrap; }
	.filters { display: flex; gap: 0.6rem; margin-bottom: 1rem; flex-wrap: wrap; }
	.filters .input { width: auto; }
	.filters .input:first-child { min-width: 220px; flex: 1; max-width: 360px; }
	.list { padding: 0.2rem 1.2rem 0.8rem; overflow-x: auto; }
	.tbl { width: 100%; border-collapse: collapse; min-width: 820px; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.9rem 0.5rem 0.6rem 0; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.6rem 0.5rem 0.6rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 15%, transparent); font-size: 0.9rem; vertical-align: middle; }
	.tbl tr:last-child td { border-bottom: none; }
	.tbl tr.blocked { opacity: 0.65; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.mono { font-family: var(--font-mono); font-size: 0.82rem; }
	.dim { color: var(--ink-soft); }
	.up { font-family: var(--font-mono); font-size: 0.66rem; text-transform: uppercase; background: var(--paper-2); border: 1px solid var(--line); border-radius: 99px; padding: 0.1rem 0.45rem; }
	.rate { color: var(--ink-soft); }
	.dot { display: inline-block; width: 8px; height: 8px; border-radius: 99px; }
	.dot.on { background: var(--ok); } .dot.off { background: var(--ink-mute); }
	.st { font-size: 0.82rem; } .st.off { color: var(--ink-soft); }
	.badge { font-family: var(--font-mono); font-size: 0.62rem; font-weight: 700; text-transform: uppercase; padding: 0.12rem 0.45rem; border-radius: 99px; border: 1px solid var(--line); }
	.badge.red { background: color-mix(in srgb, var(--danger) 16%, var(--card)); border-color: var(--danger); color: var(--danger); }
	.right { text-align: right; white-space: nowrap; }
	.act { background: transparent; border: 1.3px solid var(--line); border-radius: var(--radius); padding: 0.3rem 0.6rem; cursor: pointer; font-size: 0.78rem; color: var(--ink); margin-left: 0.3rem; font-weight: 600; }
	.act:hover { background: var(--ink); color: var(--paper); }
	.act.danger:hover { background: var(--danger); border-color: var(--danger); color: #fff; }
	.act.ok { border-color: var(--ok); color: var(--ok); }
	.act.ok:hover { background: var(--ok); color: #fff; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	@media (max-width: 720px) { .filters .input:first-child { max-width: none; } }
</style>
