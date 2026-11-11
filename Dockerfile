FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm prisma:generate

COPY src ./src
RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma

RUN pnpm install --prod --ignore-scripts || pnpm install --prod
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* /app/node_modules/.pnpm/
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
