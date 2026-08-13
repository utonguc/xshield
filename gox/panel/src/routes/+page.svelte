<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const fmtTl = (n: number) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round(n ?? 0));
	const sectorLabel: Record<string, string> = { all: 'Tüm işletmeler', hotel: 'Otel', cafe: 'Cafe & Restoran', restaurant: 'Restoran', office: 'Ofis' };
	// Aktif planlar (canlı, owner panelinden yönetilir)
	const plans = (data.plans ?? []) as any[];

	const features = [
		{
			no: '01',
			title: 'Markanıza özel karşılama ekranı',
			body: 'Ziyaretçileriniz Wi-Fi’a bağlanırken sıradan bir giriş kutusu değil; logonuzu, renklerinizi ve mesajınızı taşıyan bir ekran görür.'
		},
		{
			no: '02',
			title: 'Esnek giriş seçenekleri',
			body: 'Misafir, personel, toplantı, 2 saatlik geçici erişim, TC ile veya erişim kodu ile giriş. Hangilerini açacağınıza siz karar verin.'
		},
		{
			no: '03',
			title: 'Erişim kodları üretin',
			body: 'Süresi, kullanıcı adedi ve hızı belirli kodlar oluşturun; etkinlik, oda ya da günübirlik geçişler için dağıtın. Kod biterse erişim kapanır.'
		},
		{
			no: '04',
			title: 'Personel girişi',
			body: 'Çalışanlarınıza kişisel kullanıcı adı ve şifre tanımlayın. Kimin, ne zaman bağlandığını net görün — misafir trafiğinden ayrı tutun.'
		},
		{
			no: '05',
			title: 'Hız ve süre profilleri',
			body: 'Her erişim tipine farklı hız ve süre verin. Bir misafirin hızını değiştirirken bağlantısı kopmaz — değişiklik anında, sessizce uygulanır.'
		},
		{
			no: '06',
			title: 'Ziyaretçi anketleri',
			body: 'İsterseniz internete geçmeden önce kısa bir anket gösterin. Memnuniyet ve geri bildirimi, bağlantıyı kesmeden tek yerden toplayın.'
		}
	];

	const manage = [
		{ t: 'Tüm lokasyonlar tek panelde', d: 'Bir kafe, bir otel ya da onlarca şube — hepsini tek ekrandan yönetin. Her lokasyonun misafiri, ekranı ve kuralları kendine ait; raporları tek çatıdan görün.' },
		{ t: 'Canlı izleme ve uyarılar', d: 'Cihazlarınızın durumunu, bağlı misafir sayısını ve kullanımı canlı izleyin. Bir şube çevrimdışı olursa ya da bir sorun çıkarsa anında haber alın.' },
		{ t: 'Dakikalar içinde kurulum', d: 'Cihazı kutusundan çıkarın, tek bir kodla sisteme bağlayın. Ayarları, ağ kurulumunu ve güncellemeleri uzaktan panelden yapın — yerinde teknik müdahale gerekmez.' }
	];

	const steps = [
		{ n: '1', t: 'Cihazınızı bağlayın', d: 'Tek bir kodla cihaz sisteme katılır; gerisini uzaktan panelden yönetirsiniz.' },
		{ n: '2', t: 'Karşılama ekranını tasarlayın', d: 'Logo, görsel ve giriş seçeneklerini kendi markanıza göre düzenleyin.' },
		{ n: '3', t: 'Misafirlerinizi ağırlayın', d: 'Ziyaretçiler tek dokunuşla bağlanır, siz arka planda her şeyi görürsünüz.' }
	];
</script>

<svelte:head>
	<title>goX — Misafir Wi-Fi karşılama ve yönetim platformu</title>
	<meta name="description" content="Misafirlerinize markanızı yaşatan bir Wi-Fi karşılama deneyimi; erişim kodları, personel girişi, çok lokasyonlu yönetim ve 5651 uyumlu zaman damgalı kayıt — tek panelde." />
</svelte:head>

