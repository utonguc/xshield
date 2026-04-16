#!/bin/bash
# e-Clinic veritabanı yedekleme scripti
# Kullanım: ./scripts/backup.sh
#
# Yedekler ./backups/ dizinine kaydedilir.
# Son 10 yedek saklanır, eskiler otomatik silinir.

set -e

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="${DB_CONTAINER:-clinic_db}"
DB_USER="${DB_USER:-clinicuser}"
DB_NAME="${DB_NAME:-clinicdb_prod}"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Yedekleme başlıyor..."
echo "  Konteyner : $DB_CONTAINER"
echo "  Veritabanı: $DB_NAME"

BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql"

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

echo "  Yedek     : ${BACKUP_FILE}.gz"

# Son 10 yedeği tut, eskilerini sil
ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -v

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Yedekleme tamamlandı."
