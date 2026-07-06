# syntax=docker/dockerfile:1

# ── Etapa 1: instalar dependencias ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Etapa 2: imagen final, ligera ───────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# node:alpine ya trae un usuario 'node' no-root — buena práctica para K8s
USER node

EXPOSE 3003

CMD ["node", "src/index.js"]
