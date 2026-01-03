# Multi-stage build for Node.js application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY course-site-with-nodejs-backend/server-nodejs/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY course-site-with-nodejs-backend/server-nodejs/ ./

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app ./

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
