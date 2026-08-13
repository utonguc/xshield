<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { confirmDelete, confirmAction, toast, toastEnhance } from '$lib/ui.svelte';
	import type { PageData, ActionData } from './$types';

	let renaming = $state(false);
	let renameVal = $state('');
	async function saveName() {
		const name = renameVal.trim();
		if (!name) return;
		try {
			const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/update`, {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (res.ok) { mgmt.dev.name = name; renaming = false; toast.success('Cihaz adı güncellendi'); invalidateAll(); }
			else toast.error('Ad güncellenemedi');
		} catch { toast.error('Bağlantı hatası'); }
	}
	async function delReservationConfirm(rid: number, ip: string) {
		const ok = await confirmAction(`${ip} rezervasyonu silinsin mi?`, { confirmLabel: 'Sil', danger: true });
		if (ok) await delReservation(rid);
	}

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let wizard = $state(false);
	let wanMode = $state('dhcp');
	let createdAck = $state(false);

	// Cihaz durumunu (online/yapılandırma) canlı görmek için 5 sn'de bir tazele
	onMount(() => {
		const t = setInterval(() => { invalidateAll(); if (mgmt.open) loadHistory(); }, 5000);
		return () => clearInterval(t);
	});

	// config modal
	let cfg = $state<{ open: boolean; loading: boolean; text: string; name: string; copied: boolean }>({
		open: false, loading: false, text: '', name: '', copied: false
	});

	async function openConfig(id: number, name: string) {
		cfg = { open: true, loading: true, text: '', name, copied: false };
		const res = await fetch(`/panel/cihazlar/${id}/config`);
		cfg = { ...cfg, loading: false, text: await res.text() };
	}
	// ZTP tek satır: factory-default cihaza yapıştırılır; cihaz kendi anahtarını üretip bağlanır.
	const ztpLine = (token: string) =>
		`/tool fetch url="https://gox.xshield.com.tr/api/enroll/${token}" check-certificate=no output=file dst-path=goxenroll.rsc; :delay 2s; /import goxenroll.rsc`;
	function openZtp(token: string, name: string) {
		cfg = { open: true, loading: false, text: ztpLine(token), name: name + ' — ZTP (tek satır)', copied: false };
	}
	async function copyText(t: string) {
		try { await navigator.clipboard.writeText(t); cfg = { ...cfg, copied: true }; setTimeout(() => (cfg = { ...cfg, copied: false }), 1500); } catch {}
	}

	// ---- Cihaz yönetim modalı (tünel üstünden) ----
	let mgmt = $state<any>({ open: false, dev: null, busy: '', msg: '', leases: null, ssid: '', reservations: null, resText: '', dns: '' });
	function openMgmt(d: any) {
		mgmt = { open: true, dev: d, busy: '', msg: '', leases: null, ssid: d.ssid ?? '', reservations: null, resText: '', dns: d.dns_servers ?? '8.8.8.8,1.1.1.1',
			policy: null, wgHost: '', blkKind: 'domain', blkVal: '', blkNote: '', logs: null, ntpTz: 'Europe/Istanbul',
			talkers: null, limMac: '', limDown: '', limUp: '', history: [], tab: 'durum' };
		loadReservations();
		loadPolicy();
		loadHistory();
	}
	// Onaylı aksiyon — riskli komutlar için (yeniden başlat, kapat, NAT/internet kesme)
	async function confirmDo(act: string, params: any, okMsg: string, msg: string, danger = false) {
		const ok = await confirmAction(msg, { confirmLabel: danger ? 'Evet, uygula' : 'Onayla', danger });
		if (ok) doAction(act, params, okMsg);
	}
	// ── Politika: walled garden + içerik/port engelleme ──
	async function loadPolicy() {
		try {
			const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/policy`);
			mgmt.policy = res.ok ? await res.json() : { walled_garden: [], blocks: [] };
		} catch { mgmt.policy = { walled_garden: [], blocks: [] }; }
	}
	async function policyOp(payload: any, okMsg = '') {
		const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/policy`, {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
		});
		const j = await res.json().catch(() => ({}));
		if (!res.ok) { toast.error(j.error ?? 'İşlem başarısız'); return false; }
		await loadPolicy();
		if (okMsg) toast.success(okMsg);
		return true;
	}
	async function addWg() {
		const h = (mgmt.wgHost || '').trim(); if (!h) return;
		if (await policyOp({ op: 'wg-add', host: h }, 'Eklendi (uygulamak için “Cihaza uygula”)')) mgmt.wgHost = '';
	}
	async function delWg(wid: number) { if (await confirmAction('Bu site walled garden’dan çıkarılsın mı?', { confirmLabel: 'Sil', danger: true })) policyOp({ op: 'wg-del', wid }); }
	async function addBlock() {
		const v = (mgmt.blkVal || '').trim(); if (!v) return;
		if (await policyOp({ op: 'block-add', kind: mgmt.blkKind, value: v, note: mgmt.blkNote }, 'Engel eklendi (uygulamak için “Cihaza uygula”)')) { mgmt.blkVal = ''; mgmt.blkNote = ''; }
	}
	async function addPreset(kind: string, value: string, note: string) { await policyOp({ op: 'block-add', kind, value, note }, 'Hazır engel eklendi'); }
	async function delBlock(bid: number) { if (await confirmAction('Bu engel kuralı silinsin mi?', { confirmLabel: 'Sil', danger: true })) policyOp({ op: 'block-del', bid }); }
	async function blockMac(mac: string) {
		if (!(await confirmAction(`${mac} cihazı engellensin (blacklist) ve anında düşürülsün mü?`, { confirmLabel: 'Engelle', danger: true }))) return;
		const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/policy`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'block-mac', mac }) });
		if (res.ok) toast.success('Cihaz engellendi'); else toast.error('Engellenemedi');
	}
	// ── Top talkers (en çok bant kullanan) ──
	function fmtBytes(b: number) {
		if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
		if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
		if (b >= 1e3) return Math.round(b / 1e3) + ' KB';
		return (b || 0) + ' B';
	}
	async function getTalkers() {
		const id = await sendCmd('top_talkers', {});
		if (!id) return;
		const c = await waitCmd(id); mgmt.busy = '';
		if (c && c.status === 'done') { try { mgmt.talkers = JSON.parse(c.result || '[]'); } catch { mgmt.talkers = []; } }
		else mgmt.msg = 'Alınamadı';
	}
	// ── Tek cihaza hız sınırı ──
	async function applyLimit() {
		const mac = (mgmt.limMac || '').trim(); if (!mac) { toast.error('MAC girin'); return; }
		const down = Math.round((Number(mgmt.limDown) || 0) * 1024);
		const up = Math.round((Number(mgmt.limUp) || 0) * 1024);
		const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/policy`, {
			method: 'POST', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ op: 'limit-mac', mac, down_kbps: down, up_kbps: up })
		});
		if (res.ok) toast.success(down || up ? 'Hız sınırı uygulandı (kopmasız)' : 'Hız sınırı kaldırıldı'); else toast.error('Uygulanamadı');
	}
	function fillLimit(mac: string) { mgmt.limMac = mac; }
	// ── Yedekten geri yükle (.rsc) ──
	async function restoreFile(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
		const text = await f.text();
		(e.target as HTMLInputElement).value = '';
		const ok = await confirmAction(`"${f.name}" yedeği "${mgmt.dev.name}" cihazına geri yüklensin mi? Misafir ağı yapılandırması yeniden uygulanır.`, { confirmLabel: 'Geri yükle', danger: true });
		if (ok) doAction('restore_config', { script: text }, 'Yedek geri yüklendi');
	}
	// ── Loglar ──
	async function getLogs() {
		const id = await sendCmd('get_logs', { n: 60 });
		if (!id) return;
		const c = await waitCmd(id); mgmt.busy = '';
		if (c && c.status === 'done') { try { mgmt.logs = JSON.parse(c.result || '[]'); } catch { mgmt.logs = []; } }
		else mgmt.msg = 'Loglar alınamadı';
	}
	async function loadReservations() {
		try {
			const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/reservations`);
			mgmt.reservations = (await res.json()).reservations ?? [];
		} catch { mgmt.reservations = []; }
	}
	async function addReservations() {
		const items = (mgmt.resText || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
			.map((l: string) => { const p = l.split(/[\s,;]+/); return { mac: p[0], ip: p[1], hostname: p[2] ?? '' }; })
			.filter((x: any) => x.mac && x.ip);
		if (!items.length) { mgmt.msg = 'Her satır: MAC IP [ad]'; return; }
		const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/reservations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
		const j = await res.json();
		mgmt.msg = `${j.added ?? 0} eklendi${j.failed ? ', ' + j.failed + ' hatalı' : ''}. "Cihaza uygula" ile aktive edin.`;
		mgmt.resText = '';
		await loadReservations();
	}
	async function delReservation(rid: number) {
		await fetch(`/panel/cihazlar/${mgmt.dev.id}/reservations/${rid}`, { method: 'DELETE' });
		await loadReservations();
	}

	async function sendCmd(action: string, params: any = {}) {
		mgmt.busy = action; mgmt.msg = '';
		try {
			const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/cmd`, {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action, params })
			});
			const j = await res.json();
			if (!res.ok) { mgmt.msg = j.error ?? 'Komut gönderilemedi'; mgmt.busy = ''; return null; }
			return j.command_id;
		} catch { mgmt.msg = 'Bağlantı hatası'; mgmt.busy = ''; return null; }
	}
	async function waitCmd(id: number, timeoutMs = 14000) {
		const t0 = Date.now();
		while (Date.now() - t0 < timeoutMs) {
			await new Promise((r) => setTimeout(r, 1500));
			const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/commands`);
			const j = await res.json();
			const c = (j.commands ?? []).find((x: any) => x.id === id);
			if (c && (c.status === 'done' || c.status === 'error')) return c;
		}
		return null;
	}
	const actionLabels: Record<string, string> = {
		apply_network: 'Yapılandır', hotspot_toggle: 'Hotspot', nat_toggle: 'NAT', kick_all: 'Oturum kapat',
		set_dns: 'DNS', ssid: 'SSID', sync_reservations: 'Rezervasyon', sync_policy: 'Politika',
		set_time: 'Saat/NTP', get_logs: 'Loglar', upgrade: 'Sürüm yükseltme', reboot: 'Yeniden başlatma',
		shutdown: 'Kapatma', factory_reset: 'Fabrika ayarı', restore_config: 'Yedek geri yükleme',
		top_talkers: 'Top talkers', set_admin_pass: 'Parola yenileme'
	};
	// Cihazı yeniden başlatan/erişimi kesen işlemler — "geri geldi mi" takibi gerekir.
	const rebootingActions = new Set(['reboot', 'upgrade', 'factory_reset', 'shutdown']);

	async function doAction(act: string, params: any, okMsg: string) {
		const label = actionLabels[act] ?? act;
		toast.info(`${label}: komut gönderiliyor…`);
		const id = await sendCmd(act, params);
		if (!id) { mgmt.busy = ''; toast.error(`${label}: gönderilemedi — ${mgmt.msg || 'cihaza ulaşılamadı'}`); return; }
		const slow = rebootingActions.has(act) || act === 'restore_config' || act === 'apply_network';
		const c = await waitCmd(id, slow ? 30000 : 16000);
		mgmt.busy = '';
		loadHistory();
		if (!c) {
			if (rebootingActions.has(act)) { toast.info(`${label}: cihaza iletildi, işleniyor…`); watchBackOnline(label, act); }
			else toast.error(`${label}: cihaz zamanında yanıt vermedi (komut sırada olabilir)`);
			invalidateAll();
			return;
		}
		if (c.status === 'done') {
			toast.success(`${label}: ${c.result || okMsg || 'tamamlandı'}`);
			mgmt.msg = okMsg || c.result || '';
			if (rebootingActions.has(act)) watchBackOnline(label, act);
		} else {
			toast.error(`${label}: ${c.result || 'hata'}`);
			mgmt.msg = 'Hata: ' + (c.result || '');
		}
		invalidateAll();
	}

	const cmdStatusLabel: Record<string, string> = { pending: 'Sırada', running: 'Çalışıyor', done: 'Tamam', error: 'Hata' };
	// Reboot/upgrade/factory sonrası cihazın çevrimdışı olup tekrar çevrimiçi olmasını izler.
	async function watchBackOnline(label: string, act: string) {
		if (act === 'shutdown') {
			toast.info(`${label}: cihaz kapanıyor — yeniden açmak için fiziksel erişim gerekir.`);
			return;
		}
		if (act === 'factory_reset') {
			toast.info(`${label}: cihaz sıfırlandı — tekrar çevrimiçi olması için ZTP komutunu yapıştırın.`);
			return;
		}
		toast.info(`${label}: cihaz yeniden başlıyor, ~1-2 dk içinde çevrimiçi bekleniyor…`);
		const t0 = Date.now();
		let wentOffline = false;
		while (Date.now() - t0 < 210000) { // 3.5 dk
			await new Promise((r) => setTimeout(r, 6000));
			await invalidateAll();
			const d = (data.devices ?? []).find((x: any) => x.id === mgmt.dev.id);
			if (!d) continue;
			if (d.status !== 'online') wentOffline = true;
			else if (wentOffline) { toast.success(`${label}: cihaz tekrar çevrimiçi ✓`); loadHistory(); return; }
		}
		toast.info(`${label}: cihaz hâlâ çevrimiçi görünmüyor — birkaç dakika daha bekleyip İzleme'den kontrol edin.`);
	}

	// Son işlemler (komut geçmişi) — modalda canlı görünür.
	async function loadHistory() {
		try {
			const res = await fetch(`/panel/cihazlar/${mgmt.dev.id}/commands`);
			mgmt.history = res.ok ? (await res.json()).commands ?? [] : [];
		} catch { /* yoksay */ }
	}
	async function loadLeases() {
		const id = await sendCmd('dhcp_leases', {});
		if (!id) return;
		const c = await waitCmd(id);
		mgmt.busy = '';
		if (c && c.status === 'done') { try { mgmt.leases = JSON.parse(c.result || '[]'); } catch { mgmt.leases = []; } mgmt.msg = `${mgmt.leases.length} kiralama`; }
		else mgmt.msg = 'Kiralamalar alınamadı';
	}
	async function saveSsid() {
		await fetch(`/panel/cihazlar/${mgmt.dev.id}/cmd`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ssid', params: { ssid: mgmt.ssid } }) });
		mgmt.msg = 'SSID gönderildi (yayına geçmesi için Yeniden yapılandır gerekebilir)';
	}

	const created = $derived(!createdAck ? form?.created : null);
</script>

<svelte:head><title>Cihazlar · goX</title></svelte:head>

<section class="head">
	<div>
		<p class="eyebrow">MikroTik filosu</p>
		<h1>Cihazlar</h1>
		<p class="sub">Sıfırdan bir cihazı sihirbazla yapılandırın; çıkan tek config'i cihaza yapıştırın, panele bağlansın.</p>
	</div>
	<button class="btn btn--accent" onclick={() => { wizard = !wizard; createdAck = true; }} disabled={data.sites.length === 0}>
		{wizard ? 'Kapat' : '+ Yeni cihaz'}
	</button>
</section>

{#if data.sites.length === 0}
	<p class="info">Önce bir <a href="/panel/lokasyonlar">lokasyon</a> ekleyin, sonra cihaz tanımlayabilirsiniz.</p>
{/if}
{#if form?.error}<p class="err">{form.error}</p>{/if}
{#if form?.commanded}<p class="info">Komut gönderildi: <strong>{form.commanded}</strong>. Cihaz birkaç saniye içinde uygular; durum otomatik güncellenir.</p>{/if}

<!-- Oluşturma sonrası: admin bilgileri (tek seferlik) -->
{#if created}
	<div class="card card--raised done">
		<p class="eyebrow" style="color:var(--ok)">Cihaz oluşturuldu — {created.name}</p>
		<h2>Son adım: cihazı bağla (ZTP)</h2>
		<p class="sub">Cihazı fabrika ayarlarına sıfırlayın (internetli, modem arkası). Aşağıdaki <strong>tek satırı</strong> terminale yapıştırın — cihaz enrollment betiğini kendisi indirir, <strong>kendi tünel anahtarını üretir</strong> (anahtar cihazdan hiç çıkmaz) ve bağlanır. Panelde <strong>online</strong> görününce misafir ağını/WiFi/DHCP'yi buradan tek tıkla yapılandırırsınız. Statik WAN'lı cihazlar için "Manuel config" kullanın.</p>
		<div class="row">
			<button class="btn btn--accent" onclick={() => openZtp(created.enroll_token, created.name)}>ZTP tek satır komutu →</button>
			<button class="btn btn--ghost" onclick={() => openConfig(created.id, created.name)}>Manuel config (statik WAN)</button>
			<button class="btn btn--ghost" onclick={() => (createdAck = true)}>Tamam</button>
		</div>
	</div>
{/if}

<!-- SİHİRBAZ -->
{#if wizard}
	<form class="card wiz" method="POST" action="?/create"
		use:enhance={toastEnhance('Cihaz oluşturuldu', { onSuccess: () => { wizard = false; createdAck = false; } })}>
		<div class="step">
			<span class="snum">1</span><h3>Temel</h3>
		</div>
		<div class="grid">
			<label class="field"><span>Lokasyon</span>
				<select class="input" name="site_id" required>
					{#each data.sites as s}<option value={s.id}>{s.name}</option>{/each}
				</select></label>
			<label class="field"><span>Cihaz adı</span>
				<input class="input" name="name" placeholder="örn. Lobi AP" required /></label>
			<label class="field"><span>RouterOS sürümü</span>
				<select class="input" name="routeros_ver">
					<option value="7">v7 (önerilen)</option>
					<option value="6">v6</option>
				</select></label>
		</div>

		<div class="step">
			<span class="snum">2</span><h3>WAN (internet tarafı)</h3>
		</div>
		<div class="wanpick">
			<label class:active={wanMode === 'dhcp'}>
				<input type="radio" name="wan_mode" value="dhcp" bind:group={wanMode} />
				<strong>DHCP</strong><small>Hat modem/firewall sonrası geliyor (IP otomatik)</small>
			</label>
			<label class:active={wanMode === 'static'}>
				<input type="radio" name="wan_mode" value="static" bind:group={wanMode} />
				<strong>Statik IP</strong><small>Hat doğrudan MikroTik'te sonlanıyor</small>
			</label>
		</div>
		<div class="grid">
			<label class="field"><span>WAN portu</span>
				<input class="input" name="wan_interface" value="ether1" /></label>
			{#if wanMode === 'static'}
				<label class="field"><span>WAN IP (CIDR)</span>
					<input class="input" name="wan_ip" placeholder="örn. 88.255.10.2/29" required /></label>
				<label class="field"><span>WAN gateway</span>
					<input class="input" name="wan_gateway" placeholder="örn. 88.255.10.1" required /></label>
			{/if}
		</div>

		<div class="step">
			<span class="snum">3</span><h3>Misafir iç ağı</h3>
		</div>
		<div class="grid">
			<label class="field"><span>İç ağ (subnet)</span>
				<input class="input" name="lan_subnet" value="172.16.0.0/16" /></label>
			<label class="field"><span>Misafir portları (virgülle)</span>
				<input class="input" name="lan_interfaces" value="ether2,ether3,ether4,ether5" /></label>
			<label class="field"><span>DNS sunucuları</span>
				<input class="input" name="dns_servers" value="8.8.8.8,1.1.1.1" /></label>
		</div>

		<div class="row">
			<button class="btn btn--accent" type="submit">Cihazı oluştur ve config üret →</button>
		</div>
	</form>
{/if}

<!-- LİSTE -->
<section class="card list">
	<table class="tbl">
		<thead><tr><th>Cihaz</th><th>Lokasyon</th><th>Tünel IP</th><th>Durum</th><th></th></tr></thead>
		<tbody>
			{#each data.devices as d (d.id)}
				<tr>
					<td class="name">{d.name}
						{#if d.board_name}<div class="meta">{d.board_name}{#if d.ros_detected} · v{d.ros_detected}{/if}{#if d.has_wifi} · WiFi{:else if d.status === 'online'} · WiFi yok{/if}</div>{/if}
					</td>
					<td>{d.site_name}</td>
					<td class="mono">{d.wg_ip}</td>
					<td>
						<span class="tag {d.status === 'online' ? 'tag--live' : 'tag--off'}">{d.status === 'online' ? 'online' : d.status === 'pending' ? 'bekliyor' : 'çevrimdışı'}</span>
						{#if d.provisioned}<span class="tag tag--ok2">yapılandırıldı</span>{:else if d.status === 'online'}<span class="tag tag--warn2">kurulmadı</span>{/if}
					</td>
					<td class="right">
						{#if d.enroll_token}
							<button class="btn btn--accent btn--sm" onclick={() => openZtp(d.enroll_token, d.name)} title="Sıfırlanmış cihaza yapıştırılacak tek satır">ZTP komutu</button>
						{/if}
						<button class="btn btn--ghost btn--sm" onclick={() => openConfig(d.id, d.name)}>Manuel</button>
						{#if d.status === 'online'}
							<button class="btn btn--accent btn--sm" onclick={() => openMgmt(d)}>Yönet →</button>
						{/if}
						<form method="POST" action="?/delete" use:enhance={toastEnhance('Cihaz silindi')} style="display:inline">
							<input type="hidden" name="id" value={d.id} />
							<button class="del" type="button" title="Sil" onclick={(e) => confirmDelete(e, `"${d.name}" cihazı panelden silinsin mi? (Cihazın kendi ayarları silinmez.)`)}>×</button>
						</form>
					</td>
				</tr>
			{/each}
			{#if data.devices.length === 0}
				<tr><td colspan="6" class="empty">Henüz cihaz yok.</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<!-- CONFIG MODAL -->
{#if cfg.open}
	<div class="overlay" onclick={() => (cfg = { ...cfg, open: false })} role="presentation">
		<div class="modal card card--raised" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="mhead">
				<div><p class="eyebrow">Provizyon config</p><h3>{cfg.name}</h3></div>
				<button class="del" onclick={() => (cfg = { ...cfg, open: false })} title="Kapat">×</button>
			</div>
			<p class="sub">MikroTik terminaline (Winbox/SSH → New Terminal) komple yapıştırın.</p>
			{#if cfg.loading}<p class="mono">yükleniyor…</p>{:else}
				<pre class="cfg">{cfg.text}</pre>
				<div class="row">
					<button class="btn btn--accent" onclick={() => copyText(cfg.text)}>{cfg.copied ? 'Kopyalandı ✓' : 'Panoya kopyala'}</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- YÖNETİM MODALI -->
{#if mgmt.open}
	<div class="overlay" onclick={() => (mgmt.open = false)} role="presentation">
		<div class="modal card card--raised" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="mhead">
				<div><p class="eyebrow">Cihaz yönetimi · tünel üstünden</p>
					{#if renaming}
						<div class="renamerow">
							<input class="input" bind:value={renameVal} placeholder="Cihaz adı" />
							<button class="btn btn--accent btn--sm" type="button" onclick={saveName}>Kaydet</button>
							<button class="btn btn--ghost btn--sm" type="button" onclick={() => (renaming = false)}>Vazgeç</button>
						</div>
					{:else}
						<h3>{mgmt.dev.name} <button class="icon" type="button" title="Adı düzenle" onclick={() => { renameVal = mgmt.dev.name; renaming = true; }}>✎</button></h3>
					{/if}
					<p class="meta">{mgmt.dev.board_name}{#if mgmt.dev.ros_detected} · v{mgmt.dev.ros_detected}{/if} · {mgmt.dev.has_wifi ? 'WiFi var' : 'WiFi yok'} · {mgmt.dev.provisioned ? 'yapılandırıldı' : 'kurulmadı'}</p>
				</div>
				<button class="closebtn" onclick={() => (mgmt.open = false)} title="Bu pencereyi kapat" aria-label="Pencereyi kapat">✕ Pencereyi kapat</button>
			</div>

			<p class="modalnote">Cihazı tünel üzerinden uzaktan yönetir. <strong>"Pencereyi kapat"</strong> yalnız bu kutuyu kapatır; cihazı kapatma/sıfırlama <strong>⚠ Tehlikeli</strong> sekmesindedir.</p>
			<div class="mtabs">
				<button class="mtab" class:on={mgmt.tab === 'durum'} type="button" onclick={() => (mgmt.tab = 'durum')}>Durum</button>
				<button class="mtab" class:on={mgmt.tab === 'ag'} type="button" onclick={() => (mgmt.tab = 'ag')}>Ağ & Portal</button>
				<button class="mtab" class:on={mgmt.tab === 'misafirler'} type="button" onclick={() => (mgmt.tab = 'misafirler')}>Misafirler</button>
				<button class="mtab" class:on={mgmt.tab === 'bakim'} type="button" onclick={() => (mgmt.tab = 'bakim')}>Bakım</button>
				<button class="mtab" class:on={mgmt.tab === 'tehlikeli'} type="button" onclick={() => (mgmt.tab = 'tehlikeli')}>⚠ Tehlikeli</button>
			</div>

			{#if mgmt.msg}<p class="mmsg">{mgmt.msg}</p>{/if}

			<div class="msec" class:tabhide={mgmt.tab !== 'durum'}>
				<h4>Cihaz</h4>
				<p class="secdesc">{mgmt.dev.board_name || 'MikroTik'}{#if mgmt.dev.ros_detected} · RouterOS v{mgmt.dev.ros_detected}{/if} · Tünel {mgmt.dev.wg_ip} · {mgmt.dev.provisioned ? 'yapılandırıldı' : 'kurulmadı'}</p>
				<h4 style="margin-top:0.8rem">Son işlemler <span class="secdesc" style="display:inline;text-transform:none;letter-spacing:0">(canlı güncellenir)</span></h4>
				{#if mgmt.history && mgmt.history.length}
					<div class="histlist">
						{#each mgmt.history.slice(0, 12) as h}
							<div class="histrow">
								<span class="tag {h.status === 'done' ? 'tag--live' : h.status === 'error' ? 'tag--bad' : 'tag--off'}">{cmdStatusLabel[h.status] ?? h.status}</span>
								<span class="hlabel">{actionLabels[h.action] ?? h.action}</span>
								<span class="hres">{h.result || (h.status === 'running' ? 'cihazda çalışıyor…' : h.status === 'pending' ? 'sırada…' : '')}</span>
								<span class="htime">{h.finished_at || h.created_at}</span>
							</div>
						{/each}
					</div>
				{:else}<p class="meta">Henüz işlem yok.</p>{/if}
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'ag'}>
				<h4>Misafir ağı</h4>
				<p class="secdesc">Misafir Wi-Fi'ını kurar/yeniler ve karşılama ekranını (hotspot) aç/kapatır.</p>
				<div class="row">
					<button class="btn btn--accent btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('apply_network', {}, 'Misafir ağı uygulandı')}>{mgmt.busy === 'apply_network' ? 'Uygulanıyor…' : (mgmt.dev.provisioned ? 'Yeniden yapılandır' : 'Yapılandır →')}</button>
					<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('hotspot_toggle', { enabled: true }, 'Hotspot açıldı')}>Hotspot AÇ</button>
					<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('hotspot_toggle', { enabled: false }, 'Hotspot kapatıldı', 'Karşılama ekranı kapatılsın mı? Misafirler doğrudan (portalsız) bağlanmaya başlar.')}>Hotspot KAPAT</button>
				</div>
				<p class="secdesc">Yeni bağlanan misafirleri "Yeniden yapılandır" yapmadan da etkiler.</p>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'ag'}>
				<h4>İnternet paylaşımı (NAT)</h4>
				<p class="secdesc">NAT açıkken misafirler internete çıkar. <strong>Kapatırsanız internet kesilir</strong> (cihaz ve tünel çalışmaya devam eder) — ör. bakım/ödeme sorununda erişimi durdurmak için.</p>
				<div class="row">
					<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('nat_toggle', { enabled: true }, 'NAT açıldı — internet açık')}>İnterneti AÇ (NAT)</button>
					<button class="btn btn--warn btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('nat_toggle', { enabled: false }, 'NAT kapatıldı — internet kesildi', 'Misafir internet erişimi kesilsin mi? Bağlı herkes internetsiz kalır (tünel/yönetim etkilenmez).', true)}>İnterneti KES (NAT)</button>
				</div>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'misafirler'}>
				<h4>Bağlı misafirler</h4>
				<p class="secdesc">Tüm aktif misafir oturumlarını sonlandırır; herkes yeniden karşılama ekranından geçmek zorunda kalır.</p>
				<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('kick_all', {}, 'Tüm oturumlar kapatıldı', 'Tüm bağlı misafirlerin oturumu kapatılsın mı? Yeniden bağlanmaları gerekir.')}>Tüm misafir oturumlarını kapat</button>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'ag'}>
				<h4>DNS sunucuları</h4>
				<p class="secdesc">Misafir ağının kullanacağı DNS sunucuları (virgülle). Reklam/içerik filtreleme DNS'i de buraya yazabilirsiniz.</p>
				<div class="row">
					<input class="input" style="max-width:240px" bind:value={mgmt.dns} placeholder="8.8.8.8,1.1.1.1" />
					<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('set_dns', { servers: mgmt.dns }, 'DNS uygulandı')}>DNS uygula</button>
					<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => { mgmt.dns = '1.1.1.3,1.0.0.3'; doAction('set_dns', { servers: '1.1.1.3,1.0.0.3' }, 'Aile filtresi DNS uygulandı'); }} title="Cloudflare for Families — yetişkin içerik + zararlı site filtresi">Aile filtresi (önerilen)</button>
				</div>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'ag'}>
				<h4>Walled garden (portalsız erişilenler)</h4>
				<p class="secdesc">Misafir <strong>karşılama ekranına girmeden</strong> erişebilsin istediğiniz siteler (otel siteniz, harita, ödeme sayfası). goX'te kalıcı tutulur, yedeğe girer. Eklemeden sonra "Cihaza uygula".</p>
				{#if mgmt.policy?.walled_garden?.length}
					<table class="ltbl"><tbody>
						{#each mgmt.policy.walled_garden as wgi}<tr><td class="mono">{wgi.host}</td><td style="text-align:right"><button class="del" title="Sil" onclick={() => delWg(wgi.id)}>×</button></td></tr>{/each}
					</tbody></table>
				{/if}
				<div class="row" style="margin-top:0.5rem">
					<input class="input" style="max-width:240px" bind:value={mgmt.wgHost} placeholder="ör. *.harita.com  veya  oteliniz.com" />
					<button class="btn btn--ghost btn--sm" onclick={addWg}>Ekle</button>
					<button class="btn btn--accent btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('sync_policy', {}, 'Politikalar cihaza uygulandı')}>Cihaza uygula (kopmasız)</button>
				</div>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'ag'}>
				<h4>İçerik / port engelleme</h4>
				<p class="secdesc">Belirli alan adı, IP veya portu misafirlere kapatın. Alan adı engelleme DNS üzerinden (alt alan adları dahil), port engelleme firewall ile. "Cihaza uygula" ile aktive edilir.</p>
				{#if mgmt.policy?.blocks?.length}
					<table class="ltbl"><thead><tr><th>Tür</th><th>Değer</th><th>Not</th><th></th></tr></thead><tbody>
						{#each mgmt.policy.blocks as bi}<tr><td>{bi.kind}</td><td class="mono">{bi.value}</td><td>{bi.note}</td><td style="text-align:right"><button class="del" title="Sil" onclick={() => delBlock(bi.id)}>×</button></td></tr>{/each}
					</tbody></table>
				{/if}
				<div class="row" style="margin-top:0.5rem">
					<select class="input" style="max-width:120px" bind:value={mgmt.blkKind}>
						<option value="domain">Alan adı</option><option value="ip">IP/CIDR</option><option value="port">Port</option>
					</select>
					<input class="input" style="max-width:200px" bind:value={mgmt.blkVal} placeholder={mgmt.blkKind === 'port' ? '6881-6889' : mgmt.blkKind === 'ip' ? '1.2.3.4' : 'ornek.com'} />
					<button class="btn btn--ghost btn--sm" onclick={addBlock}>Ekle</button>
				</div>
				<div class="row" style="margin-top:0.4rem">
					<span class="secdesc" style="margin:0 0.4rem 0 0">Hazır:</span>
					<button class="btn btn--ghost btn--sm" onclick={() => addPreset('port', '6881-6889', 'BitTorrent')}>Torrent portları</button>
					<button class="btn btn--ghost btn--sm" onclick={() => addPreset('port', '6969', 'Torrent tracker')}>Tracker (6969)</button>
				</div>
				<div class="row" style="margin-top:0.5rem">
					<button class="btn btn--accent btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('sync_policy', {}, 'Politikalar cihaza uygulandı')}>Cihaza uygula (kopmasız)</button>
				</div>
			</div>

			{#if mgmt.dev.has_wifi}
				<div class="msec" class:tabhide={mgmt.tab !== 'ag'}>
					<h4>WiFi (SSID)</h4>
					<p class="secdesc">Misafirlerin gördüğü kablosuz ağ adı. Değiştirince "Misafir ağı → Yeniden yapılandır" ile yayına alınır.</p>
					<div class="row">
						<input class="input" style="max-width:220px" bind:value={mgmt.ssid} placeholder="SSID" />
						<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={saveSsid}>SSID kaydet</button>
					</div>
				</div>
			{/if}

			<div class="msec" class:tabhide={mgmt.tab !== 'misafirler'}>
				<h4>DHCP kiralamaları</h4>
				<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={loadLeases}>{mgmt.busy === 'dhcp_leases' ? 'Alınıyor…' : 'Kiralamaları getir'}</button>
				{#if mgmt.leases}
					{#if mgmt.leases.length === 0}<p class="meta" style="margin-top:0.6rem">Aktif kiralama yok.</p>{:else}
						<table class="ltbl"><thead><tr><th>IP</th><th>MAC</th><th>Cihaz</th><th>Durum</th><th></th></tr></thead><tbody>
							{#each mgmt.leases as l}<tr><td class="mono">{l.address}</td><td class="mono">{l.mac}</td><td>{l.host}</td><td>{l.status}</td><td style="text-align:right;white-space:nowrap"><button class="btn btn--ghost btn--sm" onclick={() => fillLimit(l.mac)} title="Bu cihaza hız sınırı ver">Sınırla</button> <button class="btn btn--warn btn--sm" onclick={() => blockMac(l.mac)} title="Bu cihazı engelle (blacklist)">Engelle</button></td></tr>{/each}
						</tbody></table>
					{/if}
				{/if}
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'misafirler'}>
				<h4>Top talkers (en çok bant kullanan)</h4>
				<p class="secdesc">Aktif misafirlerin oturum içi toplam trafiği (kötüye kullananı bulun). Yüksekten düşüğe sıralı.</p>
				<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={getTalkers}>{mgmt.busy === 'top_talkers' ? 'Alınıyor…' : 'Getir'}</button>
				{#if mgmt.talkers}
					{#if mgmt.talkers.length === 0}<p class="meta" style="margin-top:0.5rem">Aktif misafir yok.</p>{:else}
						<table class="ltbl"><thead><tr><th>MAC</th><th>IP</th><th>↓ İndirme</th><th>↑ Yükleme</th><th>Toplam</th><th></th></tr></thead><tbody>
							{#each mgmt.talkers as t}<tr><td class="mono">{t.mac}</td><td class="mono">{t.ip}</td><td>{fmtBytes(t.out)}</td><td>{fmtBytes(t.in)}</td><td><strong>{fmtBytes(t.total)}</strong></td><td style="text-align:right;white-space:nowrap"><button class="btn btn--ghost btn--sm" onclick={() => fillLimit(t.mac)}>Sınırla</button> <button class="btn btn--warn btn--sm" onclick={() => blockMac(t.mac)}>Engelle</button></td></tr>{/each}
						</tbody></table>
					{/if}
				{/if}
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'misafirler'}>
				<h4>Cihaz hız sınırı (tek MAC)</h4>
				<p class="secdesc">Bir cihaza özel hız tavanı (Mbps). Kiralama/Top talkers listesinden "Sınırla" ile MAC dolar. 0 = sınırı kaldır. Anında, oturum düşmeden uygulanır.</p>
				<div class="row">
					<input class="input" style="max-width:200px" bind:value={mgmt.limMac} placeholder="MAC adresi" />
					<input class="input" style="max-width:110px" type="number" min="0" step="0.5" bind:value={mgmt.limDown} placeholder="↓ Mbps" />
					<input class="input" style="max-width:110px" type="number" min="0" step="0.5" bind:value={mgmt.limUp} placeholder="↑ Mbps" />
					<button class="btn btn--accent btn--sm" onclick={applyLimit}>Uygula</button>
				</div>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'misafirler'}>
				<h4>DHCP rezervasyonları (IP sabitleme)</h4>
				<p class="meta">goX'ta merkezi tutulur — yedeğe girer, cihaz değişse de geri yüklenir. Uygulama misafirleri düşürmez.</p>
				{#if mgmt.reservations && mgmt.reservations.length}
					<table class="ltbl"><thead><tr><th>IP</th><th>MAC</th><th>Ad</th><th></th></tr></thead><tbody>
						{#each mgmt.reservations as rv}
							<tr><td class="mono">{rv.ip}</td><td class="mono">{rv.mac}</td><td>{rv.hostname}</td><td><button class="del" title="Sil" onclick={() => delReservationConfirm(rv.id, rv.ip)}>×</button></td></tr>
						{/each}
					</tbody></table>
				{:else if mgmt.reservations}<p class="meta" style="margin-top:0.5rem">Henüz rezervasyon yok.</p>{/if}
				<textarea class="input rtxt" rows="3" bind:value={mgmt.resText} placeholder={'Toplu ekle — her satır: MAC IP ad\nAA:BB:CC:11:22:33 172.16.16.50 yazici'}></textarea>
				<div class="row">
					<button class="btn btn--ghost btn--sm" onclick={addReservations}>Listeye ekle</button>
					<button class="btn btn--accent btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('sync_reservations', {}, 'Rezervasyonlar cihaza uygulandı')}>Cihaza uygula (kopmasız)</button>
				</div>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'bakim'}>
				<h4>Saat & NTP</h4>
				<p class="secdesc">Cihaz saatini zaman dilimi + NTP ile senkronlar. Loglar ve zaman damgası tutarlılığı için önerilir.</p>
				<div class="row">
					<input class="input" style="max-width:200px" bind:value={mgmt.ntpTz} placeholder="Europe/Istanbul" />
					<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => doAction('set_time', { timezone: mgmt.ntpTz, ntp: 'tr.pool.ntp.org' }, 'Saat/NTP ayarlandı')}>Saati ayarla</button>
				</div>
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'bakim'}>
				<h4>Cihaz logları</h4>
				<p class="secdesc">Cihazın son sistem kayıtları (sorun ayıklama için).</p>
				<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={getLogs}>{mgmt.busy === 'get_logs' ? 'Alınıyor…' : 'Son logları getir'}</button>
				{#if mgmt.logs}
					{#if mgmt.logs.length === 0}<p class="meta" style="margin-top:0.5rem">Log yok.</p>{:else}
						<pre class="logbox">{mgmt.logs.join('\n')}</pre>
					{/if}
				{/if}
			</div>

			<div class="msec" class:tabhide={mgmt.tab !== 'bakim'}>
				<h4>Bakım</h4>
				<p class="secdesc">Yedek indirin / geri yükleyin, RouterOS'u güncelleyin, yönetim parolasını yenileyin.</p>
				<div class="row">
					<a class="btn btn--ghost btn--sm" href={`/panel/cihazlar/${mgmt.dev.id}/backup`}>Yedeği indir (.rsc)</a>
					<label class="btn btn--ghost btn--sm" style="cursor:pointer">Yedekten geri yükle…<input type="file" accept=".rsc,text/plain" style="display:none" onchange={restoreFile} /></label>
					<button class="btn btn--warn btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('upgrade', {}, 'Güncelleme başlatıldı — cihaz yeniden başlayacak', `"${mgmt.dev.name}" RouterOS güncellemesi indirilip kurulsun mu? Cihaz birkaç dakika yeniden başlar, internet kısa süre kesilir.`, true)}>RouterOS sürümünü yükselt</button>
				</div>
				<p class="secdesc" style="margin-top:0.6rem">Yönetim parolası gizlidir; aşağıdaki buton yeni rastgele bir parola üretip cihaza ve goX'e uygular (kimseye gösterilmez).</p>
				<button class="btn btn--ghost btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('set_admin_pass', {}, 'Yönetim parolası yenilendi', `"${mgmt.dev.name}" yönetim parolası yenilensin mi? Yeni parola otomatik üretilir, panelde saklanır (görüntülenmez).`)}>Yönetim parolasını yenile</button>
			</div>

			<div class="msec danger" class:tabhide={mgmt.tab !== 'tehlikeli'}>
				<h4>⚠ Tehlikeli işlemler</h4>
				<p class="secdesc">Bu butonlar bu pencereyi KAPATMAZ — cihaza fiziksel olarak etki eder. Pencereyi kapatmak için yukarıdaki "✕ Pencereyi kapat".</p>
				<div class="row">
					<button class="btn btn--warn btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('reboot', {}, 'Yeniden başlatılıyor…', `"${mgmt.dev.name}" cihazı yeniden başlatılsın mı? Yaklaşık 1-2 dk internet kesilir, sonra kendiliğinden açılır.`, true)}>Cihazı yeniden başlat</button>
					<button class="btn btn--danger btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('factory_reset', { mode: 'default' }, 'Varsayılan yapılandırmayla sıfırlanıyor — tekrar ZTP gerekli', `DİKKAT: "${mgmt.dev.name}" RouterOS VARSAYILAN yapılandırmasına döner (fabrika defconf geri gelir). Tüm goX yapılandırması + tünel silinir; cihazı yeniden kurmak için ZTP komutunu yeniden yapıştırmanız gerekir. Emin misiniz?`, true)}>Varsayılan config ile sıfırla (yeniden ZTP gerekir)</button>
						<button class="btn btn--danger btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('factory_reset', { mode: 'default_keep_users' }, 'Varsayılan config + kullanıcılar korunarak sıfırlanıyor — tekrar ZTP gerekli', `DİKKAT: "${mgmt.dev.name}" RouterOS VARSAYILAN yapılandırmasına döner ama mevcut KULLANICILAR/PAROLALAR korunur. goX yapılandırması + tünel silinir; cihazı yeniden kurmak için ZTP komutunu yeniden yapıştırmanız gerekir. Emin misiniz?`, true)}>Varsayılan config + kullanıcıları koru (yeniden ZTP gerekir)</button>
						<button class="btn btn--danger btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('factory_reset', { mode: 'blank' }, 'Boş yapılandırmaya sıfırlanıyor — tekrar ZTP gerekli', `DİKKAT: "${mgmt.dev.name}" BOŞ yapılandırmaya döner (hiçbir varsayılan kural yok). Tüm yapılandırma + tünel silinir; cihazı yeniden kurmak için ZTP komutunu yeniden yapıştırmanız gerekir. Emin misiniz?`, true)}>Boş config ile sıfırla (gelişmiş)</button>
					<button class="btn btn--danger btn--sm" disabled={mgmt.busy !== ''} onclick={() => confirmDo('shutdown', {}, 'Cihaz kapatılıyor…', `DİKKAT: "${mgmt.dev.name}" cihazı TAMAMEN KAPANIR. Yeniden açmak için cihazın yanına gidip fişten çekip takmak gerekir — uzaktan açılamaz! Emin misiniz?`, true)}>Cihazı tamamen kapat (fiziksel açılış gerekir)</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 52ch; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; margin-bottom: 1rem; }
	.info a { text-decoration: underline; text-decoration-color: var(--acid); text-decoration-thickness: 2px; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }

	.done { padding: 1.6rem; margin-bottom: 1.4rem; border-color: var(--ok); }
	.done h2 { font-size: 1.4rem; margin: 0.3rem 0 0.3rem; }
	.creds { display: flex; gap: 2rem; flex-wrap: wrap; margin: 1rem 0; }
	.creds code { font-family: var(--font-mono); font-size: 1.05rem; display: block; margin-top: 0.2rem; }
	.row { display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 0.6rem; }

	.wiz { padding: 1.6rem; margin-bottom: 1.4rem; }
	.step { display: flex; align-items: center; gap: 0.6rem; margin: 1.4rem 0 0.9rem; }
	.step:first-child { margin-top: 0; }
	.snum { width: 26px; height: 26px; display: grid; place-items: center; background: var(--ink); color: var(--paper); border-radius: 99px; font-family: var(--font-display); font-weight: 700; font-size: 0.85rem; }
	.step h3 { font-size: 1.15rem; }
	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
	.field { margin-bottom: 0.4rem; }

	.wanpick { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
	.wanpick label { border: 1.5px solid var(--line); border-radius: var(--radius); padding: 0.9rem 1rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.2rem; }
	.wanpick label.active { background: var(--acid); }
	.wanpick input { position: absolute; opacity: 0; }
	.wanpick strong { font-family: var(--font-display); }
	.wanpick small { color: var(--ink-soft); font-size: 0.82rem; }
	.wanpick label.active small { color: var(--ink); }

	.list { padding: 0.4rem 1.4rem 0.8rem; }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 1rem 0 0.7rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.8rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.name { font-family: var(--font-display); font-weight: 600; }
	.mono { font-family: var(--font-mono); font-size: 0.85rem; }
	.up { text-transform: uppercase; font-family: var(--font-mono); font-size: 0.78rem; }
	.right { text-align: right; white-space: nowrap; }
	.empty { text-align: center; color: var(--ink-soft); padding: 2rem 0; }
	.del { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; color: var(--ink); margin-left: 0.4rem; }
	.del:hover { background: var(--danger); color: var(--paper); border-color: var(--danger); }

	.overlay { position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 55%, transparent); display: grid; place-items: center; padding: 1.5rem; z-index: 50; }
	.modal { width: 100%; max-width: 760px; max-height: 86vh; overflow: auto; padding: 1.6rem; }
	.mhead { display: flex; align-items: flex-start; justify-content: space-between; }
	.mhead h3 { font-size: 1.3rem; }
	.cfg { background: var(--ink); color: var(--paper); border-radius: var(--radius); padding: 1rem; overflow: auto; font-family: var(--font-mono); font-size: 0.78rem; line-height: 1.5; white-space: pre; max-height: 50vh; margin: 1rem 0; }

	.meta { font-family: var(--font-mono); font-size: 0.7rem; color: var(--ink-soft); margin-top: 0.25rem; font-weight: 400; }
	.renamerow { display: flex; gap: 0.4rem; align-items: center; margin: 0.2rem 0; }
	.icon { background: transparent; border: 1.3px solid var(--line); border-radius: var(--radius); width: 26px; height: 26px; cursor: pointer; font-size: 0.8rem; color: var(--ink); vertical-align: middle; }
	.icon:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.tag--ok2 { background: color-mix(in srgb, var(--ok) 22%, var(--card)); border-color: var(--ok); margin-left: 0.3rem; }
	.tag--warn2 { background: color-mix(in srgb, var(--danger) 16%, var(--card)); border-color: var(--danger); margin-left: 0.3rem; }
	.btn--sm { margin-left: 0.3rem; }
	.msec { border-top: 1px solid color-mix(in srgb, var(--line) 30%, transparent); padding: 1rem 0 0.4rem; }
	.msec:first-of-type { border-top: none; }
	.msec h4 { font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 0.4rem; }
	.secdesc { font-size: 0.82rem; color: var(--ink-soft); margin: 0 0 0.6rem; line-height: 1.45; }
	.logbox { background: #0c0c11; color: #c8c8d2; font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.4; padding: 0.7rem 0.8rem; border-radius: 6px; max-height: 240px; overflow: auto; margin: 0.6rem 0 0; white-space: pre-wrap; word-break: break-all; }
	.mtabs { display: flex; gap: 0.3rem; flex-wrap: wrap; border-bottom: 1.5px solid var(--line); margin: 0.4rem 0 0.2rem; }
	.mtab { background: none; border: none; border-bottom: 2.5px solid transparent; padding: 0.5rem 0.8rem; cursor: pointer; color: var(--ink-soft); font-weight: 600; font-size: 0.9rem; margin-bottom: -1.5px; white-space: nowrap; }
	.mtab.on { color: var(--ink); border-bottom-color: var(--acid); }
	.tabhide { display: none; }
	.histlist { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.5rem; }
	.histrow { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; border-bottom: 1px solid color-mix(in srgb, var(--line) 18%, transparent); padding-bottom: 0.35rem; }
	.hlabel { font-weight: 600; min-width: 110px; }
	.hres { flex: 1; color: var(--ink-soft); }
	.htime { font-family: var(--font-mono); font-size: 0.72rem; color: var(--ink-soft); white-space: nowrap; }
	.mmsg { background: color-mix(in srgb, var(--acid) 16%, var(--card)); border: 1.4px solid var(--line); border-radius: 6px; padding: 0.55rem 0.8rem; font-size: 0.86rem; margin: 0.4rem 0 0.8rem; }
	.modalnote { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: 6px; padding: 0.6rem 0.8rem; font-size: 0.82rem; color: var(--ink-soft); margin: 0.2rem 0 0.6rem; line-height: 1.45; }
	.closebtn { background: transparent; border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.35rem 0.7rem; cursor: pointer; font-size: 0.82rem; color: var(--ink); white-space: nowrap; }
	.closebtn:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.msec.danger { border: 1.5px solid var(--danger); border-radius: 8px; padding: 0.9rem 1rem; margin-top: 1rem; background: color-mix(in srgb, var(--danger) 5%, transparent); }
	.msec.danger h4 { color: var(--danger); }
	.btn--warn { background: #f5a623; color: #1a1206; border: 1.5px solid #f5a623; }
	.btn--warn:hover { filter: brightness(0.95); }
	.btn--danger { background: var(--danger); color: #fff; border: 1.5px solid var(--danger); }
	.btn--danger:hover { filter: brightness(0.92); }
	.ltbl { width: 100%; border-collapse: collapse; margin-top: 0.7rem; }
	.ltbl th { text-align: left; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0 0.5rem 0.4rem 0; }
	.ltbl td { padding: 0.4rem 0.5rem 0.4rem 0; border-top: 1px solid color-mix(in srgb, var(--line) 18%, transparent); font-size: 0.84rem; }
	.rtxt { width: 100%; margin: 0.6rem 0; font-family: var(--font-mono); font-size: 0.8rem; resize: vertical; }
	@media (max-width: 860px) { .grid { grid-template-columns: 1fr; } .wanpick { grid-template-columns: 1fr; } }
</style>
