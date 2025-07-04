# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create data directory for PDFs
RUN mkdir -p data/pdfs

# Make binary executable
RUN chmod +x bin/mcp-magma-handbook

# Expose port (if needed for web interface in future)
EXPOSE 3000

# Set default command
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