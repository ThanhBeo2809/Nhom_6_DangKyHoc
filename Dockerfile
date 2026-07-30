FROM node:22-alpine

WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm ci --omit=dev --prefix backend

COPY --chown=node:node backend ./backend
COPY --chown=node:node frontend ./frontend
COPY --chown=node:node package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "backend/server.js"]
