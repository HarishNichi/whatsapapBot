FROM node:20-slim

# Install system dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libfreetype6 \
    libfreetype6-dev \
    libharfbuzz-bin \
    ca-certificates \
    fonts-freefont-ttf \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Set env vars for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source
COPY src ./src
COPY .env ./

# Build
RUN npm run build

# Start
CMD ["npm", "start"]
