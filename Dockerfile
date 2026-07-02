FROM node:20-alpine AS build
WORKDIR /app
ENV CHECKPOINT_DISABLE=1
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV CHECKPOINT_DISABLE=1
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/server.js"]
