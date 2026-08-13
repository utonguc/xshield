<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Menü filtresi:
	//  - Çok lokasyonlu: lokasyon seçiliyken tenant(ortak) menüleri gizle; "tüm lokasyonlar"da loc menüleri gizle.
	//  - Tek lokasyonlu (multi=false): tek lokasyon otomatik aktiftir; HEM tenant HEM loc menüleri göster.
	function navItems(g: any) {
		const multi = (data.sites?.length ?? 0) > 1;
		const locActive = (data.activeLocId ?? 0) !== 0;
		return g.items.filter(
			(it: any) =>
				(!('sector' in it) || it.sector === data.sector) &&
				!(it.tenant && locActive && multi) &&
				!(it.loc && !locActive)
		);
	}

	async function changeLoc(e: Event) {
		const site_id = Number((e.target as HTMLSelectElement).value);
		await fetch('/panel/loc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ site_id }) });
		location.reload();
	}

	const initials = $derived(
		(data.user?.email ?? '?')
			.split('@')[0]
			.split(/[._-]/)
			.slice(0, 2)
			.map((s) => s.charAt(0).toUpperCase())
			.join('') || 'GX'
	);

	const groups = [
		{ title: '', items: [
			{ href: '/panel', label: 'Genel Bakış', built: true },
			{ href: '/panel/raporlar', label: 'Raporlar', built: true, tenant: true }
		] },
		{ title: 'Ağ Yönetimi', items: [
			{ href: '/panel/lokasyonlar', label: 'Lokasyonlar', built: true, tenant: true },
			{ href: '/panel/cihazlar', label: 'Cihazlar', built: true },
			{ href: '/panel/izleme', label: 'İzleme', built: true },
			{ href: '/panel/uyarilar', label: 'Uyarılar', built: true, badge: true },
			{ href: '/panel/profiller', label: 'Erişim Profilleri', built: true, loc: true },
			{ href: '/panel/erisim', label: 'Erişim Listesi', built: true, loc: true },
			{ href: '/panel/personel', label: 'Personel', built: true, loc: true },
			{ href: '/panel/voucher', label: 'Erişim Kodları', built: true, loc: true }
		] },
		{ title: 'Misafir Deneyimi', items: [
			{ href: '/panel/karsilama', label: 'Karşılama Ekranı', built: true, loc: true },
			{ href: '/panel/menu', label: 'QR Menü', built: true, sector: 'cafe', loc: true },
			{ href: '/panel/misafirler', label: 'Misafirler', built: true, sector: 'hotel', loc: true }
		] },
		{ title: 'CRM', items: [
			{ href: '/panel/anketler', label: 'Anketler', built: true, loc: true },
			{ href: '/panel/geribildirim', label: 'Geri Bildirimler', built: true, loc: true },
			{ href: '/panel/kayitlar', label: 'Bağlantılar', built: true }
		] },
		{ title: 'Hesap', items: [
			{ href: '/panel/kullanicilar', label: 'Kullanıcılar', built: true, tenant: true },
			{ href: '/panel/yasal', label: 'Yasal Loglar (5651)', built: true, tenant: true },
			{ href: '/panel/destek', label: 'Destek', built: true },
			{ href: '/panel/ayarlar', label: 'Ayarlar', built: true }
		] }
	];

	let mobileOpen = $state(false);
	const items = $derived(groups.flatMap((g) => g.items));
	const current = $derived(items.find((n) => page.url.pathname === n.href || (n.href !== '/panel' && page.url.pathname.startsWith(n.href)))?.label ?? 'Genel Bakış');
</script>

<div class="shell">
	<aside class="rail" class:open={mobileOpen}>
		<a href="/panel" class="rail-brand"><Logo size={28} /></a>
		{#if data.canSwitch && data.sites && data.sites.length > 1}
			<div class="locswitch">
				<span class="loclbl">Lokasyon</span>
				<select class="locsel" onchange={changeLoc} value={String(data.activeLocId ?? 0)}>
					<option value="0">Tüm lokasyonlar</option>
					{#each data.sites as s}<option value={String(s.id)}>{s.name}</option>{/each}
				</select>
			</div>
		{/if}
		<nav class="rail-nav">
			{#each groups as g}
				{@const items = navItems(g)}
				{#if items.length}
					{#if g.title}<span class="rail-group">{g.title}</span>{/if}
					{#each items as item}
						{#if item.built}
							<a href={item.href} class="rail-link"
								class:active={page.url.pathname === item.href || (item.href !== '/panel' && page.url.pathname.startsWith(item.href))}
								onclick={() => (mobileOpen = false)}>
								{item.label}
								{#if 'badge' in item && item.badge && data.alertCount > 0}<span class="navbadge">{data.alertCount}</span>{/if}
							</a>
						{:else}
							<span class="rail-link disabled">{item.label}<span class="soon">yakında</span></span>
						{/if}
					{/each}
				{/if}
			{/each}
		</nav>
		<div class="rail-user">
			<div class="avatar">{initials}</div>
			<div class="who">
				<strong>{data.user?.role === 'owner' ? 'Platform Yöneticisi' : 'İşletme Yöneticisi'}</strong>
				<span>{data.user?.email}</span>
			</div>
		</div>
		<a href="/cikis" class="rail-out" data-sveltekit-preload-data="off">Çıkış →</a>
	</aside>

	<div class="main">
		{#if data.imp}
			<div class="impbar">
				<span>Destek modu — <strong>{data.imp}</strong> olarak görüntülüyorsunuz</span>
				<a href="/owner/exit" data-sveltekit-preload-data="off">Platform paneline dön →</a>
			</div>
		{/if}
		<header class="topbar">
			<button class="burger" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Menü">≡</button>
			<div class="crumb"><span class="eyebrow">Panel /</span> <strong>{current}</strong></div>
			<span class="tag tag--live">● 1 lokasyon aktif</span>
		</header>
		<div class="view">
			{@render children()}
		</div>
	</div>
</div>

<Toaster />
<ConfirmDialog />

<style>
	.shell { display: grid; grid-template-columns: 252px 1fr; min-height: 100vh; }

	.rail { background: var(--ink); color: var(--paper); display: flex; flex-direction: column; padding: 1.4rem 1rem; gap: 0.4rem; position: sticky; top: 0; height: 100vh; }
	.rail-brand { padding: 0.3rem 0.5rem 1.3rem; }
	/* logoyu koyu zeminde okunur kıl */
	.rail :global(.word) { color: var(--paper); }
	.rail-nav { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; overflow-y: auto; }
	.rail-group { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(241,238,227,0.4); padding: 0.9rem 0.7rem 0.35rem; }
	.rail-link { display: flex; align-items: center; justify-content: space-between; padding: 0.62rem 0.7rem; border-radius: var(--radius); text-decoration: none; color: var(--paper); font-weight: 500; font-size: 0.95rem; border: 1.4px solid transparent; }
	.rail-link:hover:not(.disabled) { background: rgba(255,255,255,0.07); }
	.rail-link.active { background: var(--acid); color: var(--ink); font-weight: 600; }
	.rail-link.disabled { color: rgba(241,238,227,0.4); cursor: default; }
	.soon { font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.1em; text-transform: uppercase; border: 1px solid rgba(241,238,227,0.25); padding: 0.1rem 0.3rem; border-radius: 99px; }
	.navbadge { font-family: var(--font-mono); font-size: 0.62rem; font-weight: 700; background: var(--danger); color: #fff; border-radius: 99px; padding: 0.05rem 0.4rem; min-width: 1.1rem; text-align: center; }
	.locswitch { margin: 0.2rem 0 0.6rem; display: flex; flex-direction: column; gap: 0.25rem; }
	.loclbl { font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(241,238,227,0.55); }
	.locsel { width: 100%; padding: 0.45rem 0.55rem; border-radius: var(--radius); border: 1.4px solid rgba(241,238,227,0.25); background: rgba(241,238,227,0.06); color: var(--paper); font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.locsel option { color: #111; }

	.rail-user { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 0.4rem 0.6rem; border-top: 1.4px solid rgba(241,238,227,0.15); margin-top: 0.6rem; }
	.avatar { width: 36px; height: 36px; display: grid; place-items: center; background: var(--acid); color: var(--ink); border-radius: var(--radius); font-family: var(--font-display); font-weight: 700; font-size: 0.85rem; }
	.who { display: flex; flex-direction: column; line-height: 1.2; }
	.who strong { font-size: 0.82rem; }
	.who span { font-size: 0.7rem; color: rgba(241,238,227,0.55); }
	.rail-out { padding: 0.5rem 0.5rem 0; color: rgba(241,238,227,0.7); text-decoration: none; font-size: 0.85rem; font-family: var(--font-mono); }
	.rail-out:hover { color: var(--acid); }

	.main { display: flex; flex-direction: column; min-width: 0; }
	.impbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: var(--acid); color: var(--ink); padding: 0.5rem 1.6rem; font-size: 0.88rem; border-bottom: 1.5px solid var(--ink); }
	.impbar a { font-family: var(--font-mono); font-size: 0.78rem; text-decoration: underline; }
	.topbar { display: flex; align-items: center; gap: 1rem; height: 64px; padding: 0 1.6rem; border-bottom: 1.5px solid var(--line); background: var(--paper); position: sticky; top: 0; z-index: 5; }
	.crumb { flex: 1; display: flex; align-items: center; gap: 0.5rem; }
	.crumb strong { font-family: var(--font-display); font-size: 1.05rem; }
	.burger { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--ink); }
	.view { padding: 2rem 1.6rem 3rem; }

	@media (max-width: 820px) {
		.shell { grid-template-columns: 1fr; }
		.rail { position: fixed; left: 0; top: 0; width: 252px; transform: translateX(-100%); transition: transform .2s ease; z-index: 20; }
		.rail.open { transform: translateX(0); }
		.burger { display: block; }
	}
</style>
