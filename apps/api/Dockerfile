FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configurations
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build projects
RUN pnpm --filter shared-types build
RUN pnpm --filter shared-utils build
RUN pnpm --filter api build

EXPOSE 3000

ENV NODE_ENV=production

# Run database migrations and start backend
CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma && pnpm --filter api exec tsx ../../prisma/seed.ts && node apps/api/dist/server.js"]
