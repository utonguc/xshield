<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function total(counts: Record<string, number>) {
		return Object.values(counts ?? {}).reduce((a, b) => a + b, 0) || 1;
	}
</script>

<svelte:head><title>{data.title} · Sonuçlar · goX</title></svelte:head>

<a href="/panel/anketler" class="back eyebrow">← Anketler</a>
<section class="head">
	<div><p class="eyebrow">{data.response_count} yanıt</p><h1>{data.title}</h1></div>
</section>

{#each data.results as q}
	<section class="card q">
		<h2>{q.text}</h2>
		{#if q.qtype === 'rating'}
			<p class="avg">Ortalama: <strong>{q.avg ? q.avg.toFixed(1) : '—'}</strong> / 5</p>
			{#each [5, 4, 3, 2, 1] as n}
				<div class="bar">
					<span class="lbl">{n}★</span>
					<div class="track"><div class="fill" style="width:{((q.counts?.[String(n)] ?? 0) / total(q.counts)) * 100}%"></div></div>
					<span class="cnt">{q.counts?.[String(n)] ?? 0}</span>
				</div>
			{/each}
		{:else if q.qtype === 'choice'}
			{#each q.options as opt}
				<div class="bar">
					<span class="lbl wide">{opt}</span>
					<div class="track"><div class="fill" style="width:{((q.counts?.[opt] ?? 0) / total(q.counts)) * 100}%"></div></div>
					<span class="cnt">{q.counts?.[opt] ?? 0}</span>
				</div>
			{/each}
		{:else}
			{#if q.texts.length === 0}<p class="empty">Yanıt yok.</p>{/if}
			{#each q.texts as t}<p class="txt">“{t}”</p>{/each}
		{/if}
	</section>
{/each}
{#if data.results.length === 0}<p class="empty">Soru yok.</p>{/if}

<style>
	.back { display: inline-block; text-decoration: none; margin-bottom: 0.8rem; }
	.head { margin-bottom: 1.4rem; }
	.head h1 { font-size: 1.9rem; margin: 0.3rem 0 0; }
	.q { padding: 1.3rem 1.4rem; margin-bottom: 1rem; }
	.q h2 { font-size: 1.15rem; margin: 0 0 0.9rem; }
	.avg { margin: 0 0 0.8rem; color: var(--ink-soft); }
	.avg strong { font-family: var(--font-display); font-size: 1.3rem; color: var(--ink); }
	.bar { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.45rem; }
	.lbl { font-family: var(--font-mono); font-size: 0.8rem; width: 28px; }
	.lbl.wide { width: 130px; }
	.track { flex: 1; height: 14px; background: var(--paper-2); border: 1.3px solid var(--line); border-radius: 99px; overflow: hidden; }
	.fill { height: 100%; background: var(--acid); }
	.cnt { font-family: var(--font-mono); font-size: 0.8rem; width: 30px; text-align: right; }
	.txt { background: var(--paper-2); border-left: 3px solid var(--acid); padding: 0.6rem 0.9rem; margin: 0 0 0.5rem; }
	.empty { color: var(--ink-soft); }
</style>
