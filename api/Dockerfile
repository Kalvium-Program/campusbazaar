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
COPY package*.json ./
RUN npm ci --omit=dev && npm i --no-save prisma@7.10 tsx
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./dist/generated
COPY prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 4000
USER node
# apply migrations, then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
