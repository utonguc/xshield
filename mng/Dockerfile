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

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs \
 && apt-get update -qq && apt-get install -y --no-install-recommends iputils-ping chromium && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/uploads/contracts /app/uploads/logos \
 && chown -R nextjs:nodejs /app/uploads

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Agent binaries
COPY agent/xshield_agent.exe ./agent/xshield_agent.exe
COPY agent/xshield_tray.exe  ./agent/xshield_tray.exe

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
