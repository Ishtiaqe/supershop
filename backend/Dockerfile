### Multistage Dockerfile for NestJS backend

# Use an official Node base image. Alpine keeps image smaller, but you can choose debian/bullseye if you need native deps.
FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent

FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure OpenSSL is present during build so Prisma can choose a proper engine
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
# Generate Prisma client before building
RUN npx prisma generate || true
RUN npm run build

FROM node:20-bullseye-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
# Ensure OpenSSL/libssl is available for the Prisma query engine
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
EXPOSE 8000
CMD ["node", "dist/main"]
