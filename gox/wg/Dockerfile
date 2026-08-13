FROM alpine:3.20
# wireguard-tools (wg, wg-quick) + iptables — kernel WG kullanılıyor (VPS'te doğrulandı)
RUN apk add --no-cache wireguard-tools iptables ip6tables iproute2 bash postgresql-client python3 py3-pip
# PMS B-şıkkı (tünelden pull) için saf-python DB sürücüleri (derleme gerektirmez)
RUN pip install --no-cache-dir --break-system-packages pymysql python-tds firebirdsql pg8000
COPY entrypoint.sh /entrypoint.sh
COPY coa.py /coa.py
COPY agent.py /agent.py
RUN chmod +x /entrypoint.sh
EXPOSE 443/udp
ENTRYPOINT ["/entrypoint.sh"]
