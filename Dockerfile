# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app

# Dependencias
COPY package*.json ./
RUN npm ci

# Código
COPY . .

# Build Nest (dist/)
RUN npm run build

# Stage 2: runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Solo deps de prod
COPY package*.json ./
RUN npm ci --omit=dev

# Copiamos dist desde builder
COPY --from=builder /app/dist ./dist

# Env por defecto
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
