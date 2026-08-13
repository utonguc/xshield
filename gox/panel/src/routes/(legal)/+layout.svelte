<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	let { children } = $props();
</script>

<div class="legal">
	<header class="lhead">
		<a href="/" class="brand"><Logo size={28} /></a>
		<nav>
			<a href="/gizlilik">Gizlilik</a>
			<a href="/kosullar">Koşullar</a>
			<a href="/veri-silme">Veri Silme</a>
		</nav>
	</header>
	<main class="lbody">
		{@render children()}
	</main>
	<footer class="lfoot">
		<span>© {new Date().getFullYear()} goX · bir xShield ürünü</span>
		<a href="mailto:info@xshield.com.tr">info@xshield.com.tr</a>
	</footer>
</div>

<style>
	.legal { max-width: 820px; margin: 0 auto; padding: 0 1.4rem 4rem; }
	.lhead { display: flex; align-items: center; justify-content: space-between; gap: 1rem; height: 72px; border-bottom: 1.5px solid var(--line); flex-wrap: wrap; }
	.brand { text-decoration: none; }
	.lhead nav { display: flex; gap: 1.2rem; }
	.lhead nav a { text-decoration: none; font-weight: 500; font-size: 0.92rem; }
	.lhead nav a:hover { text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--acid); text-decoration-thickness: 3px; }
	.lbody { padding: 2.4rem 0 1rem; }
	.lbody :global(h1) { font-size: clamp(1.8rem, 5vw, 2.6rem); margin: 0 0 0.4rem; }
	.lbody :global(.upd) { font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-soft); margin: 0 0 2rem; }
	.lbody :global(h2) { font-size: 1.25rem; margin: 2rem 0 0.6rem; }
	.lbody :global(p), .lbody :global(li) { line-height: 1.65; color: var(--ink); }
	.lbody :global(p) { margin: 0 0 0.9rem; }
	.lbody :global(ul) { margin: 0 0 1rem; padding-left: 1.2rem; }
	.lbody :global(li) { margin-bottom: 0.4rem; }
	.lbody :global(a) { color: var(--cobalt); }
	.lfoot { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 1.6rem; border-top: 1.5px solid var(--line); font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-soft); flex-wrap: wrap; }
	.lfoot a { color: var(--ink-soft); }
</style>
