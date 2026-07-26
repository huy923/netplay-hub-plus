FROM node:24-alpine

RUN apk add --no-cache libc6-compat openssl postgresql-client

WORKDIR /app

COPY . .

RUN npm install && npx prisma generate

EXPOSE 8080

CMD ["sh", "-c", "until pg_isready -h db -U user; do echo 'waiting for db...'; sleep 2; done && sed -i 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/schema.prisma && npx prisma generate && npx prisma db push && npx prisma db seed && npm run dev -- --host 0.0.0.0 --port 8080"]
