#!/bin/bash
# ─── xShield e-Clinic — Production Deployment ────────────────────────────────
# Kullanım: ./scripts/deploy.sh [--skip-backup]
#
# Adımlar:
#   1. Veritabanı yedeği al (--skip-backup ile atlanabilir)
#   2. Konteynerleri yeniden build et
#   3. Servisleri yeniden başlat
#
# ÖNEMLİ: Bu script --volumes flag'i KULLANMAZ. Veriler korunur.
# ─────────────────────────────────────────────────────────────────────────────

set -e

SKIP_BACKUP=false
for arg in "$@"; do
  [[ "$arg" == "--skip-backup" ]] && SKIP_BACKUP=true
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION_FILE="$ROOT_DIR/frontend/lib/version.ts"

# Versiyonu oku
APP_VERSION=$(grep 'APP_VERSION' "$VERSION_FILE" 2>/dev/null | sed 's/.*"\(.*\)".*/\1/' || echo "unknown")

echo "================================================"
echo " xShield e-Clinic — Production Deployment"
echo " Versiyon : v${APP_VERSION}"
echo " Tarih    : $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

# .env.prod kontrolü
if [ ! -f "$ROOT_DIR/.env.prod" ]; then
  echo "HATA: .env.prod dosyası bulunamadı!"
  echo "      cp .env.prod.example .env.prod  komutunu çalıştırın ve doldurun."
  exit 1
fi

# SSL sertifikası kontrolü
if [ ! -f "$ROOT_DIR/nginx/ssl/selfsigned.crt" ]; then
  echo "HATA: SSL sertifikası bulunamadı!"
  echo "      ./scripts/gen-ssl.sh  komutunu çalıştırın."
  exit 1
fi

cd "$ROOT_DIR"

# 1. Yedekleme
if [ "$SKIP_BACKUP" = false ]; then
  echo ""
  echo "[1/3] Veritabanı yedekleniyor..."
  "$SCRIPT_DIR/backup.sh" || {
    echo "UYARI: Yedekleme başarısız. Devam etmek istiyor musunuz? (y/N)"
    read -r confirm
    [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 1
  }
else
  echo "[1/3] Yedekleme atlandı (--skip-backup)."
fi

# 2. Build
echo ""
echo "[2/3] Konteynerler build ediliyor... (bu birkaç dakika sürebilir)"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file .env.prod \
  build --no-cache

# 3. Restart (veri silinmez)
echo ""
echo "[3/3] Servisler yeniden başlatılıyor..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --remove-orphans

echo ""
echo "================================================"
echo " Deployment tamamlandı — v${APP_VERSION}"
echo " Log takibi: docker-compose logs -f"
echo "================================================"
