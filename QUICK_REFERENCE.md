# Quick Reference Guide - MarketForge Pro

## Common Commands

### Development

```bash
# Start both servers
bash start-servers.sh

# Backend only
source venv/bin/activate
uvicorn backend.api.main:app --reload

# Frontend only
npm run dev

# Electron desktop app
npm run dev:electron
```

### Building

```bash
# Frontend production build
npm run build

# Windows installer
bash build-windows.sh

# Docker image
docker build -t marketforge-pro .

# All platforms (Electron)
npm run build:all
```

### Testing

```bash
# Backend tests
pytest backend/tests/ --cov=backend

# Frontend tests
npm test

# Linting
npm run lint
black backend/
```

### Docker

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose build --no-cache
```

---

## File Locations

### Configuration
- **Backend env**: `.env`
- **Frontend env**: `.env.local`
- **Database**: `./marketforge.db`
- **Electron config**: `electron-builder.yml`

### Important Files
- **Backend entry**: `backend/api/main.py`
- **Frontend entry**: `frontend/src/App.tsx`
- **Electron main**: `electron/main.js`
- **Setup wizard**: `electron/wizard/setup.html`

### Logs
- **Backend**: `/tmp/marketforge-backend.log`
- **Frontend**: `/tmp/marketforge-frontend.log`

---

## URLs

### Development
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

### Production (Docker)
- **App**: http://localhost:80
- **API**: http://localhost:8000

---

## Environment Variables

### Core Settings
```env
APP_ENV=development
DEBUG=true
LOG_LEVEL=INFO
```

### Server
```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### Features
```env
ENABLE_BROKERS=false
ENABLE_RESONANCE=true
ENABLE_ML_STRATEGIES=true
```

### API Keys (Optional)
```env
COINGECKO_API_KEY=your_key
KRAKEN_API_KEY=your_key
KRAKEN_API_SECRET=your_secret
```

---

## Database Operations

### Reset Database
```bash
# WARNING: Deletes all data
rm marketforge.db
# Restart backend to recreate
```

### Switch to PostgreSQL
```env
DATABASE_URL=postgresql://user:pass@localhost/marketforge
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti :8000 | xargs kill -9

# Kill process on port 3000
lsof -ti :3000 | xargs kill -9
```

### Virtual Environment Not Found
```bash
# Create new venv
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Module Not Found
```bash
# Backend
source venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
```

### TA-Lib Not Found
```bash
# Ubuntu/Debian
sudo apt-get install build-essential
wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz
tar -xzf ta-lib-0.4.0-src.tar.gz
cd ta-lib
./configure --prefix=/usr
make && sudo make install
sudo ldconfig

# macOS
brew install ta-lib
```

---

## Git Workflow

### Setup
```bash
git clone https://github.com/marketforge-pro/marketforge-pro.git
cd marketforge-pro
git submodule update --init --recursive
```

### Pre-commit Hooks
```bash
pip install pre-commit
pre-commit install
```

### Commit
```bash
# Format: type(scope): subject
git commit -m "feat(api): add new endpoint"
git commit -m "fix(ui): resolve chart rendering bug"
git commit -m "docs: update installation guide"
```

---

## Keyboard Shortcuts (Future)

*To be implemented in frontend Phase 2*

---

## API Endpoints

### Chart Data
- `GET /api/chart/data?symbol=bitcoin&timeframe=1h`

### Paper Trading
- `GET /api/paper-trading/balance`
- `POST /api/paper-trading/trade`
- `GET /api/paper-trading/trades`
- `GET /api/paper-trading/positions`

### Pine Script
- `GET /api/pinescript/examples`
- `POST /api/pinescript/translate`
- `POST /api/pinescript/execute`

### Strategies
- `GET /api/strategy/list`
- `POST /api/strategy/create`
- `PUT /api/strategy/update/{id}`
- `DELETE /api/strategy/delete/{id}`

### System
- `GET /` - API info
- `GET /api/health` - Health check

---

## File Structure

```
marketforge-pro/
├── backend/           # Python backend
├── frontend/          # React frontend
├── electron/          # Electron desktop app
├── docs/              # Documentation
├── scripts/           # Build scripts
├── .github/           # CI/CD workflows
├── .env               # Backend environment
├── .env.local         # Frontend environment
└── marketforge.db     # SQLite database
```

---

## Performance Tuning

### Backend
```env
MAX_CHART_CANDLES=5000      # Lower for faster response
ENABLE_CHART_CACHE=true     # Enable caching
```

### Frontend
```typescript
// In vite.config.ts
build: {
  chunkSizeWarningLimit: 1000,
  rollupOptions: {
    output: {
      manualChunks: { /* ... */ }
    }
  }
}
```

---

## Security Checklist

- [ ] Never commit `.env` file
- [ ] Use read-only API keys when possible
- [ ] Rotate API keys regularly
- [ ] Enable rate limiting in production
- [ ] Use HTTPS in production
- [ ] Update dependencies regularly
- [ ] Run `npm audit` and `safety check`
- [ ] Change Electron encryption key

---

## Support

- **Documentation**: See README.md, INSTALL.md
- **Issues**: https://github.com/marketforge-pro/marketforge-pro/issues
- **Security**: security@marketforge-pro.com

---

**Last Updated**: 2025-01-XX
