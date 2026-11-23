# xShield Pet — çok aşamalı imaj (Next.js standalone)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Migration betiği ve SQL dosyaları + migrator'ın ihtiyaç duyduğu paketlerin tamamı
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=deps --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=node:node /app/node_modules/postgres ./node_modules/postgres

RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
VOLUME ["/app/uploads"]

# Bekleyen migration'ları uygula, sonra sunucuyu başlat.
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
