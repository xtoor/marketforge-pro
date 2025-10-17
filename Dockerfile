# MarketForge Pro - Production Docker Image
# Multi-stage build for optimized image size

# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./frontend/
COPY tsconfig.json vite.config.ts ./

# Build frontend
RUN npm run build

# Stage 2: Backend Dependencies
FROM python:3.11-slim AS backend-builder

WORKDIR /app

# Install system dependencies for TA-Lib
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install TA-Lib
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# Copy requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Production Image
FROM python:3.11-slim

LABEL maintainer="MarketForge Pro Team"
LABEL description="Advanced Financial Visualization Platform"

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy TA-Lib from builder
COPY --from=backend-builder /usr/lib/libta_lib.* /usr/lib/
RUN ldconfig

# Copy Python dependencies
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy backend application
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/dist ./dist

# Create directory for database
RUN mkdir -p /data

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DATABASE_URL=sqlite:////data/marketforge.db \
    APP_ENV=production \
    DEBUG=false

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
