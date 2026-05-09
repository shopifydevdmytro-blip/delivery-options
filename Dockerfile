FROM node:20-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build && npm prune --omit=dev && npm cache clean --force

FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["npm", "run", "docker-start"]
