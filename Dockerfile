# ---- Stage 1: install dependencies (runs postinstall: setup-env.js + prisma generate) ----
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl postgresql-client
COPY package.json package-lock.json ./
COPY .env.example ./
COPY prisma ./prismaw
COPY scripts ./scripts
RUN npm install

# ---- Stage 2: production build (Node target, no Cloudflare plugin) ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma \
  && npx prisma generate \
  && npx vite build --config vite.config.node.ts

# ---- Stage 3: runtime ----
FROM node:24-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl postgresql-client
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY prod.mjs ./
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "until pg_isready -h db -U user -d netplay_db; do echo 'waiting for db...'; sleep 2; done && npx prisma db push --skip-generate && if [ \"$SEED_DB\" = \"1\" ]; then echo 'seeding...'; node prisma/seed.js; fi && exec node prod.mjs"]