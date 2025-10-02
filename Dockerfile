# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Create app directory
WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

# Security best practices
ENV NODE_ENV=production
# If your server reads PORT from env, keep this; Express uses it.
ENV PORT=4000

# Use the non-root "node" user provided by the image
RUN chown -R node:node /app
USER node

# Expose API port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
