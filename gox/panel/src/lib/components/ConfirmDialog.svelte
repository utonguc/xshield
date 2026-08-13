<script lang="ts">
	import { confirmStore, resolveConfirm } from '$lib/ui.svelte';
	const c = $derived(confirmStore.current);
	function onKey(e: KeyboardEvent) {
		if (!c) return;
		if (e.key === 'Escape') resolveConfirm(false);
		if (e.key === 'Enter') resolveConfirm(true);
	}
</script>

<svelte:window onkeydown={onKey} />

{#if c}
	<div class="overlay" role="presentation" onclick={() => resolveConfirm(false)}>
		<div class="dialog" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
			<h3>{c.title}</h3>
			<p>{c.message}</p>
			<div class="row">
				<button class="btn btn--ghost" type="button" onclick={() => resolveConfirm(false)}>Vazgeç</button>
				<button class="btn {c.danger ? 'btn--danger' : 'btn--accent'}" type="button" onclick={() => resolveConfirm(true)}>{c.confirmLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay { position: fixed; inset: 0; background: rgba(8,8,12,0.5); backdrop-filter: blur(2px); z-index: 1100; display: grid; place-items: center; padding: 1.2rem; }
	.dialog { background: var(--card, #fff); color: var(--ink); border: 1.5px solid var(--line); border-radius: 14px; padding: 1.5rem; max-width: 420px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
	.dialog h3 { margin: 0 0 0.5rem; font-size: 1.2rem; }
	.dialog p { margin: 0 0 1.3rem; color: var(--ink-soft); line-height: 1.5; }
	.row { display: flex; gap: 0.7rem; justify-content: flex-end; }
	.btn--danger { background: var(--danger, #d23); color: #fff; border: 1.5px solid var(--danger, #d23); }
	.btn--danger:hover { filter: brightness(0.92); }
</style>