<header class="nav">
	<div class="container nav-in">
		<a href="/" class="brand"><Logo size={30} /></a>
		<nav class="links">
			<a href="#ozellikler">Özellikler</a>
			<a href="#yonetim">Yönetim</a>
			<a href="#uyumluluk">Uyumluluk</a>
			{#if plans.length}<a href="#fiyatlar">Fiyatlar</a>{/if}
			<a href="#nasil">Nasıl çalışır</a>
			<a class="btn btn--sm" href="/giris">Panele giriş</a>
		</nav>
	</div>
</header>

<main>
	<!-- HERO -->
	<section class="hero container">
		<div class="hero-copy">
			<p class="eyebrow">Misafir Wi-Fi · Karşılama & yönetim</p>
			<h1>Wi-Fi’ınız<br />misafirinizi<br /><span class="hl">karşılasın.</span></h1>
			<p class="lede">
				Ziyaretçileriniz internete bağlanırken markanızı görsün. Karşılama ekranından erişim
				kodlarına, anketlerden tüm şubelere ve yasal kayıtlara — hepsi tek panelde.
			</p>
			<div class="cta-row">
				<a class="btn btn--accent" href="/giris">Hemen başlayın →</a>
				<a class="btn btn--ghost" href="#nasil">Nasıl çalışır?</a>
			</div>
			<ul class="trust">
				<li>Çok lokasyonlu</li>
				<li>5651 uyumlu kayıt</li>
				<li>Dakikalar içinde kurulum</li>
			</ul>
		</div>

		<!-- karşılama ekranı maketi -->
		<div class="mock card card--raised" aria-hidden="true">
			<div class="mock-top">
				<span class="tag tag--live">● Bağlı</span>
				<span class="eyebrow">misafir girişi</span>
			</div>
			<div class="mock-brand"><Logo size={40} /></div>
			<p class="mock-welcome">Hoş geldiniz</p>
			<p class="mock-sub">Devam etmek için bir seçenek seçin</p>
			<div class="mock-opts">
				<span class="mock-opt mock-opt--on">Misafir girişi</span>
				<span class="mock-opt">Kod ile giriş</span>
				<span class="mock-opt">Personel</span>
				<span class="mock-opt">2 saatlik erişim</span>
			</div>
			<div class="mock-btn">İnternete bağlan</div>
		</div>
	</section>

	<!-- ÖZELLİKLER -->
	<section id="ozellikler" class="block container">
		<div class="block-head">
			<p class="eyebrow">Ne sunuyoruz</p>
			<h2>Bir Wi-Fi ağından<br />çok daha fazlası.</h2>
		</div>
		<div class="grid">
			{#each features as f}
				<article class="feat card">
					<span class="feat-no">{f.no}</span>
					<h3>{f.title}</h3>
					<p>{f.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<!-- YÖNETİM & ÖLÇEK -->
	<section id="yonetim" class="block container">
		<div class="block-head">
			<p class="eyebrow">Yönetim & ölçek</p>
			<h2>Bir mekândan<br />yüzlerce şubeye.</h2>
		</div>
		<div class="mlist">
			{#each manage as m}
				<div class="mrow">
					<h3>{m.t}</h3>
					<p>{m.d}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- UYUMLULUK & GÜVENLİK -->
	<section id="uyumluluk" class="container">
		<div class="comp card card--raised">
			<div class="comp-copy">
				<p class="eyebrow" style="color:var(--acid)">Yasal uyumluluk & güvenlik</p>
				<h2>5651’e uygun,<br />zaman damgalı kayıt.</h2>
				<p class="comp-lede">
					Misafir erişim kayıtları otomatik tutulur, değiştirilemez biçimde saklanır ve
					zaman damgasıyla mühürlenir. Yasal yükümlülüğünüz arka planda, siz uğraşmadan güvende.
				</p>
				<ul class="checks">
					<li>Otomatik erişim kayıtları — kim, ne zaman, hangi lokasyondan</li>
					<li>Değiştirilemez (kurcalanma kanıtlı) kayıt zinciri</li>
					<li>Zaman damgası entegrasyonu — denetime hazır dışa aktarım</li>
					<li>Her lokasyonun trafiği yalıtık — bir nokta diğerini etkilemez</li>
				</ul>
			</div>
			<div class="comp-badge" aria-hidden="true">
				<span class="badge-5651">5651</span>
				<span class="badge-sub">zaman damgalı<br />erişim kaydı</span>
			</div>
		</div>
	</section>

	<!-- FİYATLAR -->
	{#if plans.length}
		<section id="fiyatlar" class="block container">
			<div class="block-head">
				<p class="eyebrow">Fiyatlandırma</p>
				<h2>İşletmenize göre<br />ölçeklenen planlar.</h2>
				<p class="price-note">Otel planlarında ücret oda sayısına göre belirlenir. Tüm planlar 5651 uyumlu kayıt ve markalı karşılama ekranı içerir.</p>
			</div>
			<div class="prices">
				{#each plans as p}
					<article class="price card" class:feat-plan={p.sector === 'hotel' && p.billing_model === 'per_room'}>
						<span class="ptag">{sectorLabel[p.sector] ?? p.sector}</span>
						<h3>{p.name}</h3>
						<div class="amount">
							{#if p.billing_model === 'flat'}
								<strong>{fmtTl(p.base_fee)}</strong><span>/ay</span>
							{:else}
								<small>başlangıç</small><strong>{fmtTl(p.base_fee)}</strong><span>/ay</span>
							{/if}
						</div>
						{#if p.billing_model !== 'flat'}
							<p class="pdesc">{p.included_units} {p.billing_model === 'per_room' ? 'oda' : 'cihaz'} dahil, sonra {fmtTl(p.per_unit_fee)}/{p.billing_model === 'per_room' ? 'oda' : 'cihaz'}</p>
						{:else}
							<p class="pdesc">{p.max_locations > 0 ? p.max_locations + ' lokasyona kadar' : 'Sınırsız lokasyon'}</p>
						{/if}
						{#if p.features?.length}
							<ul class="pfeats">{#each p.features as f}<li>{f}</li>{/each}</ul>
						{/if}
						<a class="btn btn--ghost btn--sm" href="/giris">İletişime geçin →</a>
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<!-- NASIL ÇALIŞIR -->
	<section id="nasil" class="block container">
		<div class="block-head">
			<p class="eyebrow">Üç adım</p>
			<h2>Kurması dakikalar,<br />etkisi kalıcı.</h2>
		</div>
		<div class="steps">
			{#each steps as s}
				<div class="step">
					<span class="step-n">{s.n}</span>
					<h3>{s.t}</h3>
					<p>{s.d}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- CTA -->
	<section class="container">
		<div class="cta-band card card--raised">
			<div>
				<p class="eyebrow" style="color:var(--paper)">Hazır mısınız?</p>
				<h2 style="color:var(--paper)">Misafirlerinizi<br />ağırlamaya başlayın.</h2>
			</div>
			<a class="btn btn--accent" href="/giris">Panele giriş →</a>
		</div>
	</section>
</main>

<footer class="foot">
	<div class="container foot-in">
		<Logo size={24} />
		<nav class="foot-links">
			<a href="/gizlilik">Gizlilik</a>
			<a href="/kosullar">Koşullar</a>
			<a href="/veri-silme">Veri Silme</a>
		</nav>
		<span class="eyebrow">© {new Date().getFullYear()} goX · bir xShield ürünü</span>
	</div>
</footer>

<style>
	.nav { border-bottom: 1.5px solid var(--line); position: sticky; top: 0; background: color-mix(in srgb, var(--paper) 88%, transparent); backdrop-filter: blur(6px); z-index: 10; }
	.nav-in { display: flex; align-items: center; justify-content: space-between; height: 68px; }
	.links { display: flex; align-items: center; gap: 1.6rem; }
	.links a { text-decoration: none; font-weight: 500; }
	.links a:not(.btn):hover { text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--acid); text-decoration-thickness: 3px; }

	.hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3rem; align-items: center; padding: 4.5rem 1.5rem 5rem; }
	.hero h1 { font-size: clamp(2.6rem, 6vw, 4.6rem); margin: 1rem 0 1.4rem; }
	.hl { position: relative; }
	.hl::after { content:''; position:absolute; left:-2px; right:-2px; bottom:0.1em; height:0.28em; background:var(--acid); z-index:-1; }
	.cta-row { display: flex; gap: 0.9rem; margin-top: 2rem; flex-wrap: wrap; }
	.trust { list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem 1.4rem; padding: 0; margin: 1.8rem 0 0; }
	.trust li { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.04em; color: var(--ink-soft); position: relative; padding-left: 1.1rem; }
	.trust li::before { content: '✓'; position: absolute; left: 0; color: var(--acid-dim); font-weight: 700; }

	.mock { padding: 1.4rem; display: flex; flex-direction: column; gap: 0.5rem; }
	.mock-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
	.mock-brand { margin: 0.8rem auto 0.4rem; }
	.mock-welcome { font-family: var(--font-display); font-weight: 600; font-size: 1.5rem; text-align: center; margin: 0.3rem 0 0; }
	.mock-sub { text-align: center; color: var(--ink-soft); margin: 0 0 0.6rem; font-size: 0.92rem; }
	.mock-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
	.mock-opt { border: 1.4px solid var(--line); border-radius: var(--radius); padding: 0.55rem; text-align: center; font-size: 0.85rem; font-weight: 500; }
	.mock-opt--on { background: var(--acid); }
	.mock-btn { margin-top: 0.7rem; background: var(--ink); color: var(--paper); text-align: center; padding: 0.7rem; border-radius: var(--radius); font-family: var(--font-display); font-weight: 600; }

	.block { padding: 4rem 1.5rem; }
	.block-head { margin-bottom: 2.4rem; }
	.block-head h2 { font-size: clamp(1.8rem, 4vw, 2.8rem); margin-top: 0.8rem; }

	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap); }
	.feat { padding: 1.6rem; }
	.feat-no { font-family: var(--font-mono); font-weight: 700; color: var(--acid-dim); font-size: 0.85rem; letter-spacing: 0.1em; }
	.feat h3 { font-size: 1.22rem; margin: 0.6rem 0 0.6rem; }
	.feat p { color: var(--ink-soft); line-height: 1.55; margin: 0; }

	.mlist { display: grid; gap: 0; }
	.mrow { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 1.5rem; padding: 1.6rem 0; border-top: 2px solid var(--line); }
	.mrow:last-child { border-bottom: 2px solid var(--line); }
	.mrow h3 { font-size: 1.4rem; margin: 0; }
	.mrow p { color: var(--ink-soft); line-height: 1.6; margin: 0; }

	.comp { background: var(--ink); color: var(--paper); display: grid; grid-template-columns: 1.4fr 0.6fr; gap: 2.5rem; align-items: center; padding: 2.8rem; margin: 1rem 0; }
	.comp-copy h2 { font-size: clamp(1.6rem, 3.5vw, 2.6rem); margin: 0.6rem 0 1rem; color: var(--paper); }
	.comp-lede { color: color-mix(in srgb, var(--paper) 78%, transparent); line-height: 1.6; margin: 0 0 1.4rem; max-width: 52ch; }
	.checks { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
	.checks li { position: relative; padding-left: 1.6rem; color: color-mix(in srgb, var(--paper) 90%, transparent); line-height: 1.45; }
	.checks li::before { content: '✓'; position: absolute; left: 0; color: var(--acid); font-weight: 700; }
	.comp-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid var(--acid); border-radius: 16px; padding: 1.8rem 1rem; }
	.badge-5651 { font-family: var(--font-display); font-weight: 700; font-size: 3.4rem; line-height: 1; color: var(--acid); }
	.badge-sub { font-family: var(--font-mono); font-size: 0.72rem; text-align: center; letter-spacing: 0.08em; color: color-mix(in srgb, var(--paper) 70%, transparent); margin-top: 0.5rem; }

	.price-note { color: var(--ink-soft); line-height: 1.55; margin: 0.9rem 0 0; max-width: 60ch; }
	.prices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--gap); align-items: start; }
	.price { padding: 1.6rem; display: flex; flex-direction: column; gap: 0.5rem; }
	.price.feat-plan { border-color: var(--ink); box-shadow: 6px 6px 0 0 var(--ink); }
	.ptag { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); }
	.price h3 { font-size: 1.35rem; margin: 0.2rem 0; }
	.amount { display: flex; align-items: baseline; gap: 0.3rem; flex-wrap: wrap; margin: 0.3rem 0; }
	.amount small { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); width: 100%; }
	.amount strong { font-family: var(--font-display); font-size: 2.3rem; line-height: 1; letter-spacing: -0.03em; }
	.amount span { color: var(--ink-soft); }
	.pdesc { font-size: 0.85rem; color: var(--ink-soft); margin: 0 0 0.4rem; }
	.pfeats { list-style: none; padding: 0; margin: 0.2rem 0 0.8rem; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
	.pfeats li { font-size: 0.85rem; padding-left: 1.2rem; position: relative; line-height: 1.4; }
	.pfeats li::before { content: '✓'; position: absolute; left: 0; color: var(--acid-dim); font-weight: 700; }

	.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap); }
	.step { border-top: 2.5px solid var(--line); padding-top: 1.1rem; }
	.step-n { font-family: var(--font-display); font-weight: 700; font-size: 2.4rem; line-height: 1; }
	.step h3 { font-size: 1.2rem; margin: 0.6rem 0 0.5rem; }
	.step p { color: var(--ink-soft); margin: 0; line-height: 1.5; }

	.cta-band { background: var(--ink); padding: 2.6rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; margin: 1rem 0 4rem; }
	.cta-band h2 { font-size: clamp(1.6rem, 3.5vw, 2.4rem); margin-top: 0.5rem; }

	.foot { border-top: 1.5px solid var(--line); }
	.foot-in { display: flex; align-items: center; justify-content: space-between; height: 80px; gap: 1rem; flex-wrap: wrap; }
	.foot-links { display: flex; gap: 1.2rem; }
	.foot-links a { text-decoration: none; font-size: 0.85rem; color: var(--ink-soft); }
	.foot-links a:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }

	@media (max-width: 860px) {
		.hero { grid-template-columns: 1fr; padding-top: 3rem; }
		.grid { grid-template-columns: 1fr 1fr; }
		.steps { grid-template-columns: 1fr; }
		.mrow { grid-template-columns: 1fr; gap: 0.5rem; }
		.comp { grid-template-columns: 1fr; gap: 1.6rem; padding: 1.8rem; }
		.links a:not(.btn) { display: none; }
	}
	@media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
</style>
