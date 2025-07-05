FROM node:22-slim

WORKDIR /app

# Copy all files first for Smithery build process
COPY . .

# Install dependencies (if package.json exists)
RUN if [ -f package.json ]; then npm ci; fi

# Build the Smithery MCP server using their CLI
RUN npx -y @smithery/cli@1.2.9 build -o .smithery/index.cjs

# Expose port for Smithery
EXPOSE 8080

# Start the built Smithery server
CMD ["node", ".smithery/index.cjs"]