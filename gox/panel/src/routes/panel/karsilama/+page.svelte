<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Sıralanabilir giriş seçenekleri (temp hariç — o ayrı, her zaman en altta ikincil link).
	let tab = $state<'genel' | 'gecici'>('genel');
	const orderable = ['guest', 'staff', 'meeting', 'mernis', 'voucher', 'email', 'whatsapp'];
	const optLabel: Record<string, string> = {
		guest: 'Misafir girişi', staff: 'Personel girişi', meeting: 'Toplantı girişi',
		mernis: 'TC ile giriş (MERNIS)', voucher: 'Kod ile giriş', email: 'E-posta ile giriş', whatsapp: 'WhatsApp ile giriş'
	};
	function buildOrder(raw: string) {
		const o = (raw ?? '').split(',').map((s) => s.trim()).filter((k) => orderable.includes(k));
		return [...o, ...orderable.filter((k) => !o.includes(k))];
	}
	function moveOpt(i: number, dir: number) {
		const j = i + dir;
		if (j < 0 || j >= draft.order.length) return;
		const arr = [...draft.order];
		[arr[i], arr[j]] = [arr[j], arr[i]];
		draft.order = arr;
	}

	function initDraft(p: any) {
		return {
			brand_name: p?.brand_name ?? '',
			welcome_title: p?.welcome_title ?? 'Hoş geldiniz',
			welcome_text: p?.welcome_text ?? 'İnternete bağlanmak için bir seçenek seçin',
			primary_color: p?.primary_color ?? '#C7F24E',
			opt_guest: p?.opt_guest ?? true,
			opt_staff: p?.opt_staff ?? false,
			opt_meeting: p?.opt_meeting ?? false,
			opt_temp: p?.opt_temp ?? true,
			opt_mernis: p?.opt_mernis ?? false,
			opt_voucher: p?.opt_voucher ?? false,
			opt_email: p?.opt_email ?? false,
			opt_whatsapp: p?.opt_whatsapp ?? false,
			theme: p?.theme ?? 'editorial',
			logo: p?.logo ?? '',
			welcome_title_en: p?.welcome_title_en ?? '',
			welcome_text_en: p?.welcome_text_en ?? '',
			kvkk_text: p?.kvkk_text ?? '',
			redirect_url: p?.redirect_url ?? '',
			order: buildOrder(p?.opt_order ?? ''),
			temp_label: p?.temp_label ?? '',
			temp_minutes: p?.temp_minutes ?? 120,
			temp_once: p?.temp_once ?? false,
			temp_rate_down_mbps: p?.temp_rate_down_kbps ? Math.round((p.temp_rate_down_kbps / 1024) * 10) / 10 : '',
			temp_rate_up_mbps: p?.temp_rate_up_kbps ? Math.round((p.temp_rate_up_kbps / 1024) * 10) / 10 : ''
		};
	}
	let draft = $state(initDraft(data.portal));
	let logoErr = $state('');
	$effect(() => { data.sel; draft = initDraft(data.portal); });

	function onLogo(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 250 * 1024) { logoErr = 'Logo 250KB altında olmalı'; return; }
		logoErr = '';
		const reader = new FileReader();
		reader.onload = () => (draft.logo = String(reader.result));
		reader.readAsDataURL(file);
	}

	const previewOpts = $derived(
		[draft.opt_guest && 'Misafir girişi', draft.opt_staff && 'Personel girişi',
		 draft.opt_meeting && 'Toplantı girişi', draft.opt_temp && '2 saatlik erişim',
		 draft.opt_mernis && 'TC ile giriş', draft.opt_voucher && 'Kod ile giriş',
		 draft.opt_email && 'E-posta ile giriş',
		 draft.opt_whatsapp && 'WhatsApp ile giriş'].filter(Boolean) as string[]
	);
	const themes = [
		{ v: 'editorial', l: 'Editöryel' }, { v: 'dark', l: 'Koyu' },
		{ v: 'soft', l: 'Yumuşak' }, { v: 'minimal', l: 'Minimal' }
	];
</script>

<svelte:head><title>Karşılama Ekranı · goX</title></svelte:head>

