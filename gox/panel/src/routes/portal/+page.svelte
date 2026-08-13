<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const p = data.portal;

	// Dil: İngilizce metin tanımlıysa TR/EN geçişi sunulur.
	const hasEn = !!(p.welcome_title_en || p.welcome_text_en);
	let lang = $state<'tr' | 'en'>('tr');
	const L = (tr: string, en: string) => (lang === 'en' ? en : tr);
	const welcomeTitle = $derived(lang === 'en' && p.welcome_title_en ? p.welcome_title_en : p.welcome_title);
	const welcomeText = $derived(lang === 'en' && p.welcome_text_en ? p.welcome_text_en : p.welcome_text);

	// KVKK aydınlatma metni tanımlıysa, bağlanmadan önce onay kutusu zorunlu.
	const kvkkReq = !!p.kvkk_text;
	let kvkkOk = $state(false);

	type Opt = { key: string; label: string };
	const labelDefs: Record<string, [string, string]> = {
		guest: ['Misafir girişi', 'Guest access'],
		staff: ['Personel girişi', 'Staff login'],
		meeting: ['Toplantı girişi', 'Meeting access'],
		temp: ['2 saatlik erişim', '2-hour access'],
		mernis: ['TC ile giriş', 'ID verification'],
		voucher: ['Kod ile giriş', 'Access code'],
		email: ['E-posta ile giriş', 'Email login'],
		whatsapp: ['WhatsApp ile giriş', 'WhatsApp login']
	};
	const enabledKeys = [
		p.opt_guest && 'guest', p.opt_staff && 'staff', p.opt_meeting && 'meeting',
		p.opt_temp && 'temp', p.opt_mernis && 'mernis', p.opt_voucher && 'voucher',
		p.opt_email && 'email', p.opt_whatsapp && 'whatsapp'
	].filter(Boolean) as string[];
	// Sıra: opt_order'a göre (temp hariç). temp her zaman en altta ikincil link olarak çıkar.
	const order = (p.opt_order || '').split(',').map((s) => s.trim()).filter(Boolean);
	const enabledNonTemp = enabledKeys.filter((k) => k !== 'temp');
	const orderedKeys = [
		...order.filter((k) => enabledNonTemp.includes(k)),
		...enabledNonTemp.filter((k) => !order.includes(k))
	];
	const tempEnabled = enabledKeys.includes('temp');
	// Tek-kullanımlık temp ve bu cihaz kullandıysa link gizlenir.
	const showTemp = tempEnabled && !(p.temp_once && p.temp_used);
	const tempText = $derived((p.temp_label || '').trim() || L('Hızlı geçiş', 'Quick access'));
	const opts = $derived<Opt[]>(orderedKeys.map((k) => ({ key: k, label: L(labelDefs[k][0], labelDefs[k][1]) })));

	// Aktif anket varsa önce ZORUNLU anket adımı (doldurmadan giriş açılmaz)
	let view = $state<'options' | 'mernis' | 'pms' | 'survey' | 'staff' | 'voucher' | 'email' | 'whatsapp'>(
		data.survey ? 'survey' : data.code ? 'voucher' : 'options'
	);
	let error = $state('');
	let sending = $state(false);
	let tc = $state(''), ad = $state(''), soyad = $state(''), dogum = $state(''), room = $state('');
	let username = $state(''), password = $state(''), code = $state(data.code ?? '');
	let email = $state(''), otpStage = $state<'enter' | 'code'>('enter'), otpCode = $state('');
	let waLink = $state(''), waToken = $state(''), waWaiting = $state(false);
	let waTimer: ReturnType<typeof setInterval> | null = null;
	onDestroy(() => { if (waTimer) clearInterval(waTimer); });
	let answers = $state<Record<number, string>>({});
	function setAns(qid: number, val: string) { answers = { ...answers, [qid]: val }; }
	const surveyDone = $derived(
		!data.survey || data.survey.questions.every((q: any) => String(answers[q.id] ?? '') !== '')
	);
	async function submitSurvey() {
		if (!data.survey) { view = 'options'; return; }
		sending = true; error = '';
		try {
			const res = await fetch(`/api/survey/${data.survey.id}/respond`, {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mac: data.mac,
					answers: Object.entries(answers).map(([qid, value]) => ({ question_id: Number(qid), value }))
				})
			});
			if (!res.ok) { error = 'Gönderilemedi, tekrar deneyin.'; sending = false; return; }
			view = 'options'; // anket dolduruldu → giriş seçenekleri açılır
		} catch { error = 'Bağlantı hatası'; }
		sending = false;
	}

	function kvkkBlocked() {
		if (kvkkReq && !kvkkOk) {
			error = L('Devam etmek için onay kutusunu işaretleyin.', 'Please accept to continue.');
			return true;
		}
		return false;
	}

	function onOption(key: string) {
		error = '';
		if (kvkkBlocked()) return;
		if (key === 'mernis') { view = 'mernis'; return; }
		if (key === 'staff') { view = 'staff'; return; }
		if (key === 'voucher') { view = 'voucher'; return; }
		if (key === 'email') { view = 'email'; otpStage = 'enter'; otpCode = ''; return; }
		if (key === 'whatsapp') { startWhatsapp(); return; }
		if (key === 'guest' && data.sector === 'hotel') { view = 'pms'; return; }
		grantAndLogin(key);
	}

	// WhatsApp girişi: oturum başlat → wa.me linki aç → durumu poll et → doğrulanınca bağlan
	function stopWaPoll() { if (waTimer) { clearInterval(waTimer); waTimer = null; } }
	async function startWhatsapp() {
		error = ''; sending = true; waWaiting = false; waLink = ''; waToken = '';
		try {
			const res = await fetch('/api/portal/wa-start', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: Number(data.site), mac: data.mac })
			});
			if (!res.ok) { error = (await res.json().catch(() => ({}))).error ?? L('Başlatılamadı', 'Could not start'); sending = false; return; }
			const d = await res.json();
			waLink = d.wa_link; waToken = d.token; view = 'whatsapp'; waWaiting = true;
			window.open(waLink, '_blank'); // WhatsApp'ı aç (mesaj hazır)
			stopWaPoll();
			waTimer = setInterval(pollWa, 2500);
		} catch { error = L('Bağlantı hatası', 'Connection error'); }
		sending = false;
	}
	async function pollWa() {
		if (!waToken) return;
		try {
			const res = await fetch(`/api/portal/wa-status?token=${encodeURIComponent(waToken)}`);
			if (!res.ok) return;
			const d = await res.json();
			if (d.expired) { stopWaPoll(); waWaiting = false; error = L('Süre doldu, tekrar deneyin.', 'Expired, try again.'); return; }
			if (d.verified) {
				stopWaPoll();
				if (!data.linkLogin) { error = 'Bu ekran yalnız önizleme.'; return; }
				const vr = await fetch('/api/portal/verify', {
					method: 'POST', headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ site: Number(data.site), method: 'whatsapp', mac: data.mac, token: waToken, ip: data.ip })
				});
				if (vr.ok) { await grantAndLogin('guest'); return; }
				error = (await vr.json().catch(() => ({}))).error ?? L('Doğrulanamadı', 'Verification failed');
			}
		} catch { /* poll sessiz */ }
	}

	// E-posta OTP: kod gönder
	async function sendEmailOtp() {
		sending = true; error = '';
		try {
			const res = await fetch('/api/portal/email-otp', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: Number(data.site), email, mac: data.mac })
			});
			if (res.ok) { otpStage = 'code'; }
			else error = (await res.json().catch(() => ({}))).error ?? L('Kod gönderilemedi', 'Could not send code');
		} catch { error = L('Bağlantı hatası', 'Connection error'); }
		sending = false;
	}
	// E-posta OTP: kodu doğrula → misafir profiline bağla → giriş
	async function verifyEmail() {
		if (!data.linkLogin) { error = 'Bu ekran yalnız önizleme.'; return; }
		sending = true; error = '';
		try {
			const res = await fetch('/api/portal/verify', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: Number(data.site), method: 'email', mac: data.mac, email, code: otpCode, ip: data.ip })
			});
			if (res.ok) { await grantAndLogin('guest'); return; }
			error = (await res.json().catch(() => ({}))).error ?? L('Kod doğrulanamadı', 'Verification failed');
		} catch { error = L('Bağlantı hatası', 'Connection error'); }
		sending = false;
	}

	// Hotspot login'e yönlendir (MAC zaten ilgili profile bağlandıktan sonra).
	// Giriş sonrası: redirect_url tanımlıysa oraya, yoksa misafirin gitmek istediği adrese.
	function loginRedirect() {
		if (!data.linkLogin) { error = 'Bu ekran yalnız önizleme.'; return; }
		const dst = p.redirect_url || data.linkOrig || '';
		const sep = data.linkLogin.includes('?') ? '&' : '?';
		window.location.href = `${data.linkLogin}${sep}username=${encodeURIComponent(data.mac)}&password=${encodeURIComponent(data.mac)}&dst=${encodeURIComponent(dst)}`;
	}

	async function grantAndLogin(key: string) {
		if (!data.linkLogin) { error = 'Bu ekran yalnız önizleme.'; return; }
		try {
			await fetch('/api/portal/grant', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: Number(data.site), mac: data.mac, option: key, ip: data.ip })
			});
		} catch {}
		loginRedirect();
	}

	// Kod ile giriş: doğrula → sunucu MAC'i voucher profiline bağlar → hotspot login'e geç.
	async function verifyVoucher() {
		if (!data.linkLogin) { error = 'Bu ekran yalnız önizleme.'; return; }
		sending = true; error = '';
		try {
			const res = await fetch('/api/portal/verify', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ site: Number(data.site), method: 'voucher', mac: data.mac, code, ip: data.ip })
			});
			if (res.ok) { loginRedirect(); return; }
			error = (await res.json().catch(() => ({}))).error ?? 'Kod doğrulanamadı';
		} catch { error = 'Bağlantı hatası'; }
		sending = false;
	}

	async function verify(method: 'mernis' | 'pms' | 'staff') {
		sending = true; error = '';
		try {
			const res = await fetch('/api/portal/verify', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					site: Number(data.site), method, mac: data.mac,
					tc, ad, soyad, dogum_yili: Number(dogum) || 0, room, surname: soyad,
					username, password
				})
			});
			if (res.ok) { await grantAndLogin(method === 'staff' ? 'staff' : 'guest'); return; }
			error = (await res.json().catch(() => ({}))).error ?? 'Doğrulanamadı';
		} catch { error = 'Bağlantı hatası'; }
		sending = false;
	}
