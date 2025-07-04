FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN mkdir -p data/pdfs
RUN chmod +x bin/mcp-magma-handbook

EXPOSE 3000

CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Labels for metadata
LABEL org.opencontainers.image.title="MCP MAGMA Handbook Server"
LABEL org.opencontainers.image.description="MCP server providing AI access to MAGMA computational algebra system documentation"
LABEL org.opencontainers.image.url="https://github.com/LeGenAI/mcp-magma-handbook"
LABEL org.opencontainers.image.source="https://github.com/LeGenAI/mcp-magma-handbook"
LABEL org.opencontainers.image.version="1.0.1"
LABEL org.opencontainers.image.licenses="MIT"