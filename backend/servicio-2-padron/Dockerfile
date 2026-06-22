# --- ETAPA 1: CONSTRUCCIÓN (BUILDER) ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .

# --- ETAPA 2: PRODUCCIÓN (ENTORNO LIGERO) ---
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /usr/src/app ./

ENV NODE_ENV=production

# Los servicios 2 y 3 no exponen puertos públicos porque son puramente Event-Driven (escuchan colas)
CMD ["node", "src/index.js"]