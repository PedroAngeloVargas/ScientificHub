# frontend: site estático (next export) servido por nginx
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# As URLs das APIs ficam embutidas no JavaScript no momento do build.
# Em produção são caminhos relativos: o Ingress encaminha /api/... para cada serviço no mesmo domínio.
ARG NEXT_PUBLIC_AUTH_URL=/api/auth
ARG NEXT_PUBLIC_PERFIL_URL=/api
ARG NEXT_PUBLIC_ACADEMICO_URL=/api
ARG NEXT_PUBLIC_MATCH_URL=/api/match
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL \
    NEXT_PUBLIC_PERFIL_URL=$NEXT_PUBLIC_PERFIL_URL \
    NEXT_PUBLIC_ACADEMICO_URL=$NEXT_PUBLIC_ACADEMICO_URL \
    NEXT_PUBLIC_MATCH_URL=$NEXT_PUBLIC_MATCH_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Execução: só ficheiros estáticos, sem Node ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080
