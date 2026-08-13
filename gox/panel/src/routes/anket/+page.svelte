<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const s = data.survey;
	let answers = $state<Record<number, string>>({});
	let done = $state(false);
	let sending = $state(false);
	let error = $state('');

	function setAns(qid: number, val: string) { answers = { ...answers, [qid]: val }; }

	async function submit() {
		if (!s) return;
		sending = true;
		error = '';
		const payload = {
			mac: data.mac,
			answers: Object.entries(answers).map(([qid, value]) => ({ question_id: Number(qid), value }))
		};
		try {
			const res = await fetch(`/api/survey/${s.id}/respond`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) { error = 'Gönderilemedi, tekrar deneyin.'; sending = false; return; }
			done = true;
		} catch {
			error = 'Bağlantı hatası.';
		}
		sending = false;
	}
</script>

<svelte:head><title>{s?.title ?? 'Anket'} · goX</title><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></svelte:head>

<div class="screen">
	<div class="card">
		{#if !s}
			<h1>Şu an anket yok</h1>
			<p class="lead">Teşekkürler.</p>
		{:else if done}
			<div class="brand">Teşekkürler</div>
			<h1>Geri bildiriminiz alındı</h1>
			<p class="lead">Katkınız için teşekkür ederiz.</p>
			{#if data.cont}<a class="cta" href={data.cont}>İnternete devam et →</a>{/if}
		{:else}
			<div class="brand">Kısa anket</div>
			<h1>{s.title}</h1>
			{#each s.questions as q}
				<div class="q">
					<p class="qt">{q.text}</p>
					{#if q.qtype === 'rating'}
						<div class="rating">
							{#each [1, 2, 3, 4, 5] as n}
								<button class="star" class:on={Number(answers[q.id]) >= n} type="button" onclick={() => setAns(q.id, String(n))}>★</button>
							{/each}
						</div>
					{:else if q.qtype === 'choice'}
						<div class="choices">
							{#each q.options as opt}
								<button class="choice" class:on={answers[q.id] === opt} type="button" onclick={() => setAns(q.id, opt)}>{opt}</button>
							{/each}
						</div>
					{:else}
						<input class="tin" value={answers[q.id] ?? ''} oninput={(e) => setAns(q.id, (e.target as HTMLInputElement).value)} placeholder="Yanıtınız" />
					{/if}
				</div>
			{/each}
			{#if error}<p class="err">{error}</p>{/if}
			<button class="cta" type="button" onclick={submit} disabled={sending}>{sending ? 'Gönderiliyor…' : 'Gönder'}</button>
		{/if}
		<div class="foot">Powered by goX</div>
	</div>
</div>

<style>
	.screen { min-height: 100vh; display: grid; place-items: center; padding: 1.25rem; background: radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--acid) 26%, transparent), transparent 60%), var(--paper); }
	.card { width: 100%; max-width: 400px; background: var(--card); border: 1.5px solid var(--ink); border-radius: 6px; box-shadow: 6px 6px 0 0 var(--ink); padding: 2rem 1.6rem 1.3rem; text-align: center; }
	.brand { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase; background: var(--acid); color: var(--ink); padding: 0.35rem 0.7rem; border: 1.4px solid var(--ink); border-radius: 99px; margin-bottom: 1.2rem; }
	h1 { font-family: var(--font-display); font-weight: 600; font-size: 1.7rem; letter-spacing: -0.02em; margin: 0 0 1.2rem; }
	.lead { color: var(--ink-soft); }
	.q { text-align: left; margin-bottom: 1.3rem; }
	.qt { font-weight: 600; margin: 0 0 0.5rem; }
	.rating { display: flex; gap: 0.3rem; justify-content: center; }
	.star { font-size: 1.9rem; line-height: 1; background: none; border: none; cursor: pointer; color: color-mix(in srgb, var(--ink) 22%, transparent); }
	.star.on { color: var(--acid); -webkit-text-stroke: 1px var(--ink); }
	.choices { display: flex; flex-direction: column; gap: 0.5rem; }
	.choice { padding: 0.7rem; border: 1.4px solid var(--ink); border-radius: 5px; background: var(--paper); cursor: pointer; font-weight: 500; }
	.choice.on { background: var(--acid); }
	.tin { width: 100%; padding: 0.7rem; border: 1.5px solid var(--ink); border-radius: 5px; font-family: var(--font-text); }
	.cta { display: inline-block; width: 100%; margin-top: 0.5rem; padding: 0.9rem; background: var(--ink); color: var(--paper); border: none; border-radius: 5px; font-family: var(--font-display); font-weight: 600; font-size: 1rem; cursor: pointer; text-decoration: none; }
	.err { color: var(--danger); font-size: 0.9rem; }
	.foot { margin-top: 1.4rem; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute); }
</style>
