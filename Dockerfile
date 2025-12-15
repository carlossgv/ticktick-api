# Stage 0 — enable pnpm (corepack)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ✅ timezone database (required for America/Santiago etc.)
RUN apk add --no-cache tzdata

# ✅ default TZ (puedes override con env en compose)
ENV TZ=America/Santiago

RUN corepack enable

# Stage 1 — dependencies (best practice for pnpm)
FROM base AS deps
WORKDIR /app

# Copiamos solo package.json + pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# pnpm fetch descarga dependencias al store pero NO las instala
RUN pnpm fetch

# Stage 2 — builder
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Copiamos el store del stage anterior
COPY --from=deps /pnpm/store /pnpm/store

# Instala deps (incluye devDeps) a partir del lockfile y del store
RUN pnpm install --frozen-lockfile

# Copiar el código fuente entero
COPY . .

# Build de Nest (genera dist/)
RUN pnpm run build

# Stage 3 — runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiamos package.json y lockfile
COPY package.json pnpm-lock.yaml ./

# Copiamos el store del deps stage
COPY --from=deps /pnpm/store /pnpm/store

# Instalamos SOLO dependencias de runtime
RUN pnpm install --frozen-lockfile --prod

# Copiamos el output ya compilado
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
