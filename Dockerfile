# Simple container for the HTTPS Express proxy/server
# Use a small Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install only production dependencies first (leverage caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Optional port number: can be overridden at build or run time
# Build-time default
ARG PORT=8080
# Runtime default (can be overridden with -e PORT=8443)
ENV PORT=${PORT}

# Expose the port (informational)
EXPOSE ${PORT}

# Healthcheck using HTTP
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:${PORT}/health || exit 1

# Start server
CMD ["npm", "start"]
