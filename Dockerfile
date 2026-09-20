# ── build: cài devDependencies, chạy tsc + vite build → dist/ ──
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── runtime: chỉ Node core, không cần node_modules (server.js không import gói ngoài
#    trừ nhánh Vercel Blob không được kích hoạt khi tự host) ──
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server.js ./server.js
ENV PORT=8080
EXPOSE 8080
VOLUME ["/app/.data"]
CMD ["node", "server.js"]
