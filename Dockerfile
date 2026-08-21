# ==========================================
# Stage 1: Build & Bundle Optimization
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache libc6-compat

# Install dependencies deterministically
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Minimal Distroless / Nginx Runner
# ==========================================
FROM nginx:1.27-alpine-slim AS runner

# Create non-root user and setup directories
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html

# Copy built assets and custom nginx configuration
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Run as unprivileged non-root user
USER nginx

EXPOSE 80

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
