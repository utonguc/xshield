<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDelete, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
	let editId = $state<number | null>(null);

	const typeLabels: Record<string, string> = { normal: 'Normal', whitelist: 'Whitelist', blacklist: 'Blacklist' };

	// ── DHCP havuzundan MAC seçici ──
	let pickerSite = $state(0);
	let macValue = $state('');
	let pickerOpen = $state(false);
	let leases = $state<{ mac: string; ip: string; host: string; in_list: boolean }[]>([]);
	let leaseLoading = $state(false);
	let leaseSearch = $state('');

	async function loadLeases(site: number) {
		if (!site) { leases = []; return; }
		leaseLoading = true;
		try {
			const res = await fetch(`/panel/erisim/leases?site=${site}`);
			leases = res.ok ? (await res.json()).leases : [];
		} catch { leases = []; }
		leaseLoading = false;
	}
	async function togglePicker() {
		pickerOpen = !pickerOpen;
		if (pickerOpen) await loadLeases(pickerSite);
	}
	const filteredLeases = $derived(
		leases.filter((l) => {
			const q = leaseSearch.toLowerCase();
			return !q || l.mac.toLowerCase().includes(q) || (l.host ?? '').toLowerCase().includes(q) || (l.ip ?? '').includes(q);
		})
	);
	function pickLease(mac: string) { macValue = mac; pickerOpen = false; }
</script>

<svelte:head><title>Erişim Listesi · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">MAC tabanlı erişim</p>
		<h1>Erişim Listesi</h1>
		<p class="sub">Bir cihazın MAC'ini bir profile bağlayın ya da whitelist/blacklist'e alın. MAC'i elle yazabilir veya bağlı cihazlardan seçebilirsiniz. Değişiklik anında geçerli olur.</p>
	</div>
	<button class="btn btn--accent" onclick={() => (adding = !adding)} disabled={data.sites.length === 0}>
		{adding ? 'Kapat' : '+ MAC ekle'}
	</button>
</section>

