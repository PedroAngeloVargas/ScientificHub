# auth-service: imagem de produção (multi-stage)
FROM node:22-slim AS base
# O Prisma precisa do OpenSSL para o motor de consultas
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- Compilação ----------
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# Gera o client do Prisma (tipos para o tsc), compila, remove dependências de desenvolvimento
# e gera o client de novo (o prune pode remover o client gerado)
RUN npx prisma generate \
    && npm run build \
    && npm prune --omit=dev \
    && npx prisma generate

# ---------- Execução ----------
FROM base
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
# O schema fica na imagem para o Job de deploy executar "npx prisma db push"
COPY --from=build --chown=node:node /app/prisma ./prisma
USER node
EXPOSE 3000
CMD ["node", "build/index.js"]
