# Imagen para desplegar BoardHub (web + servidor de juego) en Render, Railway, Fly.io, etc.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=build /app /app
EXPOSE 3001
CMD ["node", "server/index.js"]
