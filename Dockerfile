# Multi-stage build for React Admin application

# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SIMPLE_REST_URL
ARG VITE_TEST_USERNAME
ARG VITE_TEST_PASSWORD
ARG VITE_JWT_SECRET
ARG VITE_ENV
ARG VITE_DEBUG

# Set environment variables during build
ENV VITE_SIMPLE_REST_URL=$VITE_SIMPLE_REST_URL
ENV VITE_TEST_USERNAME=$VITE_TEST_USERNAME
ENV VITE_TEST_PASSWORD=$VITE_TEST_PASSWORD
ENV VITE_JWT_SECRET=$VITE_JWT_SECRET
ENV VITE_ENV=$VITE_ENV
ENV VITE_DEBUG=$VITE_DEBUG

# Build the application
RUN npm run build

# Stage 2: Production server with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/ || exit 1

# Expose port
EXPOSE 3001

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
