<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let building = $state(false);
	let title = $state('');
	let frequency = $state('once');
	let questions = $state<{ qtype: string; text: string; options: string }[]>([
		{ qtype: 'rating', text: '', options: '' }
	]);

	function addQ() { questions = [...questions, { qtype: 'text', text: '', options: '' }]; }
	function removeQ(i: number) { questions = questions.filter((_, idx) => idx !== i); }
	function resetBuilder() { title = ''; frequency = 'once'; questions = [{ qtype: 'rating', text: '', options: '' }]; }

	const questionsJson = $derived(JSON.stringify(
		questions.filter((q) => q.text.trim()).map((q) => ({
			qtype: q.qtype,
			text: q.text.trim(),
			options: q.qtype === 'choice' ? q.options.split(',').map((o) => o.trim()).filter(Boolean) : []
		}))
	));

	const qtypeLabel: Record<string, string> = { rating: 'Puan (1-5)', choice: 'Seçenekli', text: 'Serbest metin' };
</script>

<svelte:head><title>Anketler · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">Geri bildirim</p>
		<h1>Anketler</h1>
		<p class="sub">Bağlı misafirlere — bağlantıyı kesmeden — anket gösterin, sonuçları toplayın.</p>
	</div>
	<button class="btn btn--accent" onclick={() => { building = !building; if (building) resetBuilder(); }}>
		{building ? 'Kapat' : '+ Yeni anket'}
	</button>
</section>

{#if form?.error}<p class="err">{form.error}</p>{/if}

<p class="hint">Bir anketi <strong>aktifleştirdiğinizde</strong>, bağlı misafirlerin karşılama ekranında otomatik gösterilir — bağlantıları kesilmeden. Tek seferlik anket girişten kısa süre sonra bir kez, periyodik anket düzenli aralıklarla çıkar.</p>

{#if building}
	<form class="card build" method="POST" action="?/create"
		use:enhance={() => async ({ update }) => { await update(); building = false; }}>
		<input type="hidden" name="questions_json" value={questionsJson} />
		<div class="grid2">
			<label class="field"><span>Anket başlığı</span>
				<input class="input" name="title" bind:value={title} placeholder="örn. Memnuniyet anketi" required /></label>
			<label class="field"><span>Sıklık</span>
				<select class="input" name="frequency" bind:value={frequency}>
					<option value="once">Tek seferlik</option>
					<option value="periodic">Periyodik</option>
				</select></label>
		</div>

		<p class="eyebrow" style="margin:0.6rem 0 0.6rem">Sorular</p>
		{#each questions as q, i}
			<div class="qrow">
				<select class="input qtype" bind:value={q.qtype}>
					<option value="rating">Puan (1-5)</option>
					<option value="choice">Seçenekli</option>
					<option value="text">Serbest metin</option>
				</select>
				<input class="input" bind:value={q.text} placeholder="Soru metni" />
				{#if q.qtype === 'choice'}
					<input class="input" bind:value={q.options} placeholder="Seçenekler (virgülle): Evet, Hayır" />
				{/if}
				<button class="del" type="button" onclick={() => removeQ(i)} title="Sil">×</button>
			</div>
		{/each}
		<button class="btn btn--ghost btn--sm" type="button" onclick={addQ}>+ Soru ekle</button>

		<div class="row">
			<button class="btn btn--accent" type="submit">Anketi oluştur</button>
		</div>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>Anket</th><th>Sıklık</th><th>Soru</th><th>Yanıt</th><th>Durum</th><th></th></tr></thead>
		<tbody>
			{#each data.surveys as s (s.id)}
				<tr>
					<td class="name">{s.title}</td>
					<td class="up">{s.frequency === 'periodic' ? 'Periyodik' : 'Tek seferlik'}</td>
					<td class="mono">{s.question_count}</td>
					<td class="mono">{s.response_count}</td>
					<td><span class="tag {s.status === 'active' ? 'tag--live' : 'tag--off'}">{s.status === 'active' ? 'Aktif' : 'Taslak'}</span></td>
					<td class="right">
						<a class="btn btn--ghost btn--sm" href={`/panel/anketler/${s.id}`}>Sonuçlar</a>
						<form method="POST" action="?/toggle" use:enhance={toastEnhance(s.status === 'active' ? 'Durduruldu' : 'Yayınlandı')} style="display:inline">
							<input type="hidden" name="id" value={s.id} />
							<input type="hidden" name="status" value={s.status === 'active' ? 'draft' : 'active'} />
							<button class="btn btn--ghost btn--sm" type="submit">{s.status === 'active' ? 'Durdur' : 'Yayınla'}</button>
						</form>
						<form method="POST" action="?/delete" use:enhance={toastEnhance('Anket silindi')} style="display:inline">
							<input type="hidden" name="id" value={s.id} />
							<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `"${s.title}" anketi silinsin mi?`)}>×</button>
						</form>
					</td>
				</tr>
			{/each}
			{#if data.surveys.length === 0}
				<tr><td colspan="6" class="empty">Henüz anket yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 52ch; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.build { padding: 1.5rem; margin-bottom: 1.4rem; }
	.grid2 { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
	.qrow { display: flex; gap: 0.6rem; margin-bottom: 0.6rem; align-items: center; }
	.qrow .qtype { max-width: 160px; }
	.qrow .input { margin: 0; }
	.row { display: flex; gap: 0.8rem; margin-top: 1rem; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.85rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.95rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.mono { font-family: var(--font-mono); }
	.up { font-family: var(--font-mono); font-size: 0.78rem; text-transform: uppercase; }
	.right { text-align: right; white-space: nowrap; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); margin-left: 0.4rem; }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.hint { font-size: 0.86rem; color: var(--ink-soft); background: color-mix(in srgb, var(--acid) 14%, var(--card)); border: 1.4px solid var(--line); border-radius: 6px; padding: 0.75rem 0.95rem; margin: 0 0 1.1rem; }
	@media (max-width: 760px) { .grid2 { grid-template-columns: 1fr; } .qrow { flex-wrap: wrap; } }
</style>
