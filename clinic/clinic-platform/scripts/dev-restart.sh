#!/bin/bash
# ─── Development restart (veri korunur) ──────────────────────────────────────
# Kullanım: ./scripts/dev-restart.sh
#
# UYARI: "docker-compose down -v" KULLANMAYIN — bu komutu veri siler.
# Bu script yerine bunu kullanın.
# ─────────────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "▶ Servisler yeniden build ediliyor (veriler korunuyor)..."
docker-compose build --no-cache
docker-compose up -d --remove-orphans
echo "✓ Tamamlandı. Loglar: docker-compose logs -f backend"
