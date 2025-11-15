# Base image
FROM node:18-alpine AS base

# Dependencies stage
FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Copy necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Start application
CMD ["npm", "run", "start:prod"]
