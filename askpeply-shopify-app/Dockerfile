FROM node:22-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./

# Build tools (vite etc.) are dev dependencies, so install everything,
# build, then drop the dev packages to keep the image small.
RUN npm ci --include=dev

COPY . .

RUN npx prisma generate && npm run build && npm prune --omit=dev && npm cache clean --force

CMD ["npm", "run", "docker-start"]
