# ===== PRODUCTION DOCKERFILE FOR NEXT.JS WEB APP =====
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package configurations and install dependencies using clean install (ci) to leverage Docker cache
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application source files
COPY . .

# Run build step
RUN npm run build

# Runner stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy built assets and node_modules from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
