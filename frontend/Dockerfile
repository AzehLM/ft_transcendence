# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Dev stage (for docker-compose.dev.yml)
FROM node:20-alpine AS dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run dev server
CMD ["npm", "run", "dev", "--", "--host"]

# Runtime stage
FROM caddy:2.7-alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/caddy

# Caddy will serve these files (already configured in Caddyfile.dev)