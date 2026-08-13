# goX — Misafir İnterneti / Captive Portal SaaS

`gox.xshield.com.tr` · xShield ürün ailesi · MikroTik tabanlı misafir Wi-Fi yönetimi.

> Bu dosya yerel referans; **tek gerçek kaynak VPS**'tir. Mimari/karar geçmişi için MCP
> memory: `project_gox.md` ve `project_gox_procedure.md`.

## Mimari (2026-06-13 kilitlendi)

| Konu | Karar |
|---|---|
| RouterOS filosu | Karışık (v6 binary API + v7 REST) → tek soyutlama katmanı |
| Bağlantı modeli | Cihazdan VPS'e **WireGuard** tüneli (RouterOS API'si internete açılmaz) |
| Auth omurgası | Merkezi **FreeRADIUS** (VPS); hız profili `Mikrotik-Rate-Limit`, oturum müdahalesi CoA/Disconnect (3799) |
| "Profil sihri" | Profiller merkezde RADIUS'ta; panel yalnız MAC→profil + whitelist/blacklist yönetir |
| Kopmadan anket | Hotspot Advertisement (advertise-url + interval); kısıt: HTTPS-everywhere |

## Servisler (container: `<ürün>_<servis>`, network: `xshield-net`)

| Container | Teknoloji | Rol |
|---|---|---|
| `gox_api` | Go | Backend: cihaz yönetimi, RADIUS yönetimi, portal/anket API |
| `gox_panel` | SvelteKit (özgün tasarım, Tailwind/shadcn YOK) | Yönetim arayüzü |
| `gox_db` | PostgreSQL 16 | Veri |
| `gox_radius` | FreeRADIUS | Misafir auth + accounting + CoA |
| Captive portal | statik | Misafir karşılama/login (gox_api üzerinden servis) |

## Modül fazları

0. **Boru hattı** — gox_api health + DB şema + deploy/MCP döngüsü kanıtı  ← şu an
1. Cihaz onboarding + WireGuard tünel + MikroTik network config (IP/Subnet, DHCP, NAT, hotspot)
2. Bağlantı profilleri (süre + hız) + MAC/whitelist/blacklist
3. Captive portal login sayfası + opsiyonlar (misafir/personel/toplantı/geçici-2sa)
4. Anket modülü (kopmadan; periyodik/tek seferlik)
5. Müşteri yönetim paneli
6. Owner paneli (müşteri yönetimi)

## Deploy prosedürü (ZORUNLU — local/VPS kopukluğu yok)

```
# 1) repo'da yaz + commit
# 2) VPS'e sync
# 3) VPS'te build + up (paylaşımlı infra):
cd /home/rootx/xshield/infra
docker compose build gox_api          # veya ilgili servis
docker compose up -d gox_api
# nginx değiştiyse: docker compose exec nginx nginx -t && docker compose up -d --force-recreate nginx
# 4) gox.xshield.com.tr'de doğrula
# 5) MCP memory güncelle (ne deploy edildi / migration / karar)
```

VPS: `ssh -i ~/.ssh/vps_key rootx@77.223.130.51` · kök `/home/rootx/xshield/`
