FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=5100
EXPOSE 5100

CMD ["node", "server.js"]
