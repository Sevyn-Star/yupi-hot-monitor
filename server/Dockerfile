FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json vitest.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 3001
VOLUME ["/app/data"]
ENV DATABASE_URL="file:/app/data/prod.db"
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
