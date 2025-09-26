# --- ETAPA 1: Builder ---
# Usamos una imagen reciente y estable de Node.js (LTS).
# La nombramos 'builder' para referenciarla después.
FROM node:20-alpine AS builder

# Habilita pnpm, que viene incluido con Node.js a través de corepack.
RUN corepack enable

WORKDIR /app

# Copia los archivos de manifiesto del paquete para pnpm.
COPY package.json pnpm-lock.yaml ./

# Instala TODAS las dependencias (incluyendo devDependencies) usando el lockfile.
RUN pnpm install --frozen-lockfile

# Copia el resto del código fuente.
COPY . .

# Genera el cliente de Prisma, necesario para la compilación.
RUN pnpm prisma generate

# Ejecuta el script de build de tu package.json.
RUN pnpm run build

# --- ETAPA 2: Production ---
# Empezamos de nuevo desde una imagen limpia para mantenerla ligera.
FROM node:20-alpine

# Habilita pnpm también en la imagen de producción.
RUN corepack enable

WORKDIR /app

# Copia los manifiestos de nuevo.
COPY package.json pnpm-lock.yaml ./

# Instala ÚNICAMENTE las dependencias de producción.
RUN pnpm install --prod --frozen-lockfile

# Copia los artefactos construidos desde la etapa 'builder'.
COPY --from=builder /app/dist ./dist

# Copia el schema de Prisma (necesario en tiempo de ejecución).
COPY --from=builder /app/prisma ./prisma

# Expone el puerto que tu aplicación usa (ajusta si es necesario).
EXPOSE 3000

# El comando para iniciar la aplicación en modo producción, usando pnpm.
CMD ["pnpm", "run", "start:prod"]