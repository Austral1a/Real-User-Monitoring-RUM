# syntax=docker/dockerfile:1
#
#   docker compose -f docker-compose.dev.yml up --build
#   docker compose up --build
#
# Default image target is production.

FROM node:20-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS development

COPY src ./src
COPY web ./web
COPY public ./public
COPY tsconfig.json ./

ENV NODE_ENV=development
ENV MONITOR_DEV=1
ENV MONITOR_PORT=4000
ENV MONITOR_DB_PATH=/app/data/rum.sqlite

RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 4000

CMD ["pnpm", "dev"]

FROM base AS build

COPY src ./src
COPY web ./web
COPY public ./public
COPY tsconfig.json ./

RUN pnpm build

FROM node:20-bookworm-slim AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/public ./public

ENV NODE_ENV=production
ENV MONITOR_PORT=4000
ENV MONITOR_DB_PATH=/app/data/rum.sqlite

RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.MONITOR_PORT||4000)+'/rum.js').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "exec", "tsx", "src/server.ts"]
