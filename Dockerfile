FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm -r --workspace-concurrency=1 build
RUN pnpm --filter @ninbi/api deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    WEB_DIST_DIR=/app/web
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
# No deploy o pacote do workspace pode ficar como link para /repo: troca por uma cópia.
RUN rm -rf node_modules/@ninbi/contracts
COPY --from=build /repo/packages/contracts/package.json ./node_modules/@ninbi/contracts/package.json
COPY --from=build /repo/packages/contracts/dist ./node_modules/@ninbi/contracts/dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle
COPY --from=build /repo/apps/web/dist ./web
EXPOSE 8080
# Aplica as migrações e abre a porta.
CMD ["sh", "-c", "node dist/database/migrate-cli.js && exec node dist/main.js"]
