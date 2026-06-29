# Stage 1: Build
FROM node:20-alpine AS builder

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
COPY apps/web/ ./apps/web/

# Build projects
RUN pnpm --filter shared-types build
RUN pnpm --filter shared-utils build
RUN pnpm --filter web build

# Stage 2: Serve using Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