{#if data.sites.length === 0}
	<p class="info">Önce bir <a href="/panel/lokasyonlar">lokasyon</a> ekleyin.</p>
{/if}
{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if adding}
	<form class="card add" method="POST" action="?/create" use:enhance={toastEnhance('MAC eklendi', { onSuccess: () => { adding = false; macValue = ''; } })}>
		<div class="grid">
			<label class="field"><span>Lokasyon</span>
				<select class="input" name="site_id" bind:value={pickerSite} required onchange={() => { if (pickerOpen) loadLeases(pickerSite); }}>
					<option value={0} disabled>Seçin…</option>
					{#each data.sites as s}<option value={s.id}>{s.name}</option>{/each}
				</select></label>
			<label class="field mac-field"><span>MAC adresi</span>
				<div class="mac-row">
					<input class="input" name="mac" bind:value={macValue} placeholder="aa:bb:cc:dd:ee:ff" required />
					<button class="btn btn--sm pick-btn" type="button" onclick={togglePicker} disabled={!pickerSite} title="DHCP havuzundan seç">DHCP'den seç</button>
				</div>
			</label>
			<label class="field"><span>Tür</span>
				<select class="input" name="list_type">
					<option value="normal">Normal (profil uygula)</option>
					<option value="whitelist">Whitelist</option>
					<option value="blacklist">Blacklist (engelle)</option>
				</select></label>
			<label class="field"><span>Profil (hız)</span>
				<select class="input" name="profile_id">
					<option value="">— yok —</option>
					{#each data.profiles as p}<option value={p.id}>{p.name}</option>{/each}
				</select></label>
			<label class="field"><span>Not</span>
				<input class="input" name="note" placeholder="opsiyonel" /></label>
		</div>

		{#if pickerOpen}
			<div class="picker">
				<input class="input" placeholder="Ara: MAC, cihaz adı, IP…" bind:value={leaseSearch} />
				<div class="leases">
					{#if leaseLoading}
						<p class="note">Yükleniyor…</p>
					{:else if filteredLeases.length === 0}
						<p class="note">Bu lokasyonda güncel DHCP kaydı yok. (Cihaz çevrimiçi olmalı ve misafir bağlanmış olmalı.)</p>
					{:else}
						{#each filteredLeases as l}
							<button class="lease" type="button" onclick={() => pickLease(l.mac)}>
								<span class="mono">{l.mac}</span>
								<span class="lease-meta">{l.host || '—'} · {l.ip || '—'}</span>
								{#if l.in_list}<span class="tag tag--off">listede</span>{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<button class="btn btn--accent" type="submit">Ekle</button>
	</form>
{/if}

<section class="card list">
	<table class="tbl">
		<thead><tr><th>MAC</th><th>Lokasyon</th><th>Tür</th><th>Profil</th><th>Not</th><th></th></tr></thead>
		<tbody>
			{#each data.macs as m (m.id)}
				{#if editId === m.id}
					<tr class="editing">
						<td class="mono">{m.mac}</td>
						<td colspan="5">
							<form class="editform" method="POST" action="?/update" use:enhance={toastEnhance('Güncellendi', { onSuccess: () => (editId = null) })}>
								<input type="hidden" name="id" value={m.id} />
								<select class="input" name="site_id">
									{#each data.sites as s}<option value={s.id} selected={s.id === m.site_id}>{s.name}</option>{/each}
								</select>
								<select class="input" name="list_type">
									{#each ['normal','whitelist','blacklist'] as lt}<option value={lt} selected={lt === m.list_type}>{typeLabels[lt]}</option>{/each}
								</select>
								<select class="input" name="profile_id">
									<option value="">— profil yok —</option>
									{#each data.profiles as p}<option value={p.id} selected={p.id === m.profile_id}>{p.name}</option>{/each}
								</select>
								<input class="input" name="note" value={m.note ?? ''} placeholder="not" />
								<button class="btn btn--accent btn--sm" type="submit">Kaydet</button>
								<button class="btn btn--ghost btn--sm" type="button" onclick={() => (editId = null)}>Vazgeç</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="mono">{m.mac}</td>
						<td>{m.site_name}</td>
						<td><span class="tag {m.list_type === 'blacklist' ? 'tag--bad' : m.list_type === 'whitelist' ? 'tag--live' : 'tag--off'}">{typeLabels[m.list_type] ?? m.list_type}</span></td>
						<td>{m.profile_name || '—'}</td>
						<td class="note">{m.note || ''}</td>
						<td class="right">
							<button class="icon" type="button" title="Düzenle" onclick={() => (editId = m.id)}>✎</button>
							<form method="POST" action="?/delete" use:enhance={toastEnhance('MAC silindi')} style="display:inline">
								<input type="hidden" name="id" value={m.id} />
								<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `${m.mac} erişim listesinden silinsin mi?`)}>×</button>
							</form>
						</td>
					</tr>
				{/if}
			{/each}
			{#if data.macs.length === 0}
				<tr><td colspan="6" class="empty">Henüz kayıt yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 58ch; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; margin-bottom: 1rem; }
	.info a { text-decoration: underline; text-decoration-color: var(--acid); text-decoration-thickness: 2px; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.add { padding: 1.4rem; margin-bottom: 1.4rem; }
	.add .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 0.4rem; }
	.add .field { margin-bottom: 0.6rem; }
	.mac-row { display: flex; gap: 0.4rem; }
	.mac-row .input { flex: 1; }
	.pick-btn { white-space: nowrap; }
	.picker { border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem; margin: 0.2rem 0 0.8rem; }
	.leases { display: flex; flex-direction: column; gap: 0.35rem; max-height: 220px; overflow-y: auto; margin-top: 0.6rem; }
	.lease { display: flex; align-items: center; gap: 0.7rem; text-align: left; background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.5rem 0.7rem; cursor: pointer; }
	.lease:hover { border-color: var(--acid); }
	.lease-meta { color: var(--ink-soft); font-size: 0.82rem; flex: 1; }
	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.85rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.95rem; vertical-align: middle; }
	.tbl tr:last-child td { border-bottom: none; }
	.editform { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 0.3rem 0; }
	.editform .input { min-width: 130px; }
	.mono { font-family: var(--font-mono); font-size: 0.88rem; }
	.note { color: var(--ink-soft); }
	.right { text-align: right; white-space: nowrap; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.tag--bad { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	.icon { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 0.9rem; color: var(--ink); margin-right: 0.3rem; }
	.icon:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }
	@media (max-width: 860px) { .add .grid { grid-template-columns: 1fr 1fr; } }
</style>
