# Build stage
FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm ci --only=production && \
    npm run build && \
    rm -rf src node_modules

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Labels para rastreabilidade (preenchidos pelo pipeline CodeBuild via ARG)
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.url="https://github.com/kiro-loja/kiro-loja-catalogo" \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.vendor="Kiro"

COPY package*.json ./
COPY --from=builder /build/dist ./dist

RUN npm ci --only=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

CMD ["npm", "start"]
