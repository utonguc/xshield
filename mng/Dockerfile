FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs --home-dir /home/nextjs --create-home nextjs \
 && apt-get update -qq && apt-get install -y --no-install-recommends \
    ca-certificates iputils-ping nmap libpcap0.8 curl perl \
    libnet-ssleay-perl libcrypt-ssleay-perl libcap2-bin unzip whatweb \
    libxml-writer-perl libjson-perl \
 # nmap OS detection: SUID so it runs as root regardless of calling user
 && chmod u+s /usr/bin/nmap \
 # nikto
 && curl -fsSL https://github.com/sullo/nikto/archive/refs/heads/main.tar.gz \
    | tar -xz -C /opt/ && mv /opt/nikto-main /opt/nikto \
 && ln -sf /opt/nikto/program/nikto.pl /usr/local/bin/nikto \
 && chmod +x /opt/nikto/program/nikto.pl \
 # subfinder — subdomain discovery (resolve latest version via API)
 && SF_URL=$(curl -sL https://api.github.com/repos/projectdiscovery/subfinder/releases/latest | grep '"browser_download_url"' | grep 'linux_amd64.zip' | grep -oE 'https://[^"]+' | head -1) \
 && curl -fsSL "$SF_URL" -o /tmp/pd.zip && unzip -qo /tmp/pd.zip subfinder -d /usr/local/bin/ && chmod +x /usr/local/bin/subfinder \
 # httpx — HTTP probing
 && HX_URL=$(curl -sL https://api.github.com/repos/projectdiscovery/httpx/releases/latest | grep '"browser_download_url"' | grep 'linux_amd64.zip' | grep -oE 'https://[^"]+' | head -1) \
 && curl -fsSL "$HX_URL" -o /tmp/pd.zip && unzip -qo /tmp/pd.zip httpx -d /usr/local/bin/ && chmod +x /usr/local/bin/httpx \
 # nuclei — template-based vulnerability scanner
 && NC_URL=$(curl -sL https://api.github.com/repos/projectdiscovery/nuclei/releases/latest | grep '"browser_download_url"' | grep 'linux_amd64.zip' | grep -oE 'https://[^"]+' | head -1) \
 && curl -fsSL "$NC_URL" -o /tmp/pd.zip && unzip -qo /tmp/pd.zip nuclei -d /usr/local/bin/ && chmod +x /usr/local/bin/nuclei \
 # ffuf — directory/file fuzzing
 && FFUF_VER=$(curl -sSLo /dev/null -w '%{url_effective}' https://github.com/ffuf/ffuf/releases/latest | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | tr -d 'v') \
 && curl -fsSL "https://github.com/ffuf/ffuf/releases/download/v${FFUF_VER}/ffuf_${FFUF_VER}_linux_amd64.tar.gz" \
    | tar -xz -C /usr/local/bin/ ffuf && chmod +x /usr/local/bin/ffuf \
 # wordlist for ffuf
 && mkdir -p /opt/wordlists \
 && curl -fsSL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt \
    -o /opt/wordlists/common.txt \
 # nuclei home dir (templates auto-download on first run)
 && mkdir -p /opt/nuclei-home \
 # cleanup
 && rm -f /tmp/pd.zip && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/uploads/contracts /app/uploads/logos \
 && chown -R nextjs:nodejs /app/uploads /opt/nuclei-home

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Agent binaries
COPY agent/xshield_agent.exe ./agent/xshield_agent.exe
COPY agent/xshield_tray.exe  ./agent/xshield_tray.exe

USER nextjs
ENV HOME=/home/nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
