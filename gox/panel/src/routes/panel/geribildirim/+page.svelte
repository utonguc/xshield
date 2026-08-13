<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const stars = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
</script>

<svelte:head><title>Geri Bildirimler · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">CRM · MGB</p><h1>Geri Bildirimler</h1></div>
	{#if data.siteId}<a class="btn btn--ghost" href={`/geribildirim?site=${data.siteId}`} target="_blank" rel="noreferrer">Form linki ↗</a>{/if}
</section>

<section class="summary">
	<div class="card sc"><span class="eyebrow">Ortalama puan</span><strong>{data.avg ? data.avg.toFixed(1) : '—'}</strong><span class="st">{stars(Math.round(data.avg))}</span></div>
	<div class="card sc"><span class="eyebrow">Toplam</span><strong>{data.count}</strong><span class="st">geri bildirim</span></div>
</section>

<section class="cards">
	{#each data.feedback as f (f.id)}
		<div class="card fb">
			<div class="fh">
				<span class="rate">{f.rating ? stars(f.rating) : '—'}</span>
				<span class="when">{f.at}</span>
			</div>
			{#if f.comment}<p class="cmt">{f.comment}</p>{/if}
			<span class="who">{f.name || 'Anonim'}</span>
		</div>
	{/each}
	{#if data.feedback.length === 0}<p class="empty">Henüz geri bildirim yok.</p>{/if}
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0; }
	.summary { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); margin-bottom: var(--gap); max-width: 460px; }
	.sc { padding: 1.1rem 1.3rem; display: flex; flex-direction: column; gap: 0.2rem; }
	.sc strong { font-family: var(--font-display); font-size: 2.2rem; line-height: 1; }
	.sc .st { font-size: 0.85rem; color: var(--ink-soft); }
	.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--gap); }
	.fb { padding: 1.1rem 1.3rem; }
	.fh { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
	.rate { color: var(--acid); -webkit-text-stroke: 0.5px var(--ink); letter-spacing: 0.1em; }
	.when { font-family: var(--font-mono); font-size: 0.7rem; color: var(--ink-soft); }
	.cmt { margin: 0 0 0.6rem; line-height: 1.5; }
	.who { font-family: var(--font-mono); font-size: 0.75rem; color: var(--ink-soft); }
	.empty { color: var(--ink-soft); grid-column: 1 / -1; text-align: center; padding: 2rem 0; }
	@media (max-width: 760px) { .cards { grid-template-columns: 1fr; } }
</style>
