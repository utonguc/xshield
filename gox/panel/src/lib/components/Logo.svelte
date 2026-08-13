<script lang="ts">
	let { size = 30 }: { size?: number } = $props();
</script>

<span class="logo" style="--s:{size}px">
	<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
		<rect x="1" y="1" width="22" height="22" rx="5" fill="var(--ink)" />
		<path d="M8 6.5 L14.5 12 L8 17.5" fill="none" stroke="var(--acid)" stroke-width="2.4"
			stroke-linecap="round" stroke-linejoin="round" />
		<circle cx="17" cy="17" r="1.6" fill="var(--acid)" />
	</svg>
	<span class="word">go<span class="x">X</span></span>
</span>

<style>
	.logo { display: inline-flex; align-items: center; gap: 0.5rem; }
	.word {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: calc(var(--s) * 0.72);
		letter-spacing: -0.04em;
		color: var(--ink);
		line-height: 1;
	}
	.x { color: var(--ink); position: relative; }
	.x::after {
		content: '';
		position: absolute; left: -1px; right: -1px; bottom: 0.08em; height: 0.16em;
		background: var(--acid);
		z-index: -1;
	}
</style>
