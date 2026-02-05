# MLCommons Firehose Indexer Dockerfile
# For Railway deployment

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S indexer -u 1001
USER indexer

# Start the indexer
CMD ["npm", "start"]
