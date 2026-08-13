<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let pmsMode = $state(data.pmsConfig?.conn_mode ?? 'manual');
	let pmsProvider = $state(data.pmsConfig?.provider && data.pmsConfig.provider !== 'manual' ? data.pmsConfig.provider : 'sedna');
	const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(n ?? 0);
	const roleLabel: Record<string, string> = { owner: 'Platform Yöneticisi', customer_admin: 'İşletme Yöneticisi', customer_staff: 'Personel' };
	const statusLabel: Record<string, string> = { paid: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş' };
</script>

<svelte:head><title>Ayarlar · goX</title></svelte:head>

<p class="eyebrow">Hesap</p>
<h1>Ayarlar</h1>

<div class="cols">
	<section class="card">
		<h2>Hesap bilgileri</h2>
		<dl>
			<dt>İşletme</dt><dd>{data.customer?.name ?? '—'}</dd>
			<dt>E-posta</dt><dd>{data.ctxUser?.email ?? '—'}</dd>
			<dt>Rol</dt><dd>{roleLabel[data.ctxUser?.role] ?? data.ctxUser?.role ?? '—'}</dd>
			{#if data.customer?.plan}<dt>Plan</dt><dd>{data.customer.plan}</dd>{/if}
		</dl>
	</section>

	<section class="card">
		<h2>Parola değiştir</h2>
		{#if form?.pwError}<p class="err">{form.pwError}</p>{/if}
		{#if form?.pwOk}<p class="ok">Parola güncellendi.</p>{/if}
		<form method="POST" action="?/password" use:enhance>
			<label class="field"><span>Mevcut parola</span><input class="input" name="old" type="password" required /></label>
			<label class="field"><span>Yeni parola (min 6)</span><input class="input" name="new" type="password" minlength="6" required /></label>
			<button class="btn btn--accent" type="submit">Güncelle</button>
		</form>
	</section>
</div>

<section class="card">
	<h2>PMS Entegrasyonu {#if data.activeLocName}<span class="loctag">· {data.activeLocName}</span>{/if}</h2>
	<p class="muted">Otel yönetim sistemi (PMS) bağlantısı. Lokasyon bazlıdır — misafir listesi "Misafirler" menüsünde yönetilir.</p>
	{#if data.pmsLocationRequired}
		<p class="info">PMS entegrasyonu lokasyon bazlıdır. Ayarlamak için üst çubuktan bir <strong>lokasyon seçin</strong>.</p>
	{:else}
		{#if form?.pmsError}<p class="err">{form.pmsError}</p>{/if}
		{#if form?.pmsOk}<p class="ok">PMS ayarları kaydedildi.</p>{/if}
		{#if form?.pmsSyncMsg}<p class={form.pmsSyncOk ? 'ok' : 'err'}>{form.pmsSyncMsg}</p>{/if}
		<form method="POST" action="?/savePms" use:enhance>
			<label class="field"><span>Bağlantı yöntemi</span>
				<select class="input" name="conn_mode" bind:value={pmsMode}>
					<option value="manual">Manuel / CSV (Misafirler ekranından)</option>
					<option value="api">API konnektörü (Sedna / Elektra)</option>
					<option value="connector">DB Connector — otelde script, goX'e gönderir (A)</option>
					<option value="tunnel">DB Tünel — goX, DB'yi tünelden okur (B)</option>
				</select></label>
			<label class="chk"><input type="checkbox" name="enabled" checked={data.pmsConfig?.enabled} /> Entegrasyon aktif</label>

			{#if pmsMode === 'api'}
				<label class="field"><span>PMS sağlayıcı</span>
					<select class="input" name="provider" bind:value={pmsProvider}>
						<option value="sedna">Sedna</option>
						<option value="elektra">Elektra</option>
					</select></label>
				<div class="dbgrid">
					<label class="field"><span>API adresi (endpoint)</span><input class="input" name="endpoint" value={data.pmsConfig?.endpoint ?? ''} placeholder="https://..." /></label>
					<label class="field"><span>API anahtarı</span><input class="input" name="api_key" value={data.pmsConfig?.api_key ?? ''} autocomplete="off" /></label>
					<label class="field"><span>Otel kodu</span><input class="input" name="hotel_code" value={data.pmsConfig?.hotel_code ?? ''} /></label>
				</div>
				<p class="muted">Not: {pmsProvider === 'sedna' ? 'Sedna' : 'Elektra'} konnektörü, sağlayıcının API erişim bilgileri tanımlanınca aktifleşir.</p>
			{/if}

			{#if pmsMode === 'connector' || pmsMode === 'tunnel'}
				<p class="muted">DB <strong>view</strong>'ı şu 5 sütunu döndürmeli: <code>room, full_name, surname, checkin, checkout</code>. Salt-okunur bir DB kullanıcısı yeterlidir.</p>
				<div class="dbgrid">
					<label class="field"><span>DB türü</span>
						<select class="input" name="db_kind" value={data.pmsConfig?.db_kind ?? 'sqlserver'}>
							<option value="sqlserver">MS SQL Server</option><option value="mysql">MySQL</option>
							<option value="firebird">Firebird</option><option value="postgres">PostgreSQL</option>
						</select></label>
					<label class="field"><span>DB sunucu (host/IP)</span><input class="input" name="db_host" value={data.pmsConfig?.db_host ?? ''} placeholder={pmsMode === 'tunnel' ? 'cihazın ağındaki IP' : '127.0.0.1'} /></label>
					<label class="field"><span>Port</span><input class="input" name="db_port" type="number" value={data.pmsConfig?.db_port || ''} placeholder="1433" /></label>
					<label class="field"><span>Veritabanı</span><input class="input" name="db_name" value={data.pmsConfig?.db_name ?? ''} /></label>
					<label class="field"><span>Kullanıcı</span><input class="input" name="db_user" value={data.pmsConfig?.db_user ?? ''} autocomplete="off" /></label>
					<label class="field"><span>Parola {#if data.pmsConfig?.has_db_pass}<small>(kayıtlı)</small>{/if}</span><input class="input" name="db_pass" type="password" autocomplete="off" placeholder={data.pmsConfig?.has_db_pass ? '••••••' : ''} /></label>
				</div>
				<label class="field"><span>View sorgusu (SELECT)</span><textarea class="input" name="db_query" rows="2" placeholder="SELECT room, full_name, surname, checkin, checkout FROM gox_misafir_view">{data.pmsConfig?.db_query ?? ''}</textarea></label>
			{/if}

			<div class="prow">
				<button class="btn btn--accent" type="submit">Kaydet</button>
				{#if pmsMode === 'api' || pmsMode === 'tunnel'}<button class="btn btn--ghost" type="submit" formaction="?/syncPms">Şimdi senkronla</button>{/if}
			</div>
		</form>

		{#if pmsMode === 'connector'}
			<div class="connbox">
				<h3>Connector script</h3>
				{#if data.pmsConfig?.has_token}
					<p class="muted">DB erişimli bir makineye indirip zamanlanmış görevle çalıştırın (5 dk). goX'e güvenli push eder.</p>
					<div class="prow">
						<a class="btn btn--sm" href="/panel/ayarlar/connector?fmt=php" target="_blank" rel="noopener">PHP indir</a>
						<a class="btn btn--sm" href="/panel/ayarlar/connector?fmt=ps1" target="_blank" rel="noopener">PowerShell indir</a>
					</div>
				{:else}
					<p class="muted">Önce <strong>Kaydet</strong> deyin — sisteme özel push anahtarı oluşturulup script indirilebilir hale gelir.</p>
				{/if}
			</div>
		{/if}
		{#if pmsMode === 'tunnel' && data.pmsConfig?.last_pull_msg}
			<p class="muted">Son çekim: {data.pmsConfig.last_pull} · {data.pmsConfig.last_pull_msg}</p>
		{/if}
	{/if}
</section>

<section class="card pay">
	<h2>Abonelik & Ödemeler</h2>
	<table class="tbl">
		<thead><tr><th>Dönem</th><th>Tutar</th><th>Durum</th><th>Tarih</th></tr></thead>
		<tbody>
			{#each data.payments as p (p.id)}
				<tr>
					<td class="mono">{p.period || '—'}</td>
					<td class="mono">₺{fmt(p.amount)}</td>
					<td><span class="tag {p.status === 'paid' ? 'tag--live' : 'tag--off'}">{statusLabel[p.status] ?? p.status}</span></td>
					<td class="mono">{p.date}</td>
				</tr>
			{/each}
			{#if data.payments.length === 0}<tr><td colspan="4" class="empty">Henüz ödeme kaydı yok.</td></tr>{/if}
		</tbody>
	</table>
</section>

<style>
	h1 { font-size: 2rem; margin: 0.4rem 0 1.6rem; }
	.cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); margin-bottom: var(--gap); align-items: start; }
	.card { padding: 1.4rem; }
	.card h2 { font-size: 1.2rem; margin: 0 0 1rem; }
	dl { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1.2rem; margin: 0; }
	dt { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); align-self: center; }
	dd { margin: 0; font-weight: 500; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 0.8rem; }
	.ok { background: color-mix(in srgb, var(--ok) 14%, var(--card)); border: 1.4px solid var(--ok); color: var(--ok); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 0.8rem; }
	.loctag { font-family: var(--font-mono); font-size: 0.8rem; color: var(--ink-soft); font-weight: 400; }
	.muted { color: var(--ink-soft); font-size: 0.85rem; margin: 0 0 0.9rem; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.7rem 0.9rem; }
	.field { display: flex; flex-direction: column; margin-bottom: 0.7rem; }
	.field span { font-size: 0.78rem; margin-bottom: 0.25rem; }
	.chk { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0 0.8rem; font-weight: 500; }
	.prow { display: flex; gap: 0.7rem; flex-wrap: wrap; }
	.dbgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem 0.8rem; margin: 0.4rem 0 0.6rem; }
	.dbgrid .field { margin-bottom: 0; }
	.connbox { margin-top: 1rem; padding-top: 1rem; border-top: 1.4px solid var(--line); }
	.connbox h3 { font-size: 1rem; margin: 0 0 0.4rem; }
	.muted code { font-family: var(--font-mono); font-size: 0.82rem; }
	.pay { padding: 1.4rem; }
	@media (max-width: 640px) { .dbgrid { grid-template-columns: 1fr; } }
	.tbl { width: 100%; border-collapse: collapse; }
	.tbl th { text-align: left; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); padding: 0.8rem 0 0.5rem; border-bottom: 1.5px solid var(--line); }
	.tbl td { padding: 0.7rem 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 15%, transparent); font-size: 0.92rem; }
	.tbl tr:last-child td { border-bottom: none; }
	.mono { font-family: var(--font-mono); }
	.empty { text-align: center; color: var(--ink-soft); padding: 1.5rem 0; }
	@media (max-width: 820px) { .cols { grid-template-columns: 1fr; } }
</style>
