<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';
	let { children, data } = $props();

	const nav = [
		{ href: '/owner', label: 'Genel Bakış' },
		{ href: '/owner/tenants', label: 'Tenantlar' },
		{ href: '/owner/planlar', label: 'Planlar' },
		{ href: '/owner/tickets', label: 'Destek' }
	];
	const active = (h: string) => (h === '/owner' ? page.url.pathname === h : page.url.pathname.startsWith(h));
</script>

<div class="shell">
	<aside class="rail">
		<a href="/owner" class="rail-brand"><Logo size={28} /><span class="ptag">Platform</span></a>
		<nav class="rail-nav">
			{#each nav as item}
				<a href={item.href} class="rail-link" class:active={active(item.href)}>{item.label}</a>
			{/each}
		</nav>
		<div class="rail-user">
			<div class="avatar">PX</div>
			<div class="who"><strong>Platform Yöneticisi</strong><span>{data.user?.email}</span></div>
		</div>
		<a href="/cikis" class="rail-out" data-sveltekit-preload-data="off">Çıkış →</a>
	</aside>
	<div class="main">
		<div class="view">{@render children()}</div>
	</div>
</div>

<style>
	.shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
	.rail { background: var(--ink); color: var(--paper); display: flex; flex-direction: column; padding: 1.4rem 1rem; gap: 0.4rem; position: sticky; top: 0; height: 100vh; }
	.rail-brand { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.5rem 1.3rem; }
	.rail :global(.word) { color: var(--paper); }
	.ptag { font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.14em; text-transform: uppercase; background: var(--acid); color: var(--ink); padding: 0.15rem 0.4rem; border-radius: 99px; }
	.rail-nav { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
	.rail-link { padding: 0.62rem 0.7rem; border-radius: var(--radius); text-decoration: none; color: var(--paper); font-weight: 500; font-size: 0.95rem; }
	.rail-link:hover { background: rgba(255,255,255,0.07); }
	.rail-link.active { background: var(--acid); color: var(--ink); font-weight: 600; }
	.rail-user { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 0.4rem 0.6rem; border-top: 1.4px solid rgba(241,238,227,0.15); margin-top: 0.6rem; }
	.avatar { width: 36px; height: 36px; display: grid; place-items: center; background: var(--acid); color: var(--ink); border-radius: var(--radius); font-family: var(--font-display); font-weight: 700; font-size: 0.8rem; }
	.who { display: flex; flex-direction: column; line-height: 1.2; }
	.who strong { font-size: 0.82rem; }
	.who span { font-size: 0.68rem; color: rgba(241,238,227,0.55); }
	.rail-out { padding: 0.5rem 0.5rem 0; color: rgba(241,238,227,0.7); text-decoration: none; font-size: 0.85rem; font-family: var(--font-mono); }
	.rail-out:hover { color: var(--acid); }
	.main { min-width: 0; }
	.view { padding: 2rem 1.8rem 3rem; max-width: 1100px; }
	@media (max-width: 820px) { .shell { grid-template-columns: 1fr; } .rail { position: static; height: auto; flex-direction: row; flex-wrap: wrap; } .rail-nav { flex-direction: row; } }
</style>
