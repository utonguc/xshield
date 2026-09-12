## Build aşaması: statik siteyi üretir
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install

COPY . .
RUN npm run build

## Çalışma aşaması: sadece dist/ + minimal Express sunucusu
## (react/three/threeui yalnızca build-time bağımlılığıdır, Vite tarafından
## dist/'e gömülür — runtime'da ihtiyaç express + nodemailer'dır; imajı
## şişirmemek için build aşamasının tüm bağımlılıklarını değil, sadece
## bunları kurar. .mjs uzantısı, package.json'daki "type" alanından
## bağımsız olarak dosyanın ES module olarak çalıştırılmasını garanti eder.)
FROM node:20-alpine
WORKDIR /app

RUN npm init -y >/dev/null 2>&1 && npm install express@^5 nodemailer@^10 --omit=dev

COPY server.mjs ./
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["node", "server.mjs"]
