<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const t = data.ticket;
</script>

<svelte:head><title>{t?.subject ?? 'Ticket'} · goX Platform</title></svelte:head>

<a href="/owner/tickets" class="back eyebrow">← Destek</a>

{#if !t}
	<p class="empty">Ticket bulunamadı.</p>
{:else}
	<section class="head">
		<div>
			<p class="eyebrow">{t.customer} · {t.priority}</p>
			<h1>{t.subject}</h1>
		</div>
		<form method="POST" action="?/status" use:enhance>
			<input type="hidden" name="status" value={t.status === 'open' ? 'closed' : 'open'} />
			<button class="btn {t.status === 'open' ? 'btn--ghost' : 'btn--accent'}" type="submit">
				{t.status === 'open' ? 'Ticket\'ı kapat' : 'Yeniden aç'}
			</button>
		</form>
	</section>

	<section class="thread">
		{#each data.messages as m}
			<div class="msg {m.author === 'owner' ? 'owner' : 'cust'}">
				<div class="meta"><strong>{m.author === 'owner' ? 'Platform' : t.customer}</strong><span>{m.at}</span></div>
				<p>{m.body}</p>
			</div>
		{/each}
		{#if data.messages.length === 0}<p class="empty">Henüz mesaj yok.</p>{/if}
	</section>

	{#if t.status === 'open'}
		<form class="card reply" method="POST" action="?/reply" use:enhance={() => async ({ update }) => { await update(); }}>
			<textarea class="input" name="body" rows="3" placeholder="Yanıtınız…" required></textarea>
			<button class="btn btn--accent" type="submit">Gönder</button>
		</form>
	{:else}
		<p class="closed">Bu ticket kapalı.</p>
	{/if}
{/if}

<style>
	.back { display: inline-block; text-decoration: none; margin-bottom: 1rem; }
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
	.head h1 { font-size: 1.8rem; margin: 0.3rem 0 0; }
	.thread { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1.4rem; }
	.msg { border: 1.5px solid var(--line); border-radius: var(--radius); padding: 0.9rem 1.1rem; max-width: 80%; }
	.msg.owner { background: var(--ink); color: var(--paper); align-self: flex-end; }
	.msg.cust { background: var(--card); align-self: flex-start; }
	.meta { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.72rem; margin-bottom: 0.3rem; opacity: 0.75; font-family: var(--font-mono); }
	.msg p { margin: 0; line-height: 1.5; }
	.reply { padding: 1.1rem; display: flex; flex-direction: column; gap: 0.7rem; }
	.reply textarea { font-family: var(--font-text); resize: vertical; }
	.reply button { align-self: flex-start; }
	.closed, .empty { color: var(--ink-soft); }
</style>
