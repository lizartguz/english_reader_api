FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

FROM deps AS build

COPY prisma ./prisma
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
COPY prisma.config.ts ./

RUN npm run prisma:generate
RUN npm run build

FROM build AS migrate

ENV NODE_ENV=production

CMD ["npm", "run", "prisma:deploy"]

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system nodeapp \
  && useradd --system --gid nodeapp --home-dir /app nodeapp

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN mkdir -p /app/storage/private \
  && chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 3000

CMD ["node", "dist/main.js"]
