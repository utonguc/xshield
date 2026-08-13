#!/bin/sh
# DB bağlantı bilgilerini env'den sql modül config'ine yerleştir, sonra FreeRADIUS'u çalıştır.
set -e
SQL=/etc/raddb/mods-available/sql
if grep -q '@DB_HOST@' "$SQL" 2>/dev/null; then
  sed -i \
    -e "s|@DB_HOST@|${GOX_DB_HOST:-gox_db}|g" \
    -e "s|@DB_PORT@|${GOX_DB_PORT:-5432}|g" \
    -e "s|@DB_NAME@|${GOX_DB_NAME:-goxdb}|g" \
    -e "s|@DB_USER@|${GOX_DB_USER:-goxuser}|g" \
    -e "s|@DB_PASS@|${GOX_DB_PASS:-goxpass}|g" \
    "$SQL"
fi
# Argüman verilmişse onu çalıştır (örn: freeradius -XC / -X config testi),
# yoksa normal foreground modunda başlat.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
exec freeradius -f
