# Stark Project

A full-stack data analytics application built with FastAPI (Python) backend and React frontend, containerized with Docker and deployed with Caddy reverse proxy.

## 🌟 Features

- **FastAPI Backend**: High-performance Python API with automatic documentation
- **React Frontend**: Modern, responsive SPA with data visualization
- **Data Analytics**: CSV data processing with Pandas
- **Dockerized**: Complete Docker setup for development and production
- **Caddy Integration**: External Caddy network for reverse proxy support
- **Production Build**: Optimized React build served with static file server
- **Environment Configuration**: Flexible API URL configuration

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v3.8+
- External Docker network named `caddy` (for reverse proxy integration)

### Setup External Network

```powershell
# Create the external caddy network (run once)
docker network create caddy
```

### Start the Application

**PowerShell (Windows):**

```powershell
# Navigate to project
cd stark-project

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Bash (Linux/Mac):**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access the Application

- **Frontend**: http://localhost:800
- **Backend API**: http://localhost:801
- **API Documentation**: http://localhost:801/docs

## 📁 Project Structure

```
stark-project/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Backend container config
│   └── data/               # CSV data files
│       ├── Data_FIXX_SU.csv
│       └── Data_SPC.csv
│
├── frontend/               # React frontend
│   ├── src/                # Source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── utils/         # Utilities (API client)
│   ├── public/            # Static files
│   ├── package.json       # Node dependencies
│   ├── Dockerfile         # Frontend container config
│   └── .env              # Environment variables
│
├── docker-compose.yml      # Production compose file
├── docker-compose.dev.yml  # Development compose file (optional)
├── start.ps1              # PowerShell start script
├── start.sh               # Bash start script
└── README.md              # This file
```

## 💻 Development & Production Commands

### PowerShell Scripts (Windows)

```powershell
# Start services
.\start.ps1 up

# Start with rebuild
.\start.ps1 rebuild

# Stop services
.\start.ps1 down

# View logs
.\start.ps1 logs

# Clean everything (remove containers, images, volumes)
.\start.ps1 clean

# Show help
.\start.ps1 help
```

### Bash Scripts (Linux/Mac)

```bash
# Start services
./start.sh up

# Start with rebuild
./start.sh rebuild

# Stop services
./start.sh down

# View logs
./start.sh logs

# Clean everything
./start.sh clean

# Show help
./start.sh help
```

### Manual Docker Compose Commands

```powershell
# Start services in detached mode
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f frontend
docker-compose logs -f backend

# Restart services
docker-compose restart

# Remove everything including volumes
docker-compose down -v --rmi all
```

## � Configuration

### Environment Variables

**Frontend** (`frontend/.env`):

```env
# Development (local)
REACT_APP_API_URL=http://localhost:801

# Production (deployed)
REACT_APP_API_URL=https://stark-backend.legain.id
```

## 🔍 API Endpoints

The backend provides RESTful endpoints for data analytics:

### Dashboard

- `GET /api/dashboard-metrics?years={years}` - Dashboard overview metrics
- `GET /api/monthly-demand?years={years}` - Monthly demand data
- `GET /api/category-and-top-items?years={years}` - Category analysis

### Item Analysis

- `GET /api/category-value/{year}` - Category value analysis
- `GET /api/category-unit/{year}` - Category unit analysis
- `GET /api/all-items/{year}` - All items list
- `GET /api/item-detail/{year}/{item}` - Item detail by year

### Time Analysis

- `GET /api/monthly-demand/{year}` - Monthly demand by year
- `GET /api/monthly-expenditure?years={years}` - Monthly expenditure

### Unit Analysis

- `GET /api/top-requesters?years={years}` - Top requesting units
- `GET /api/top-spending-units?years={years}` - Top spending units
- `GET /api/unit-scatter-data?years={years}` - Scatter plot data
- `GET /api/unit-pemohon-list` - List of all units
- `GET /api/unit-item-monthly?unit={unit}&year={year}` - Unit items by month
- `GET /api/data-radar?unit={unit}` - Radar chart data for unit

### Chatbot

- `GET /api/chatbot-query?question={question}` - Natural language queries

### Health Check

- `GET /` - API health check

**Full API Documentation**: http://localhost:801/docs (Swagger UI)

## 🚢 Deployment Guide

### Production Deployment Steps

1. **Configure Environment Variables**

Update `frontend/.env`:

```env
REACT_APP_API_URL=https://stark-backend.your-domain.com
```

Update `docker-compose.yml`:

```yaml
frontend:
  build:
    args:
      - REACT_APP_API_URL=https://stark-backend.your-domain.com
  environment:
    - REACT_APP_API_URL=https://stark-backend.your-domain.com
