FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# prisma generate needs no database, but the config file reads DATABASE_URL
RUN DATABASE_URL=postgresql://x npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Neon's pooled connection cannot take Prisma's migration lock. One instance, so it is safe to skip.
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
COPY package*.json ./
RUN npm ci --omit=dev && npm i --no-save prisma@7.10 tsx
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./dist/generated
COPY prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 4000
USER node
# apply migrations, then start
# a sleeping free database can need a second try
CMD ["sh", "-c", "(npx prisma migrate deploy || (sleep 8 && npx prisma migrate deploy)) && node dist/server.js"]
