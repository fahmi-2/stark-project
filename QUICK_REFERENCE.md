# Stark Project - Quick Reference

## 🚀 Quick Start

```bash
# Create caddy network (first time only)
docker network create caddy

# Start services
docker-compose up -d

# Access:
# - Frontend: http://localhost:800
# - Backend:  http://localhost:801
# - API Docs: http://localhost:801/docs
```

## 📋 Common Commands

### Using Scripts (Recommended)

**Windows (PowerShell):**

```powershell
.\start.ps1 up        # Start services
.\start.ps1 down      # Stop services
.\start.ps1 logs      # View logs
.\start.ps1 rebuild   # Rebuild everything
.\start.ps1 status    # Check status
.\start.ps1 clean     # Clean everything
.\start.ps1 network   # Create network
```

**Linux/Mac (Bash):**

```bash
chmod +x start.sh     # Make executable (first time only)
./start.sh up         # Start services
./start.sh down       # Stop services
./start.sh logs       # View logs
./start.sh rebuild    # Rebuild everything
./start.sh status     # Check status
./start.sh clean      # Clean everything
./start.sh network    # Create network
```

### Manual Docker Compose

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Rebuild
docker-compose build --no-cache
docker-compose up -d

# Logs
docker-compose logs -f

# Status
docker-compose ps
```

## 🔧 Configuration

### Change API URL

1. **Edit `frontend/.env`:**

```env
REACT_APP_API_URL=https://your-backend-domain.com
```

2. **Edit `docker-compose.yml`:**

```yaml
frontend:
  build:
    args:
      - REACT_APP_API_URL=https://your-backend-domain.com
  environment:
    - REACT_APP_API_URL=https://your-backend-domain.com
```

3. **Rebuild:**

```bash
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Change Ports

Edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "YOUR_PORT:3000"

backend:
  ports:
    - "YOUR_PORT:8000"
```

## 🐛 Quick Troubleshooting

### Environment Variable Not Working

```bash
# Check if set
docker exec stark-frontend env | grep REACT_APP

# Force rebuild
docker-compose down
docker rmi stark-frontend
docker-compose build --no-cache frontend
docker-compose up -d

# Clear browser cache!
```

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :800
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :800
kill -9 <PID>
```

### Container Won't Start

```bash
# Check logs
docker-compose logs frontend
docker-compose logs backend

# Clean rebuild
docker-compose down -v --rmi all
docker-compose build --no-cache
docker-compose up -d
```

### Network Not Found

```bash
docker network create caddy
```

## 📊 Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service with tail
docker-compose logs -f --tail=100 frontend
docker-compose logs -f --tail=100 backend
```

### Check Status

```bash
docker ps
docker-compose ps
docker stats stark-frontend stark-backend
```

### Access Container Shell

```bash
docker exec -it stark-frontend sh
docker exec -it stark-backend sh
```

### Check Environment

```bash
docker exec stark-frontend env | grep REACT_APP
docker exec stark-backend env
```

### Network Debugging

```bash
docker network ls
docker network inspect caddy
docker exec stark-frontend ping stark-backend
```

## 🚢 Production Deployment

```bash
# 1. Update environment variables
# 2. Create caddy network
docker network create caddy

# 3. Deploy
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Verify
docker-compose ps
docker-compose logs -f
```

## 📝 File Locations

- **Frontend Code**: `frontend/src/`
- **Backend Code**: `backend/main.py`
- **Data Files**: `backend/data/`
- **Environment**: `frontend/.env`
- **Docker Config**: `docker-compose.yml`
- **Frontend Dockerfile**: `frontend/Dockerfile`
- **Backend Dockerfile**: `backend/Dockerfile`

## 🔗 Important URLs

- **Frontend**: http://localhost:800
- **Backend API**: http://localhost:801
- **API Docs (Swagger)**: http://localhost:801/docs
- **API Docs (ReDoc)**: http://localhost:801/redoc

## ⚡ Pro Tips

1. Always rebuild after changing environment variables
2. Clear browser cache after frontend rebuild
3. Use `--no-cache` flag for clean builds
4. Check logs when debugging issues
5. Verify environment variables in containers
6. Use external caddy network for reverse proxy
7. Keep frontend/.env and docker-compose.yml in sync
