# --- ETAPA 1: Builder ---
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

RUN env DATABASE_URL="postgresql://postgres:kXHMZzHWAiISWSGKbpiKXHBfbKbnQwQK@caboose.proxy.rlwy.net:51892/railway?sslmode=require" pnpm prisma generate
RUN pnpm run build

# --- ETAPA 2: Production ---
FROM node:20-alpine
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# --- INICIO DE LA SOLUCIÓN FINAL ---
# Reemplaza la ruta de origen con la que encontraste en tu log.
# Asegúrate de que termine en /client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@6.16.2_prisma@6.16.2_typescript@5.9.2__typescript@5.9.2/node_modules/.prisma/client ./node_modules/.prisma/client
# --- FIN DE LA SOLUCIÓN FINAL ---

EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]