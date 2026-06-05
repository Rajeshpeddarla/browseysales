FROM node:20-slim

# Install system dependencies for Playwright (headless browser)
RUN apt-get update && apt-get install -y \
    libvips-dev \
    # Webkit/Chromium dependencies for playwright
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libglib2.0-0 \
    libxrandr2 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    # Required for Playwright downloads
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Install playwright browsers
RUN npx playwright install chromium --with-deps

# Copy all files
COPY . .

# Environment variables
ENV NODE_ENV=development
# Prevent Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["npm", "run", "dev"]
