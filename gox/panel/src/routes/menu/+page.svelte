<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n ?? 0);
</script>

<svelte:head><title>{data.brand} · Menü</title><meta name="viewport" content="width=device-width, initial-scale=1" /></svelte:head>

<div class="screen">
	<header class="top">
		<span class="brand">{data.brand}</span>
		<h1>Menü</h1>
	</header>

	{#each data.categories as c}
		<section class="cat">
			<h2>{c.name}</h2>
			{#each c.items as it}
				<div class="item">
					<div class="info"><strong>{it.name}</strong>{#if it.description}<span class="desc">{it.description}</span>{/if}</div>
					<span class="price">₺{fmt(it.price)}</span>
				</div>
			{/each}
			{#if c.items.length === 0}<p class="empty">—</p>{/if}
		</section>
	{/each}
	{#if data.categories.length === 0}
		<p class="empty">Menü hazırlanıyor.</p>
	{/if}
	<div class="foot">Powered by goX</div>
</div>

<style>
	.screen { max-width: 480px; margin: 0 auto; min-height: 100vh; padding: 1.5rem 1.25rem 3rem; }
	.top { text-align: center; margin-bottom: 1.8rem; }
	.brand { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase; background: var(--acid); color: var(--ink); padding: 0.35rem 0.7rem; border: 1.4px solid var(--ink); border-radius: 99px; }
	.top h1 { font-family: var(--font-display); font-size: 2.4rem; margin: 0.8rem 0 0; }
	.cat { margin-bottom: 1.8rem; }
	.cat h2 { font-family: var(--font-display); font-size: 1.2rem; border-bottom: 2.5px solid var(--ink); padding-bottom: 0.4rem; margin: 0 0 0.7rem; }
	.item { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid color-mix(in srgb, var(--ink) 12%, transparent); }
	.info { display: flex; flex-direction: column; }
	.info strong { font-weight: 600; }
	.desc { font-size: 0.82rem; color: var(--ink-soft); }
	.price { font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }
	.empty { color: var(--ink-soft); text-align: center; }
	.foot { margin-top: 2rem; text-align: center; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute); }
</style>
