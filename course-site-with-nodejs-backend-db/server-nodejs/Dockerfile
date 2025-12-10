# Multi-stage build for Node.js backend with Prisma
FROM node:20-slim AS base

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema first (needed for generate)
COPY prisma ./prisma/

# Install ALL dependencies (including Prisma CLI in devDependencies)
RUN npm ci && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# Remove devDependencies to reduce image size
RUN npm prune --production

# Copy application code
COPY . .

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Health check (requires /health endpoint in your app)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