```

2. **Create External Caddy Network**

```bash
docker network create caddy
```

3. **Deploy with Docker Compose**

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

4. **Configure Caddy Reverse Proxy**

Example Caddyfile:

```caddyfile
# Frontend
your-frontend-domain.com {
    reverse_proxy stark-frontend:3000
}

# Backend API
your-backend-domain.com {
    reverse_proxy stark-backend:8000
}
```

5. **Verify Deployment**

```bash
# Check container status
docker ps

# Check logs
docker-compose logs -f

# Test API
curl https://your-backend-domain.com/
```

### Security Considerations

- ✅ Use HTTPS only (configured via Caddy)
- ✅ Update CORS settings in `backend/main.py`
- ✅ Set proper environment variables
- ✅ Use secrets for sensitive data
- ✅ Enable Docker resource limits
- ✅ Regular security updates

## 🐛 Troubleshooting

### Ports Already in Use

**PowerShell:**

```powershell
# Check what's using port 800 (frontend)
netstat -ano | findstr :800

# Check what's using port 801 (backend)
netstat -ano | findstr :801

# Kill process by PID
taskkill /PID <PID> /F
```

**Linux/Mac:**

```bash
# Check ports
lsof -i :800
lsof -i :801

# Kill process
kill -9 <PID>
```

### Container Won't Start

```powershell
# Check logs for errors
docker-compose logs frontend
docker-compose logs backend

# Rebuild from scratch
docker-compose down -v --rmi all
docker-compose build --no-cache
docker-compose up -d
```

### API Calls Failing / CORS Issues

1. Check backend is running: `curl http://localhost:801/`
2. Check CORS configuration in `backend/main.py`
3. Verify `REACT_APP_API_URL` is correct in frontend

### Environment Variables Not Working

```powershell
# Check if env vars are set in container
docker exec stark-frontend env | grep REACT_APP
docker exec stark-backend env

# Rebuild with no cache
docker-compose build --no-cache frontend
docker-compose up -d
```

### Frontend Shows "localhost:8000" Instead of Production URL

This means the environment variable wasn't baked into the build:

```powershell
# 1. Update frontend/.env
REACT_APP_API_URL=https://your-backend-domain.com

# 2. Update docker-compose.yml build args

# 3. Force rebuild
docker-compose down
docker rmi stark-frontend
docker-compose build --no-cache frontend
docker-compose up -d

# 4. Clear browser cache (Ctrl+Shift+Delete)
```

### Caddy Network Not Found

```powershell
# Create the external network
docker network create caddy

# Verify it exists
docker network ls
```

### Changes Not Reflecting

```powershell
# Full clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Clear browser cache
# Hard refresh: Ctrl+Shift+R or Ctrl+F5
```

### Database/CSV File Not Found

```powershell
# Check if data files exist
ls backend/data/

# Verify volume mounts in docker-compose.yml
docker-compose config

# Check container can access files
docker exec stark-backend ls -la /app/data/
```

## 📝 Common Tasks

### Update API URL

1. Edit `frontend/.env`
2. Edit `docker-compose.yml` (build args and environment)
3. Rebuild: `docker-compose build --no-cache frontend`
4. Restart: `docker-compose up -d`

### Add New Python Dependencies

1. Add package to `backend/requirements.txt`
2. Rebuild: `docker-compose build backend`
3. Restart: `docker-compose up -d`

### Add New NPM Dependencies

1. Add to `frontend/package.json` or run `npm install <package>` locally
2. Rebuild: `docker-compose build frontend`
3. Restart: `docker-compose up -d`

### Change Ports

Edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "NEW_PORT:3000" # Change NEW_PORT

backend:
  ports:
    - "NEW_PORT:8000" # Change NEW_PORT
```

Then: `docker-compose down && docker-compose up -d`
