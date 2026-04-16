#!/bin/bash
echo "=== [1/4] DB sıfırlanıyor ==="
sudo docker exec clinic_db psql -U clinicuser -d clinicdb \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null \
  && echo "DB sıfırlandı." \
  || echo "DB container'ı bulunamadı, devam ediliyor..."

echo "=== [2/4] Docker yeniden derleniyor ==="
sudo docker-compose down
sudo docker-compose up -d --build

echo "=== [3/4] Backend hazır olana kadar bekleniyor (maks 90 sn) ==="
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/Health 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "Backend hazır! (${i}. denemede, ~$((i*3)) sn)"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "HATA: Backend 90 saniyede hazır olmadı!"
    echo "--- Son loglar ---"
    sudo docker logs clinic_backend --tail 30
    exit 1
  fi
  sleep 3
done

echo "=== [4/4] Login + API testi ==="
LOGIN=$(curl -s -X POST http://localhost:8080/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"admin","password":"Admin123!*"}')

echo "Login yanıtı: $LOGIN"

# Python3 ile token çıkar (daha güvenilir)
TOKEN=$(echo "$LOGIN" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('accessToken',''))
except:
    print('')
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo ""
  echo "HATA: Token alınamadı! Login başarısız olmuş olabilir."
  echo "Backend logları:"
  sudo docker logs clinic_backend --tail 40
  exit 1
fi

echo "Token alındı: ${TOKEN:0:50}..."

for EP in "Patients" "Doctors" "Dashboard/widgets" "Reports/summary"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:8080/api/$EP" \
    -H "Authorization: Bearer $TOKEN")
  echo "  $EP -> $CODE"
done

echo ""
echo "==================================================================="
echo "  Kurulum tamamlandı!"
echo "  Frontend : http://localhost:3000"
echo "  Swagger  : http://localhost:8080/swagger"
echo "  Giriş    : admin / Admin123!*"
echo "==================================================================="
echo ""
echo "ÖNEMLI: Tarayıcıda eski token'ı temizleyin:"
echo "  F12 > Console > localStorage.clear() > Enter"
echo "  Sonra http://localhost:3000 adresinden tekrar giriş yapın."