<section class="head">
	<div><p class="eyebrow">Captive portal</p><h1>Karşılama Ekranı</h1>
		<p class="sub">Logo, tema, renk, metin ve misafir doğrulama yöntemini markanıza göre ayarlayın.</p></div>
	{#if data.sel > 0}
		<span class="loctag"><span class="eyebrow">Lokasyon</span><strong>{data.selName}</strong></span>
	{/if}
</section>

{#if data.sel === 0}
	<p class="info">Karşılama ekranı <strong>lokasyona özeldir</strong>. Soldaki menüden bir lokasyon seçin — "Tüm lokasyonlar" seçiliyken düzenlenemez.</p>
{:else}
	{#if form?.error}<p class="err">{form.error}</p>{/if}
	{#if form?.ok}<p class="ok">Kaydedildi.</p>{/if}

	<div class="cols">
		<form class="card edit" method="POST" action="?/save" use:enhance>
			<input type="hidden" name="site_id" value={data.sel} />
			<input type="hidden" name="logo" value={draft.logo} />

			<div class="tabs">
				<button class="tabbtn" class:on={tab === 'genel'} type="button" onclick={() => (tab = 'genel')}>Karşılama Ekranı</button>
				<button class="tabbtn" class:on={tab === 'gecici'} type="button" onclick={() => (tab = 'gecici')}>Geçici Erişim</button>
			</div>

			<div class:tabhide={tab !== 'genel'}>
			<p class="eyebrow sec">Marka</p>
			<div class="logorow">
				<div class="logobox">
					{#if draft.logo}<img src={draft.logo} alt="logo" />{:else}<span>logo yok</span>{/if}
				</div>
				<div>
					<input type="file" accept="image/*" onchange={onLogo} />
					{#if draft.logo}<button type="button" class="rm" onclick={() => (draft.logo = '')}>Logoyu kaldır</button>{/if}
					{#if logoErr}<p class="err sm">{logoErr}</p>{/if}
				</div>
			</div>
			<label class="field"><span>Marka adı (logo yoksa)</span><input class="input" name="brand_name" bind:value={draft.brand_name} /></label>

			<p class="eyebrow sec">Görünüm</p>
			<label class="field"><span>Tema</span>
				<select class="input" name="theme" bind:value={draft.theme}>{#each themes as t}<option value={t.v}>{t.l}</option>{/each}</select></label>
			<label class="field"><span>Vurgu rengi</span>
				<span class="colorRow"><input type="color" name="primary_color" bind:value={draft.primary_color} /><code>{draft.primary_color}</code></span></label>

			<p class="eyebrow sec">Metin</p>
			<label class="field"><span>Başlık</span><input class="input" name="welcome_title" bind:value={draft.welcome_title} /></label>
			<label class="field"><span>Alt metin</span><input class="input" name="welcome_text" bind:value={draft.welcome_text} /></label>

			<p class="eyebrow sec">İngilizce (opsiyonel — doldurulursa portalda TR/EN seçimi çıkar)</p>
			<label class="field"><span>Başlık (EN)</span><input class="input" name="welcome_title_en" bind:value={draft.welcome_title_en} placeholder="Welcome" /></label>
			<label class="field"><span>Alt metin (EN)</span><input class="input" name="welcome_text_en" bind:value={draft.welcome_text_en} placeholder="Choose an option to connect" /></label>

			<p class="eyebrow sec">KVKK & yönlendirme</p>
			<label class="field"><span>KVKK onay metni (boşsa onay kutusu çıkmaz)</span><textarea class="input" name="kvkk_text" rows="2" bind:value={draft.kvkk_text} placeholder="Kişisel verilerimin… işlenmesini kabul ediyorum."></textarea></label>
			<label class="field"><span>Giriş sonrası yönlendirme (boşsa misafirin gitmek istediği adres)</span><input class="input" name="redirect_url" bind:value={draft.redirect_url} placeholder="https://siteniz.com" /></label>

			<p class="eyebrow sec">Giriş seçenekleri <span class="hint inline">— işaretleyin ve ↑/↓ ile sıralayın</span></p>
			<input type="hidden" name="opt_order" value={draft.order.join(',')} />
			<div class="optlist">
				{#each draft.order as k, i (k)}
					<div class="optrow">
						<label class="optchk"><input type="checkbox" name={`opt_${k}`} bind:checked={draft[`opt_${k}`]} /> {optLabel[k]}</label>
						<div class="ord">
							<button class="ordbtn" type="button" disabled={i === 0} onclick={() => moveOpt(i, -1)} title="Yukarı">↑</button>
							<button class="ordbtn" type="button" disabled={i === draft.order.length - 1} onclick={() => moveOpt(i, 1)} title="Aşağı">↓</button>
						</div>
					</div>
				{/each}
			</div>
			<p class="hint">Sıralama portalda aynen uygulanır. İlk sıraya doğrulamalı (Personel / TC / Kod) girişleri koymanız önerilir. Geçici erişim ayrı sekmede yönetilir; portalda en altta silik bir yazı-link olarak çıkar.</p>
			</div>

			<div class:tabhide={tab !== 'gecici'}>
				<p class="eyebrow sec">Geçici (hızlı) erişim</p>
				<p class="hint">Doğrulama yapmadan kısa süreli erişim. İhmale dönüşmemesi için süreyi kısa tutun ve tek-kullanımı açın. Portalda en altta, silik bir yazı-link olarak çıkar.</p>
				<label class="tempopt"><input type="checkbox" name="opt_temp" bind:checked={draft.opt_temp} /> Geçici erişimi etkinleştir</label>
				<label class="field"><span>Link metni</span><input class="input" name="temp_label" bind:value={draft.temp_label} placeholder="ör. Sadece hızlı geçiş" /><small>Boş bırakılırsa "Hızlı geçiş" yazar.</small></label>
				<label class="field"><span>Süre (dakika)</span><input class="input" name="temp_minutes" type="number" min="5" max="1440" bind:value={draft.temp_minutes} /><small>{Math.floor((draft.temp_minutes || 0) / 60)} saat {(draft.temp_minutes || 0) % 60} dk</small></label>
				<label class="field"><span>İndirme (Mbps · boş = sınırsız)</span><input class="input" name="temp_rate_down_mbps" type="number" min="0" step="0.5" bind:value={draft.temp_rate_down_mbps} /></label>
				<label class="field"><span>Yükleme (Mbps · boş = sınırsız)</span><input class="input" name="temp_rate_up_mbps" type="number" min="0" step="0.5" bind:value={draft.temp_rate_up_mbps} /></label>
				<label class="tempopt"><input type="checkbox" name="temp_once" bind:checked={draft.temp_once} /> Cihaz başına tek kullanım <span class="hint inline">— kullanan cihaz bu linki bir daha göremez</span></label>
			</div>

			<div class="row">
				<button class="btn btn--accent" type="submit">Kaydet</button>
				<a class="btn btn--ghost" href={`/portal?site=${data.sel}&preview=1`} target="_blank" rel="noreferrer">Gerçek önizleme ↗</a>
			</div>
		</form>

		<div class="previewWrap">
			<p class="eyebrow">Canlı önizleme</p>
			<div class="phone" data-theme={draft.theme} style="--pp:{draft.primary_color}">
				<div class="pcard">
					{#if draft.logo}<img class="plogo" src={draft.logo} alt="logo" />{:else}<span class="pbrand">{draft.brand_name || 'Marka'}</span>{/if}
					<h2>{draft.welcome_title}</h2>
					<p class="ptext">{draft.welcome_text}</p>
					<div class="popts">{#each previewOpts as o}<span class="popt">{o}</span>{/each}{#if previewOpts.length === 0}<span class="pempty">Seçenek yok</span>{/if}</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; flex-wrap: wrap; }
	.head h1 { font-size: 2rem; margin: 0.5rem 0 0.3rem; }
	.sub { color: var(--ink-soft); margin: 0; max-width: 50ch; }
	.siteSel { display: flex; flex-direction: column; gap: 0.3rem; min-width: 200px; }
	.loctag { display: flex; flex-direction: column; gap: 0.2rem; align-items: flex-end; }
	.loctag strong { font-family: var(--font-display); font-size: 1.1rem; }
	.info { background: var(--paper-2); border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.8rem 1rem; }
	.info a { text-decoration: underline; }
	.err { background: color-mix(in srgb, var(--danger) 14%, var(--card)); border: 1.4px solid var(--danger); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.err.sm { padding: 0.3rem 0; border: none; background: none; margin: 0.3rem 0 0; }
	.ok { background: color-mix(in srgb, var(--ok) 14%, var(--card)); border: 1.4px solid var(--ok); color: var(--ok); padding: 0.6rem 0.9rem; border-radius: var(--radius); margin-bottom: 1rem; }
	.cols { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: var(--gap); align-items: start; }
	.edit { padding: 1.5rem; }
	.sec { margin: 1.3rem 0 0.6rem; } .sec:first-of-type { margin-top: 0; }
	.logorow { display: flex; gap: 1rem; align-items: center; margin-bottom: 0.8rem; }
	.logobox { width: 90px; height: 64px; border: 1.5px dashed var(--line); border-radius: var(--radius); display: grid; place-items: center; overflow: hidden; flex: 0 0 auto; }
	.logobox img { max-width: 100%; max-height: 100%; object-fit: contain; }
	.logobox span { font-size: 0.7rem; color: var(--ink-soft); }
	.rm { background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.82rem; text-decoration: underline; padding: 0.3rem 0 0; }
	.colorRow { display: flex; align-items: center; gap: 0.7rem; }
	.colorRow input[type=color] { width: 48px; height: 38px; border: 1.5px solid var(--line); border-radius: var(--radius); background: none; cursor: pointer; }
	.colorRow code { font-family: var(--font-mono); }
	.hint { font-size: 0.82rem; color: var(--ink-soft); background: var(--paper-2); padding: 0.5rem 0.7rem; border-radius: var(--radius); margin: 0.2rem 0 0; }
	.checks { display: grid; gap: 0.5rem; } .checks label { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
	.hint.inline { display: inline; background: none; padding: 0; font-weight: 400; }
	.optlist { display: flex; flex-direction: column; gap: 0.4rem; }
	.optrow { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.45rem 0.7rem; background: var(--paper-2); }
	.optchk { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
	.ord { display: flex; gap: 0.25rem; }
	.ordbtn { width: 28px; height: 26px; border: 1.3px solid var(--line); background: var(--card); border-radius: 5px; cursor: pointer; color: var(--ink); }
	.ordbtn:disabled { opacity: 0.3; cursor: default; }
	.ordbtn:not(:disabled):hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.tempopt { display: flex; align-items: center; gap: 0.5rem; margin: 0.7rem 0 0.3rem; font-weight: 500; }
	.tabs { display: flex; gap: 0.4rem; margin-bottom: 1rem; border-bottom: 1.5px solid var(--line); }
	.tabbtn { background: none; border: none; border-bottom: 2.5px solid transparent; padding: 0.5rem 0.8rem; cursor: pointer; color: var(--ink-soft); font-weight: 600; font-size: 0.92rem; margin-bottom: -1.5px; }
	.tabbtn.on { color: var(--ink); border-bottom-color: var(--acid); }
	.tabhide { display: none; }
	.row { display: flex; gap: 0.8rem; margin-top: 1.4rem; flex-wrap: wrap; }

	.previewWrap { position: sticky; top: 80px; }
	.phone { margin-top: 0.6rem; border-radius: 18px; padding: 1.6rem 1.2rem; min-height: 360px; display: grid; place-items: center; }
	.pcard { width: 100%; max-width: 260px; padding: 1.5rem 1.1rem 1rem; text-align: center; }
	.plogo { max-height: 48px; max-width: 70%; margin: 0 auto 0.8rem; display: block; object-fit: contain; }
	.pbrand { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.3rem 0.6rem; border-radius: 99px; margin-bottom: 0.9rem; }
	.pcard h2 { font-family: var(--font-display); font-size: 1.3rem; margin: 0 0 0.2rem; }
	.pverify { font-size: 0.72rem; font-family: var(--font-mono); margin: 0 0 0.3rem; opacity: 0.7; }
	.ptext { font-size: 0.8rem; margin: 0 0 0.9rem; opacity: 0.8; }
	.popts { display: flex; flex-direction: column; gap: 0.45rem; }
	.popt { padding: 0.55rem; font-family: var(--font-display); font-weight: 600; font-size: 0.85rem; }
	.pempty { font-size: 0.8rem; opacity: 0.6; }

	/* preview temaları */
	[data-theme="editorial"] { background: radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--pp) 28%, transparent), transparent 60%), var(--paper-2); }
	[data-theme="editorial"] .pcard { background: var(--card); border: 1.5px solid var(--ink); border-radius: 6px; box-shadow: 4px 4px 0 0 var(--ink); }
	[data-theme="editorial"] .pbrand { background: var(--pp); color: var(--ink); border: 1.3px solid var(--ink); }
	[data-theme="editorial"] .popt { border: 1.4px solid var(--ink); border-radius: 5px; } [data-theme="editorial"] .popt:first-child { background: var(--pp); }

	[data-theme="dark"] { background: #0c0c11; }
	[data-theme="dark"] .pcard { background: #16161d; border: 1px solid #2a2a35; border-radius: 14px; color: #f3f3f7; }
	[data-theme="dark"] .pbrand { background: var(--pp); color: #0c0c11; }
	[data-theme="dark"] .popt { border: 1px solid #2a2a35; border-radius: 10px; } [data-theme="dark"] .popt:first-child { background: var(--pp); color: #0c0c11; }

	[data-theme="soft"] { background: linear-gradient(160deg, color-mix(in srgb, var(--pp) 18%, #fff), #fbfaf7); }
	[data-theme="soft"] .pcard { background: #fff; border-radius: 22px; box-shadow: 0 14px 40px rgba(0,0,0,0.1); color: #222; }
	[data-theme="soft"] .pbrand { background: color-mix(in srgb, var(--pp) 25%, #fff); color: #333; }
	[data-theme="soft"] .popt { background: #f6f5f2; border-radius: 12px; } [data-theme="soft"] .popt:first-child { background: color-mix(in srgb, var(--pp) 30%, #fff); }

	[data-theme="minimal"] { background: #fff; border: 1px solid var(--line); border-radius: 18px; }
	[data-theme="minimal"] .pcard { background: #fff; color: #111; }
	[data-theme="minimal"] .pbrand { background: none; letter-spacing: 0.3em; color: #111; }
	[data-theme="minimal"] .popt { border: 1px solid #ddd; border-radius: 2px; }

	@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } .previewWrap { position: static; } }
</style>
