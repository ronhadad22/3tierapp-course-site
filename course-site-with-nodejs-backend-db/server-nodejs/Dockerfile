# Use official Node.js LTS image (arm64 and x86 compatible)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install OpenSSL and other required dependencies
RUN apt-get update -y && apt-get install -y openssl python3 make g++

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Rebuild bcrypt for the current architecture
RUN npm rebuild bcrypt --build-from-source

# Expose the port your server runs on
EXPOSE 5001

# Start the server
CMD ["npm", "start"]
