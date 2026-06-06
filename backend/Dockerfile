# ===== PRODUCTION DOCKERFILE FOR BACKEND (Node.js/Express) =====
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11.1.1

# Copy package configurations and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source files
COPY . .

# Build/Compile TypeScript code
RUN pnpm run build

# Remove development dependencies to optimize production image size
RUN pnpm prune --prod

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Install pnpm
RUN npm install -g pnpm@11.1.1

# Copy built code and production node_modules from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["pnpm", "run", "start"]
