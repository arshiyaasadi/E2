# Build from repository root:
#   docker build -f services/file-service/Dockerfile -t REPLACE_IMAGE_REGISTRY/file-service:0.1.0 .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock* ./
COPY packages/tsconfig ./packages/tsconfig
COPY services/file-service ./services/file-service
RUN yarn install --frozen-lockfile || yarn install
RUN yarn workspace @e2/file-service build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/yarn.lock* ./
COPY --from=build /app/packages/tsconfig ./packages/tsconfig
COPY --from=build /app/services/file-service/package.json ./services/file-service/
COPY --from=build /app/services/file-service/dist ./services/file-service/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/file-service/node_modules ./services/file-service/node_modules
WORKDIR /app/services/file-service
EXPOSE 8080
USER node
CMD ["node", "dist/index.js"]
