// Demo mağaza oluşturur: node scripts/seed.mjs
// Giriş: demo@pet.xshield.com.tr / demo1234  ·  Vitrin: /patiler-demo
// Tekrar çalıştırılırsa demo mağazayı silip baştan kurar. Gerçek mağazalara dokunmaz.
import { randomBytes, scryptSync } from "node:crypto";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL ?? "postgres://pet:pet@localhost:5432/petdb", { max: 1, onnotice: () => {} });
const SLUG = "patiler-demo";
const EMAIL = "demo@pet.xshield.com.tr";

const hash = (pw) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(pw, salt, 64).toString("base64url")}`;
};
const slugify = (s) =>
  s
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" })[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const CATS = ["Kedi Maması", "Köpek Maması", "Yaş Mama & Konserve", "Ödül & Atıştırmalık", "Kedi Kumu", "Oyuncak", "Tasma & Gezdirme", "Taşıma Çantası", "Bakım & Hijyen", "Parfüm & Şampuan"];

// [ad, marka, tür, kategori, [[seçenek, barkod, birim, fiyat, eskiFiyat, alış, stok, skt]]]
const PRODUCTS = [
  ["Yetişkin Kedi Maması Tavuklu", "Mırmır", "kedi", "Kedi Maması", [["1,5 kg", "8690000000017", "adet", 389.9, null, 290, 14, 200], ["3 kg", "8690000000024", "adet", 649.9, 699.9, 480, 9, 200], ["15 kg", "8690000000031", "adet", 2449.9, null, 1890, 3, 200]]],
  ["Kısırlaştırılmış Kedi Maması Somonlu", "Mırmır", "kedi", "Kedi Maması", [["2 kg", "8690000000048", "adet", 589.9, null, 430, 6, 25]]],
  ["Açık Kedi Maması (Tavuklu)", "Mırmır", "kedi", "Kedi Maması", [["Açık (kg)", null, "kg", 219.9, null, 150, 18.5, null]]],
  ["Yetişkin Köpek Maması Kuzulu", "Havhav", "kopek", "Köpek Maması", [["3 kg", "8690000000055", "adet", 529.9, null, 395, 8, 300], ["15 kg", "8690000000062", "adet", 1899.9, 2099.9, 1450, 2, 300]]],
  ["Yavru Köpek Maması Tavuklu", "Havhav", "kopek", "Köpek Maması", [["3 kg", "8690000000079", "adet", 579.9, null, 420, 5, 150]]],
  ["Kedi Konservesi Ton Balıklı 400 g", "Mırmır", "kedi", "Yaş Mama & Konserve", [["", "8690000000086", "adet", 64.9, null, 42, 48, 18]]],
  ["Kedi Ödül Çubukları Somonlu 3'lü", "PatiPlus", "kedi", "Ödül & Atıştırmalık", [["", "8690000000093", "adet", 49.9, null, 31, 30, 120]]],
  ["Topaklanan Bentonit Kedi Kumu", "KumKum", "kedi", "Kedi Kumu", [["5 L", "8690000000109", "adet", 129.9, null, 85, 20, null], ["10 L", "8690000000116", "adet", 229.0, null, 150, 3, null]]],
  ["Tüy Top Kedi Oyuncağı 3'lü", "PatiPlus", "kedi", "Oyuncak", [["", "8690000000123", "adet", 59.9, null, 25, 15, null]]],
  ["Ayarlanabilir Göğüs Tasması", "Gezgin", "kopek", "Tasma & Gezdirme", [["S", "8690000000130", "adet", 299.0, null, 160, 4, null], ["M", "8690000000147", "adet", 349.0, null, 185, 7, null], ["L", "8690000000154", "adet", 399.0, null, 210, 0, null]]],
  ["Havalandırmalı Kedi Taşıma Çantası", "Gezgin", "kedi", "Taşıma Çantası", [["", "8690000000161", "adet", 749.0, 899.0, 480, 5, null]]],
  ["Pati Temizleme Mendili 80'li", "PatiPlus", "genel", "Bakım & Hijyen", [["", "8690000000178", "adet", 89.9, null, 55, 22, null]]],
  ["Köpek Parfümü Pudra Kokulu 100 ml", "PatiPlus", "kopek", "Parfüm & Şampuan", [["", "8690000000185", "adet", 139.9, null, 80, 9, null]]],
  ["Kedi Şampuanı Hassas Ciltler 250 ml", "PatiPlus", "kedi", "Parfüm & Şampuan", [["", "8690000000192", "adet", 159.9, null, 95, 6, null]]],
];

const ZONES = [
  ["Caferağa Mah.", 0, 300, null, "30-45 dk"],
  ["Moda", 0, 300, null, "30-45 dk"],
  ["Fenerbahçe Mah.", 40, 400, 750, "45-60 dk"],
  ["Göztepe Mah.", 60, 500, 1000, "60-90 dk"],
];

const daysFromNow = (d) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);

await sql.begin(async (tx) => {
  await tx`delete from tenants where slug = ${SLUG}`;
  await tx`delete from users where email = ${EMAIL}`;
  const [t] = await tx`
    insert into tenants (slug, name, tagline, about, phone, whatsapp, email, address, city, district, working_hours,
                         pay_bank_transfer, iban, iban_holder, company_title, tax_office, tax_number, min_order_amount, order_note)
    values (${SLUG}, 'Patiler Petshop', 'Kadıköy’ün mahalle petshopu, artık kapınızda',
            'Kedi ve köpek dostlarımız için 2015’ten beri Caferağa’dayız. Mama, kum, oyuncak ve aksesuar — hepsi aynı gün teslim.',
            '5321234567', '5321234567', 'merhaba@patiler.example', 'Moda Cd. No: 12', 'İstanbul', 'Kadıköy',
            'Her gün 09:00 - 21:00', true, 'TR000000000000000000000000', 'Patiler Evcil Hayvan Ürünleri Ltd. Şti.',
            'Patiler Evcil Hayvan Ürünleri Ltd. Şti.', 'Kadıköy', '0000000000', 150, '18:00’den sonra verilen siparişler ertesi sabah teslim edilir.')
    returning id`;
  const [u] = await tx`insert into users (email, password_hash, name, phone) values (${EMAIL}, ${hash("demo1234")}, 'Deniz Demo', '5321234567') returning id`;
  await tx`insert into memberships (tenant_id, user_id, role) values (${t.id}, ${u.id}, 'owner')`;
  const [k] = await tx`insert into users (email, password_hash, name, phone) values ('kurye@pet.xshield.com.tr', ${hash("demo1234")}, 'Kerem Kurye', '5329876543')
                        on conflict (email) do update set password_hash = excluded.password_hash returning id`;
  await tx`insert into memberships (tenant_id, user_id, role) values (${t.id}, ${k.id}, 'courier')`;

  const catIds = {};
  for (const [i, name] of CATS.entries()) {
    const [c] = await tx`insert into categories (tenant_id, name, slug, sort) values (${t.id}, ${name}, ${slugify(name)}, ${i}) returning id`;
    catIds[name] = c.id;
  }
  for (const [i, z] of ZONES.entries())
    await tx`insert into delivery_zones (tenant_id, name, fee, min_order, free_over, eta_text, sort) values (${t.id}, ${z[0]}, ${z[1]}, ${z[2]}, ${z[3]}, ${z[4]}, ${i})`;

  for (const [name, brand, pet, cat, vs] of PRODUCTS) {
    const [p] = await tx`insert into products (tenant_id, category_id, name, brand, pet_type, description)
      values (${t.id}, ${catIds[cat]}, ${name}, ${brand}, ${pet}, ${`${name}. Demo ürün açıklaması.`}) returning id`;
    for (const [i, [vname, barcode, unit, price, compare, cost, stock, expiryDays]] of vs.entries()) {
      const [v] = await tx`insert into variants (tenant_id, product_id, name, barcode, unit, price, compare_at_price, cost_price, stock_qty, sort)
        values (${t.id}, ${p.id}, ${vname}, ${barcode}, ${unit}, ${price}, ${compare}, ${cost}, ${stock}, ${i}) returning id`;
      if (stock > 0) {
        await tx`insert into stock_movements (tenant_id, variant_id, type, qty_delta, balance_after, unit_cost, note, user_id)
          values (${t.id}, ${v.id}, 'receive', ${stock}, ${stock}, ${cost}, 'Açılış stoğu', ${u.id})`;
        if (expiryDays != null)
          await tx`insert into stock_batches (tenant_id, variant_id, lot_no, expiry_date, qty_remaining)
            values (${t.id}, ${v.id}, ${"L" + Math.floor(Math.random() * 9000 + 1000)}, ${daysFromNow(expiryDays)}, ${stock})`;
      }
    }
  }
  await tx`insert into legal_pages (tenant_id, kind, body) values
    (${t.id}, 'kvkk', 'Bu bir demo metindir. Mağaza sahibi kendi KVKK aydınlatma metnini buraya ekler.'),
    (${t.id}, 'mesafeli-satis', 'Bu bir demo metindir. Mağaza sahibi kendi mesafeli satış sözleşmesini buraya ekler.'),
    (${t.id}, 'iade', 'Bu bir demo metindir. Açılmamış ürünler 14 gün içinde iade edilebilir.')`;
});

console.log(`Demo mağaza hazır → /${SLUG}  ·  giriş: ${EMAIL} / demo1234  ·  kurye: kurye@pet.xshield.com.tr / demo1234`);
await sql.end();
