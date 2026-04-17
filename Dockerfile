FROM node:20-alpine
WORKDIR /app

COPY package.json ./

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install

COPY . .

RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start", "--", "-p", "3001"]
