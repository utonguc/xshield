<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let addingCat = $state(false);
	const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(n ?? 0);
	const siteId = $derived(data.sites[0]?.id ?? null);
</script>

<svelte:head><title>QR Menü · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Dijital menü</p><h1>QR Menü</h1><p class="sub">Kategoriler ve ürünleri yönetin; misafirler QR ile görür.</p></div>
	<div class="row">
		{#if siteId}<a class="btn btn--ghost" href={`/menu?site=${siteId}`} target="_blank" rel="noreferrer">Menüyü aç ↗</a>{/if}
		<button class="btn btn--accent" onclick={() => (addingCat = !addingCat)}>{addingCat ? 'Kapat' : '+ Kategori'}</button>
	</div>
</section>

{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if addingCat}
	<form class="card catadd" method="POST" action="?/addCategory" use:enhance={() => async ({ update }) => { await update(); addingCat = false; }}>
		<input class="input" name="name" placeholder="Kategori adı (örn. Sıcak İçecekler)" required />
		<button class="btn btn--accent" type="submit">Ekle</button>
	</form>
{/if}

{#each data.categories as c (c.id)}
	<section class="card cat">
		<div class="ch">
			<h2>{c.name}</h2>
			<form method="POST" action="?/delCategory" use:enhance={toastEnhance('Kategori silindi')}><input type="hidden" name="id" value={c.id} /><button class="del" type="button" title="Kategoriyi sil" onclick={(e) => confirmDelete(e, `"${c.name}" kategorisi ve içindeki ürünler silinsin mi?`)}>×</button></form>
		</div>
		{#each c.items as it (it.id)}
			<div class="item" class:off={!it.available}>
				<div class="info"><strong>{it.name}</strong>{#if it.description}<span class="desc">{it.description}</span>{/if}</div>
				<span class="price">₺{fmt(it.price)}</span>
				<form method="POST" action="?/toggleItem" use:enhance style="display:inline">
					<input type="hidden" name="id" value={it.id} /><input type="hidden" name="name" value={it.name} />
					<input type="hidden" name="description" value={it.description} /><input type="hidden" name="price" value={it.price} />
					<input type="hidden" name="available" value={(!it.available).toString()} />
					<button class="btn btn--ghost btn--sm" type="submit">{it.available ? 'Gizle' : 'Göster'}</button>
				</form>
				<form method="POST" action="?/delItem" use:enhance={toastEnhance('Ürün silindi')} style="display:inline"><input type="hidden" name="id" value={it.id} /><button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `"${it.name}" silinsin mi?`)}>×</button></form>
			</div>
		{/each}
		<form class="itemadd" method="POST" action="?/addItem" use:enhance={() => async ({ update }) => { await update(); }}>
			<input type="hidden" name="category_id" value={c.id} />
			<input class="input" name="name" placeholder="Ürün adı" required />
			<input class="input desc" name="description" placeholder="Açıklama (ops.)" />
			<input class="input price" name="price" type="number" min="0" step="0.5" placeholder="₺" />
			<button class="btn btn--accent btn--sm" type="submit">+ Ürün</button>
		</form>
	</section>
{/each}
{#if data.categories.length === 0}
	<p class="empty">Henüz kategori yok. "+ Kategori" ile başlayın.</p>
{/if}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.4rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; }
	.row { display: flex; gap: 0.6rem; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.catadd { padding: 1rem 1.2rem; margin-bottom: 1rem; display: flex; gap: 0.8rem; }
	.catadd .input { flex: 1; }
	.cat { padding: 1.1rem 1.3rem 1.2rem; margin-bottom: 1rem; }
	.ch { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--line); padding-bottom: 0.5rem; margin-bottom: 0.7rem; }
	.ch h2 { font-size: 1.2rem; }
	.item { display: flex; align-items: center; gap: 0.8rem; padding: 0.55rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 15%, transparent); }
	.item.off { opacity: 0.45; }
	.info { flex: 1; display: flex; flex-direction: column; }
	.info strong { font-weight: 600; }
	.desc { font-size: 0.8rem; color: var(--ink-soft); }
	.price { font-family: var(--font-mono); font-weight: 700; }
	.itemadd { display: flex; gap: 0.5rem; margin-top: 0.8rem; align-items: center; flex-wrap: wrap; }
	.itemadd .input { flex: 1; min-width: 120px; }
	.itemadd .desc { flex: 1.5; }
	.itemadd .price { flex: 0 0 90px; min-width: 80px; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 28px; height: 28px; cursor: pointer; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.empty { color: var(--ink-soft); text-align: center; padding: 2rem 0; }
</style>