</script>

<svelte:head>
	<title>{p.brand_name} · Wi-Fi</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div class="screen" data-theme={p.theme} style="--pp:{p.primary_color}">
	<div class="card">
		{#if p.logo}<img class="logo" src={p.logo} alt={p.brand_name} />{:else}<div class="brand">{p.brand_name}</div>{/if}

		{#if data.suspended}
			<div class="badge">{L('Geçici olarak kapalı', 'Temporarily unavailable')}</div>
			<h1>{L('Wi-Fi hizmeti şu anda kullanılamıyor', 'Wi-Fi is currently unavailable')}</h1>
			<p class="lead">{L('Bu işletmenin misafir interneti geçici olarak durdurulmuştur. Lütfen işletme görevlisiyle iletişime geçin.', 'Guest internet for this venue is temporarily paused. Please contact the venue staff.')}</p>
		{:else if view === 'survey'}
			<div class="badge">Kısa anket</div>
			<h1>{data.survey.title}</h1>
			<p class="lead">İnternete bağlanmadan önce lütfen yanıtlayın.</p>
			{#each data.survey.questions as q}
				<div class="q">
					<p class="qt">{q.text}</p>
					{#if q.qtype === 'rating'}
						<div class="stars">
							{#each [1, 2, 3, 4, 5] as n}
								<button class="star" class:on={Number(answers[q.id]) >= n} type="button" aria-label={`${n} yıldız`} onclick={() => setAns(q.id, String(n))}>★</button>
							{/each}
						</div>
					{:else if q.qtype === 'choice'}
						<div class="choices">
							{#each q.options ?? [] as opt}
								<button class="choice" class:on={answers[q.id] === opt} type="button" onclick={() => setAns(q.id, opt)}>{opt}</button>
							{/each}
						</div>
					{:else}
						<input class="in" value={answers[q.id] ?? ''} oninput={(e) => setAns(q.id, (e.target as HTMLInputElement).value)} placeholder="Yanıtınız" />
					{/if}
				</div>
			{/each}
			{#if error}<p class="err">{error}</p>{/if}
			<button class="cta" type="button" onclick={submitSurvey} disabled={sending || !surveyDone}>{sending ? 'Gönderiliyor…' : 'Gönder ve bağlan'}</button>
		{:else if view === 'voucher'}
			<h1>Kod ile giriş</h1>
			<p class="lead">Size verilen erişim kodunu girin.</p>
			<input class="in code-in" bind:value={code} placeholder="ÖRN: ABCD2345" autocapitalize="characters" autocomplete="off" autocorrect="off" />
			{#if error}<p class="err">{error}</p>{/if}
			<button class="cta" type="button" onclick={verifyVoucher} disabled={sending || !code}>{sending ? 'Kontrol ediliyor…' : 'Bağlan'}</button>
			<button class="back" type="button" onclick={() => (view = 'options')}>← geri</button>
		{:else if view === 'email'}
			<h1>{L('E-posta ile giriş', 'Email login')}</h1>
			{#if otpStage === 'enter'}
				<p class="lead">{L('E-posta adresinizi girin, size bir doğrulama kodu gönderelim.', 'Enter your email and we will send a verification code.')}</p>
				<input class="in" bind:value={email} type="email" inputmode="email" placeholder="ornek@eposta.com" autocapitalize="off" autocorrect="off" autocomplete="email" />
				<p class="hint">{L('Kodu görmek için mobil verinizin açık olması gerekebilir.', 'You may need mobile data on to receive the code.')}</p>
				{#if error}<p class="err">{error}</p>{/if}
				<button class="cta" type="button" onclick={sendEmailOtp} disabled={sending || !email}>{sending ? L('Gönderiliyor…', 'Sending…') : L('Kod gönder', 'Send code')}</button>
			{:else}
				<p class="lead">{L('E-postanıza gelen 6 haneli kodu girin.', 'Enter the 6-digit code sent to your email.')}<br /><b>{email}</b></p>
				<input class="in code-in" bind:value={otpCode} inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code" />
				{#if error}<p class="err">{error}</p>{/if}
				<button class="cta" type="button" onclick={verifyEmail} disabled={sending || otpCode.length < 4}>{sending ? L('Kontrol ediliyor…', 'Checking…') : L('Bağlan', 'Connect')}</button>
				<button class="back" type="button" onclick={() => { otpStage = 'enter'; otpCode = ''; error = ''; }}>← {L('e-postayı değiştir', 'change email')}</button>
			{/if}
			<button class="back" type="button" onclick={() => (view = 'options')}>← {L('geri', 'back')}</button>
		{:else if view === 'whatsapp'}
			<h1>{L('WhatsApp ile giriş', 'WhatsApp login')}</h1>
			<p class="lead">{L('Açılan WhatsApp ekranında hazır mesajı GÖNDERİN. Onaylanınca otomatik bağlanacaksınız.', 'Send the prepared message in WhatsApp. You will be connected automatically once confirmed.')}</p>
			{#if waLink}<a class="cta" href={waLink} target="_blank" rel="noreferrer">{L('WhatsApp’ı aç', 'Open WhatsApp')}</a>{/if}
			{#if waWaiting}<p class="hint">{L('Mesajınız bekleniyor…', 'Waiting for your message…')}</p>{/if}
			<p class="hint">{L('Kodu görmek için mobil verinizin açık olması gerekebilir.', 'You may need mobile data on.')}</p>
			{#if error}<p class="err">{error}</p>{/if}
			<button class="back" type="button" onclick={() => { stopWaPoll(); waWaiting = false; view = 'options'; }}>← {L('geri', 'back')}</button>
		{:else if view === 'staff'}
			<h1>Personel girişi</h1>
			<p class="lead">Kullanıcı adı ve parolanızla bağlanın.</p>
			<input class="in" bind:value={username} placeholder="Kullanıcı adı" autocomplete="username" autocapitalize="off" autocorrect="off" />
			<input class="in" bind:value={password} type="password" placeholder="Parola" autocomplete="current-password" />
			{#if error}<p class="err">{error}</p>{/if}
			<button class="cta" type="button" onclick={() => verify('staff')} disabled={sending || !username || !password}>{sending ? 'Kontrol ediliyor…' : 'Giriş yap'}</button>
			<button class="back" type="button" onclick={() => (view = 'options')}>← geri</button>
		{:else if view === 'mernis'}
			<h1>TC ile giriş</h1>
			<p class="lead">Kimlik bilgilerinizi girin.</p>
			<input class="in" bind:value={tc} placeholder="TC Kimlik No" inputmode="numeric" maxlength="11" />
			<input class="in" bind:value={ad} placeholder="Ad" />
			<input class="in" bind:value={soyad} placeholder="Soyad" />
			<input class="in" bind:value={dogum} placeholder="Doğum yılı (1990)" inputmode="numeric" maxlength="4" />
			{#if error}<p class="err">{error}</p>{/if}
			<button class="cta" type="button" onclick={() => verify('mernis')} disabled={sending}>{sending ? 'Doğrulanıyor…' : 'Doğrula ve bağlan'}</button>
			<button class="back" type="button" onclick={() => (view = 'options')}>← geri</button>
		{:else if view === 'pms'}
			<h1>Oda girişi</h1>
			<p class="lead">Oda numaranız ve soyadınızla giriş yapın.</p>
			<input class="in" bind:value={room} placeholder="Oda numarası" />
			<input class="in" bind:value={soyad} placeholder="Soyadınız" />
			{#if error}<p class="err">{error}</p>{/if}
			<button class="cta" type="button" onclick={() => verify('pms')} disabled={sending}>{sending ? 'Kontrol ediliyor…' : 'Giriş yap'}</button>
			<button class="back" type="button" onclick={() => (view = 'options')}>← geri</button>
		{:else}
			{#if hasEn}
				<div class="langs">
					<button class="langbtn" class:on={lang === 'tr'} type="button" onclick={() => (lang = 'tr')}>TR</button>
					<button class="langbtn" class:on={lang === 'en'} type="button" onclick={() => (lang = 'en')}>EN</button>
				</div>
			{/if}
			<h1>{welcomeTitle}</h1>
			<p class="lead">{welcomeText}</p>
			{#if kvkkReq}
				<label class="kvkk">
					<input type="checkbox" bind:checked={kvkkOk} />
					<span>{p.kvkk_text}</span>
				</label>
			{/if}
			{#if error}<p class="err">{error}</p>{/if}
			<div class="opts">
				{#each opts as o}
					<button class="opt" type="button" onclick={() => onOption(o.key)}>{o.label}</button>
				{/each}
				{#if opts.length === 0 && !tempEnabled}<p class="lead">{L('Şu an aktif giriş seçeneği yok.', 'No access option is active right now.')}</p>{/if}
			</div>
			{#if showTemp}
				<button class="templink" type="button" onclick={() => onOption('temp')}>{tempText}</button>
			{/if}
		{/if}

		{#if data.preview}<p class="hint">Önizleme</p>{/if}
		{#if data.mac || data.ip || data.preview}
			<div class="devinfo">
				<span class="dlabel">Cihazınız</span>
				<span class="dval">MAC: <b>{data.mac || '—'}</b></span>
				<span class="dval">IP: <b>{data.ip || '—'}</b></span>
			</div>
		{/if}
		<div class="foot">Powered by goX</div>
	</div>
</div>

<style>
	.screen { min-height: 100vh; display: grid; place-items: center; padding: 1.25rem; }
	.card { width: 100%; max-width: 380px; padding: 2rem 1.6rem 1.4rem; text-align: center; }
	.logo { max-height: 64px; max-width: 70%; margin: 0 auto 1.2rem; display: block; object-fit: contain; }
	.brand { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.35rem 0.7rem; border-radius: 99px; margin-bottom: 1.4rem; }
	h1 { font-family: var(--font-display); font-weight: 600; font-size: 2rem; letter-spacing: -0.02em; margin: 0 0 0.5rem; }
	.lead { color: var(--ink-soft); margin: 0 0 1.4rem; font-size: 0.98rem; }
	.in { width: 100%; padding: 0.8rem 0.9rem; margin-bottom: 0.6rem; font-family: var(--font-text); font-size: 1rem; }
	.code-in { text-transform: uppercase; letter-spacing: 0.18em; text-align: center; font-family: var(--font-mono); font-size: 1.15rem; }
	.opts { display: flex; flex-direction: column; gap: 0.7rem; }
	.opt, .cta { width: 100%; font-family: var(--font-display); font-weight: 600; font-size: 1.02rem; padding: 0.95rem 1rem; cursor: pointer; }
	.cta { margin-top: 0.3rem; }
	.back { background: none; border: none; color: var(--ink-soft); cursor: pointer; margin-top: 0.8rem; font-family: var(--font-mono); font-size: 0.8rem; }
	.templink { display: block; width: 100%; background: none; border: none; color: var(--ink-soft); cursor: pointer; margin-top: 1.1rem; font-size: 0.78rem; text-decoration: underline; text-underline-offset: 3px; opacity: 0.7; }
	.templink:hover { opacity: 1; }
	[data-theme="dark"] .templink { color: #8a8a98; }
	.err { color: var(--danger); font-size: 0.9rem; margin: 0 0 0.6rem; }

	.langs { display: flex; gap: 0.3rem; justify-content: flex-end; margin-bottom: 0.4rem; }
	.langbtn { border: 1.3px solid var(--line); background: transparent; color: var(--ink); border-radius: 6px; padding: 0.15rem 0.5rem; font-family: var(--font-mono); font-size: 0.7rem; cursor: pointer; }
	.langbtn.on { background: var(--pp); border-color: var(--pp); color: #16150f; }
	.kvkk { display: flex; gap: 0.55rem; align-items: flex-start; text-align: left; font-size: 0.82rem; color: var(--ink-soft); margin: 0 0 1rem; line-height: 1.4; }
	.kvkk input { margin-top: 0.15rem; flex: none; }
	[data-theme="dark"] .langbtn { color: #f3f3f7; border-color: #2a2a35; }
	[data-theme="dark"] .langbtn.on { color: #0c0c11; }
	[data-theme="dark"] .kvkk { color: #c8c8d2; }

	/* ── Anket (gate) — tema duyarlı, koyu temada da okunur ── */
	.badge { display: inline-block; align-self: flex-start; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.28rem 0.65rem; border-radius: 999px; background: var(--pp); color: #16150f; margin-bottom: 0.5rem; }
	.q { text-align: left; margin: 0 0 1.2rem; }
	.qt { font-weight: 600; font-size: 1.02rem; margin: 0 0 0.65rem; color: var(--ink); line-height: 1.4; }
	.stars { display: flex; gap: 0.35rem; }
	.star { background: none; border: none; cursor: pointer; font-size: 2rem; line-height: 1; color: color-mix(in srgb, var(--ink) 22%, transparent); padding: 0; transition: color 0.1s, transform 0.1s; }
	.star:hover { transform: scale(1.1); }
	.star.on { color: #f5b301; }
	.choices { display: flex; flex-direction: column; gap: 0.5rem; }
	.choice { text-align: left; padding: 0.72rem 0.95rem; border: 1.5px solid var(--line); border-radius: 9px; background: transparent; color: var(--ink); cursor: pointer; font-size: 0.95rem; transition: border-color 0.1s, background 0.1s; }
	.choice:hover { border-color: var(--pp); }
	.choice.on { background: var(--pp); border-color: var(--pp); color: #16150f; font-weight: 600; }
	.hint { margin-top: 1.2rem; font-size: 0.78rem; color: var(--ink-soft); }
	.devinfo { margin-top: 1.2rem; padding-top: 0.8rem; border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent); display: flex; flex-direction: column; gap: 0.15rem; font-family: var(--font-mono); font-size: 0.66rem; opacity: 0.72; }
	.dlabel { letter-spacing: 0.14em; text-transform: uppercase; font-size: 0.56rem; opacity: 0.75; }
	.dval b { font-weight: 700; }
	.foot { margin-top: 1.4rem; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute); }

	[data-theme="editorial"] { background: radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--pp) 28%, transparent), transparent 60%), var(--paper); }
	[data-theme="editorial"] .card { background: var(--card); border: 1.5px solid var(--ink); border-radius: 6px; box-shadow: 6px 6px 0 0 var(--ink); }
	[data-theme="editorial"] .brand { background: var(--pp); color: var(--ink); border: 1.4px solid var(--ink); }
	[data-theme="editorial"] .in { background: var(--paper); border: 1.5px solid var(--ink); border-radius: 4px; }
	[data-theme="editorial"] .opt { background: var(--paper); color: var(--ink); border: 1.5px solid var(--ink); border-radius: 5px; }
	[data-theme="editorial"] .opt:hover { background: var(--pp); }
	[data-theme="editorial"] .cta { background: var(--ink); color: var(--paper); border: 1.5px solid var(--ink); border-radius: 5px; }

	[data-theme="dark"] { background: #0c0c11; }
	[data-theme="dark"] .card { background: #16161d; border: 1px solid #2a2a35; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
	[data-theme="dark"] h1 { color: #f3f3f7; }
	[data-theme="dark"] .lead, [data-theme="dark"] .foot, [data-theme="dark"] .hint { color: #9a9aa8; }
	[data-theme="dark"] .brand { background: var(--pp); color: #0c0c11; }
	[data-theme="dark"] .in { background: #0c0c11; border: 1px solid #2a2a35; border-radius: 10px; color: #f3f3f7; }
	[data-theme="dark"] .opt { background: #0c0c11; color: #f3f3f7; border: 1px solid #2a2a35; border-radius: 10px; }
	[data-theme="dark"] .opt:hover { border-color: var(--pp); }
	[data-theme="dark"] .cta { background: var(--pp); color: #0c0c11; border: none; border-radius: 10px; }
	[data-theme="dark"] .qt { color: #f3f3f7; }
	[data-theme="dark"] .star { color: #3a3a45; }
	[data-theme="dark"] .choice { background: #0c0c11; color: #f3f3f7; border: 1px solid #2a2a35; border-radius: 10px; }
	[data-theme="dark"] .choice.on { background: var(--pp); color: #0c0c11; border-color: var(--pp); }
	[data-theme="dark"] .badge { background: var(--pp); color: #0c0c11; }

	[data-theme="soft"] { background: linear-gradient(160deg, color-mix(in srgb, var(--pp) 18%, #fff), #fbfaf7); }
	[data-theme="soft"] .card { background: #fff; border: none; border-radius: 24px; box-shadow: 0 18px 50px rgba(0,0,0,0.08); }
	[data-theme="soft"] .brand { background: color-mix(in srgb, var(--pp) 25%, #fff); color: #333; }
	[data-theme="soft"] .in { background: #f6f5f2; border: 1.5px solid transparent; border-radius: 14px; }
	[data-theme="soft"] .opt { background: #f6f5f2; color: #222; border: none; border-radius: 14px; }
	[data-theme="soft"] .opt:hover { background: color-mix(in srgb, var(--pp) 30%, #fff); }
	[data-theme="soft"] .cta { background: var(--pp); color: #222; border: none; border-radius: 14px; }

	[data-theme="minimal"] { background: #fff; }
	[data-theme="minimal"] .card { background: #fff; border: none; }
	[data-theme="minimal"] h1 { font-weight: 500; }
	[data-theme="minimal"] .brand { background: none; border: none; color: #111; letter-spacing: 0.3em; padding: 0; }
	[data-theme="minimal"] .in { background: none; border: none; border-bottom: 1.5px solid #ddd; border-radius: 0; }
	[data-theme="minimal"] .opt { background: none; color: #111; border: 1px solid #ddd; border-radius: 2px; font-weight: 500; }
	[data-theme="minimal"] .opt:hover { border-color: #111; }
	[data-theme="minimal"] .cta { background: #111; color: #fff; border: none; border-radius: 2px; }
</style>
