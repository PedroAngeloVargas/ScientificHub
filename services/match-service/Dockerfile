# match-service: imagem de produção (multi-stage)
FROM node:22-slim AS base
WORKDIR /app

# ---------- Compilação ----------
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------- Execução ----------
FROM base
ENV NODE_ENV=production \
    PORT=3003
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
USER node
EXPOSE 3003
CMD ["node", "build/index.js"]
