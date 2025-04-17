FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

RUN npm run build

# Expose port
EXPOSE 4173

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:4173 || exit 1

# Start the preview server and allow external connections
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]