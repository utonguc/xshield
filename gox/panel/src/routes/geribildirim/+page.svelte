<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let rating = $state(0);
	let comment = $state('');
	let name = $state('');
	let done = $state(false);
	let sending = $state(false);

	async function submit() {
		sending = true;
		try {
			const res = await fetch('/api/feedback', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: Number(data.site), rating, comment, name })
			});
			if (res.ok) done = true;
		} finally { sending = false; }
	}
</script>

<svelte:head><title>{data.brand} · Geri Bildirim</title><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></svelte:head>

<div class="screen">
	<div class="card">
		<div class="brand">{data.brand}</div>
		{#if done}
			<h1>Teşekkürler</h1>
			<p class="lead">Geri bildiriminiz bizim için değerli.</p>
		{:else}
			<h1>Deneyiminiz nasıldı?</h1>
			<div class="rating">
				{#each [1, 2, 3, 4, 5] as n}
					<button class="star" class:on={rating >= n} type="button" onclick={() => (rating = n)}>★</button>
				{/each}
			</div>
			<textarea class="input" bind:value={comment} rows="3" placeholder="Yorumunuz (opsiyonel)"></textarea>
			<input class="input" bind:value={name} placeholder="Adınız (opsiyonel)" />
			<button class="cta" type="button" onclick={submit} disabled={sending || rating === 0}>{sending ? 'Gönderiliyor…' : 'Gönder'}</button>
		{/if}
		<div class="foot">Powered by goX</div>
	</div>
</div>

<style>
	.screen { min-height: 100vh; display: grid; place-items: center; padding: 1.25rem; background: radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--acid) 26%, transparent), transparent 60%), var(--paper); }
	.card { width: 100%; max-width: 400px; background: var(--card); border: 1.5px solid var(--ink); border-radius: 6px; box-shadow: 6px 6px 0 0 var(--ink); padding: 2rem 1.6rem 1.3rem; text-align: center; }
	.brand { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase; background: var(--acid); color: var(--ink); padding: 0.35rem 0.7rem; border: 1.4px solid var(--ink); border-radius: 99px; margin-bottom: 1.2rem; }
	h1 { font-family: var(--font-display); font-weight: 600; font-size: 1.7rem; margin: 0 0 1.2rem; }
	.lead { color: var(--ink-soft); }
	.rating { display: flex; gap: 0.4rem; justify-content: center; margin-bottom: 1rem; }
	.star { font-size: 2.4rem; line-height: 1; background: none; border: none; cursor: pointer; color: color-mix(in srgb, var(--ink) 22%, transparent); }
	.star.on { color: var(--acid); -webkit-text-stroke: 1px var(--ink); }
	.input { width: 100%; margin-bottom: 0.7rem; font-family: var(--font-text); }
	textarea.input { resize: vertical; }
	.cta { width: 100%; margin-top: 0.3rem; padding: 0.9rem; background: var(--ink); color: var(--paper); border: none; border-radius: 5px; font-family: var(--font-display); font-weight: 600; font-size: 1rem; cursor: pointer; }
	.cta:disabled { opacity: 0.5; }
	.foot { margin-top: 1.4rem; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute); }
</style>
