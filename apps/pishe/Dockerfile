# Pishe production image — build from monorepo root:
#   docker build -f apps/pishe/Dockerfile -t ghcr.io/arshiyaasadi/pishe:local .
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json yarn.lock ./
COPY apps/pishe/package.json apps/pishe/
# Minimal workspace stubs so Yarn resolves the monorepo graph
RUN mkdir -p packages services \
  && printf '{"name":"@e2/stub","version":"0.0.0","private":true}\n' > packages/package.json \
  && printf '{"name":"@e2/svc-stub","version":"0.0.0","private":true}\n' > services/package.json \
  && yarn install --frozen-lockfile --network-timeout 600000 \
  || yarn install --network-timeout 600000

FROM node:22-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo /repo
COPY apps/pishe apps/pishe
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_ENV=production
ENV NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_APP_NAME=Pishe
ARG NEXT_PUBLIC_APP_URL=https://pishe.abysso.ir
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
WORKDIR /repo/apps/pishe
RUN yarn prisma generate && yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3010
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /repo/apps/pishe/public ./apps/pishe/public
COPY --from=builder /repo/apps/pishe/.next/standalone ./
COPY --from=builder /repo/apps/pishe/.next/static ./apps/pishe/.next/static
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /repo/apps/pishe/prisma ./apps/pishe/prisma
USER nextjs
EXPOSE 3010
CMD ["node", "apps/pishe/server.js"]
