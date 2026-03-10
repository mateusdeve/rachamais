FROM node:20-alpine AS builder
WORKDIR /app

# Dependências
COPY package*.json ./
RUN npm ci

# Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Código
COPY . .

# ====== Stage final ======
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx server.ts"]