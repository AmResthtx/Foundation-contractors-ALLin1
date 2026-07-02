FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY hermes ./hermes

ENV NODE_ENV=production \
    DB_PATH=/app/data

# Marks the container unhealthy in `docker ps`; the process's own watchdog
# exits on stall and the restart policy relaunches it.
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD ["node", "hermes/healthcheck.js"]

CMD ["node", "hermes/index.js"]
