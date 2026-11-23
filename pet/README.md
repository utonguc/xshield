# xShield Pet

Petshoplar için çok kiracılı (multi-tenant) online mağaza + stok takibi. Her petshop kayıt olur ve
`pet.xshield.com.tr/<magaza-adresi>` adresinde mağazası anında yayına girer.

## Neler var

| Alan | Özellikler |
| --- | --- |
| **Vitrin** (`/<magaza>`) | Hayvan türü ve kategori filtreleri, arama, ürün sayfası, seçenekler (1 kg / 3 kg / 15 kg, beden), kiloyla satış (açık mama), sepet, adrese teslim / gel-al, bölgeye göre teslimat ücreti, kapıda nakit/kart veya havale, sipariş takip sayfası, mağazanın kendi yasal metinleri |
| **Panel** (`/panel`) | Özet (günlük satış, açık siparişler, azalan stok, SKT yaklaşanlar), sipariş yönetimi (yeni sipariş sesli bildirimi, durum akışı, kurye atama, WhatsApp/telefon kısayolları, yazdırma) |
| **Kasa** (`/panel/kasa`) | Barkod okuyucu (USB/Bluetooth) veya telefon kamerası ile satış, fiyat düzeltme, indirim, para üstü; satış stoktan anında düşer |
| **Stok** (`/panel/stok`) | Mal kabul (alış fiyatı, lot, SKT), sayım (okuttukça sayar, farkı işler), fire, hareket defteri, stok değeri |
| **Ürünler** | Barkodla hızlı ekleme; **ortak barkod kataloğu** sayesinde başka bir mağazanın eklediği ürünün adı/markası otomatik dolar (fiyat ve stok paylaşılmaz). Telefondan çekilen görsel tarayıcıda küçültülür |
| **Teslimat / Ekip** | Mahalle bazlı bölgeler (ücret, minimum tutar, şu tutar üstü ücretsiz), personel ve kurye hesapları |
| **Kurye** (`/kurye`) | Kuryenin telefonunda kendisine atanan teslimatlar, yol tarifi, arama, tahsil edilecek tutar, "yola çıktım / teslim ettim" |
| **Kendi alan adı** (`/panel/ayarlar/alan-adi`) | Mağaza `www.kendialanadi.com` adresini bağlar; DNS'e bir TXT (sahiplik) ve bir CNAME kaydı ekler, “Kontrol et” ile doğrular. Vitrin o adresten, bağlantılar öneksiz (`/urun/...`) çalışır; panel ve giriş platform adresine yönlenir. Platform adresi de çalışmaya devam eder |
| **Platform yönetimi** (`/yonetim`) | `ADMIN_EMAILS` içindeki kullanıcılar tüm mağazaları, son 30 gün işlem/ciroyu görür, mağazayı askıya alır |

Mağaza sahibinin kendisinin yaptığı (platformun yapmadığı) işler: e-fatura/e-arşiv, sanal POS
(online kart ödemesi), KVKK / mesafeli satış metinlerinin içeriği. Canlı hayvan satışı yoktur.

## Mimari

- **Next.js 16** (App Router, Server Actions) — tek uygulama: vitrin + panel + kurye.
- **PostgreSQL 16** + **Drizzle ORM**. Tüm mağaza tablolarında `tenant_id` var; her sorgu oturumdaki
  mağazaya göre filtrelenir ve her server action yetkiyi kendisi kontrol eder (`requireMember`).
- **Stok defteri**: her değişiklik `stock_movements` tablosuna yazılır, `variants.stock_qty` bunun
  önbelleğidir. Tüm değişiklikler `src/lib/stock.ts` → `applyStockChange` üzerinden, transaction içinde
  ve atomik `UPDATE … WHERE stock_qty + delta >= 0` ile yapılır; aynı anda gelen iki online sipariş
  stoğu eksiye düşüremez. Mağaza satışında (kasa) stok eksiye düşebilir — raftaki ürün esastır.
- **SKT partileri** (`stock_batches`): mal kabulde SKT girilirse parti açılır, çıkışlar en yakın
  SKT'den düşülür (FEFO).
