<script lang="ts">
	import { toasts, dismissToast } from '$lib/ui.svelte';
</script>

<div class="toaster" role="status" aria-live="polite">
	{#each toasts.items as t (t.id)}
		<button class="toast t-{t.kind}" type="button" onclick={() => dismissToast(t.id)} title="Kapat">
			<span class="ic">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}</span>
			<span class="msg">{t.msg}</span>
		</button>
	{/each}
</div>

<style>
	.toaster { position: fixed; bottom: 1.2rem; right: 1.2rem; z-index: 1000; display: flex; flex-direction: column; gap: 0.6rem; max-width: min(92vw, 380px); }
	.toast { display: flex; align-items: flex-start; gap: 0.6rem; text-align: left; background: var(--card, #fff); color: var(--ink); border: 1.5px solid var(--line); border-left-width: 5px; border-radius: 10px; padding: 0.75rem 0.95rem; box-shadow: 0 8px 24px rgba(0,0,0,0.14); cursor: pointer; font-size: 0.92rem; animation: slidein 0.18s ease-out; }
	.ic { flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; color: #fff; }
	.msg { line-height: 1.35; }
	.t-success { border-left-color: var(--acid-dim, #6ba300); }
	.t-success .ic { background: var(--acid-dim, #6ba300); }
	.t-error { border-left-color: var(--danger, #d23); }
	.t-error .ic { background: var(--danger, #d23); }
	.t-info { border-left-color: var(--ink); }
	.t-info .ic { background: var(--ink); }
	@keyframes slidein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