- **Siparişler** (`src/lib/orders.ts`): online sipariş ve kasa satışı aynı akıştan geçer. Fiyatlar her
  zaman veritabanından okunur; iptalde defterdeki gerçek çıkışlar geri alınır.
- **Oturum**: scrypt ile şifre, veritabanında SHA-256 özeti tutulan rastgele token, httpOnly çerez.
- **Görseller**: `UPLOAD_DIR` (Docker volume), içerik imzası doğrulanır, `/dosya/...` üzerinden
  kalıcı cache ile servis edilir.

## Kendi alan adı nasıl çalışır

1. Mağaza sahibi panelden alan adını ekler → DNS'e `TXT _xshield-pet.<alan-adi>` ve `CNAME <alan-adi> → pet.xshield.com.tr`
   (`CUSTOM_DOMAIN_TARGET`) kayıtlarını girer → “Kontrol et”. TXT kaydı eşleşirse alan adı `verified` olur.
2. `src/proxy.ts` gelen isteğin `Host`'una bakar; platform adresi değilse alan adını mağazaya eşler ve
   `/urun/1` isteğini içeride `/<slug>/urun/1` olarak işler (60 sn önbellek). Eski `/<slug>/...` bağlantıları
   temiz adrese, `/panel` ve `/giris` platform adresine yönlendirilir.
3. **nginx**: bilinmeyen alan adları varsayılan olarak eClinic'e düştüğü için doğrulanan alan adları
   `xshield-infra/sync-pet-domains.sh` ile (cron, 2 dk) `/api/domains/nginx` uç noktasından okunup pet server
   bloğuna eklenir.
4. **SSL**: Cloudflare for SaaS. `CF_API_TOKEN` + `CF_ZONE_ID` tanımlıysa doğrulanan alan adı Cloudflare'e
   “custom hostname” olarak otomatik eklenir ve sertifika otomatik üretilir; tanımlı değilse platform yöneticisi
   `/yonetim`'de görünen alan adını Cloudflare panelinden elle ekler.

Not: Kök alan adına (`alanadi.com`) çoğu DNS sağlayıcısında CNAME eklenemez; `www` adresini bağlayıp kök
adresi sağlayıcının yönlendirme özelliğiyle `www`'ye yönlendirmek önerilir.

## Geliştirme

```bash
cp .env.example .env          # DATABASE_URL vb.
npm install
npm run db:migrate            # şemayı oluşturur
npm run db:seed               # isteğe bağlı demo mağaza: /patiler-demo
npm run dev
```

Demo girişleri (seed sonrası): `demo@pet.xshield.com.tr` / `demo1234`, kurye
`kurye@pet.xshield.com.tr` / `demo1234`.

Şema değişikliği: `src/db/schema.ts` düzenlenir → `npm run db:generate` → oluşan SQL `drizzle/`
klasörüyle birlikte commitlenir. Üretimde migration'lar konteyner açılırken otomatik uygulanır.

## Yayına alma

`xshield-infra` reposunda `pet_db` + `pet_app` servisleri ve `pet.xshield.com.tr` nginx bloğu tanımlı.
VPS'te (`~/xshield/infra`):

```bash
# .env'e PET_DB_PASS ve PET_ADMIN_EMAILS ekleyin
cd ~/xshield/web && git pull
cd ~/xshield/infra && git pull
docker compose --env-file .env up -d --build pet_db pet_app
docker compose --env-file .env up -d --force-recreate nginx
```

Cloudflare'de `pet` için proxied bir A kaydı ekleyin (`*.xshield.com.tr` kapsamında olduğu için
mevcut sertifika yeterli).

## Yol haritası

- **Trendyol Go / Getir entegrasyonu**: mağazanın kendi hesabını yetkilendirip fiyat/stok gönderme ve
  oradaki siparişleri panelde görme. Veri modeli kanal bazlı fiyata uygun; API dokümanları ve test
  hesapları gerekli.
- Mama bitiş hatırlatması (SMS/WhatsApp), müşteri hesapları, raporlar (kâr, en çok satan, ölü stok).
- Sanal POS'unu bağlamak isteyen mağazalar için kendi iyzico/PayTR anahtarlarıyla online ödeme.
