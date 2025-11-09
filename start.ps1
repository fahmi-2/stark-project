# Stark Project - Docker Management Script (PowerShell)
# Usage: .\start.ps1 [command]

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host ""
    Write-Host "Stark Project - Docker Management" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\start.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  up         - Start all services"
    Write-Host "  down       - Stop all services"
    Write-Host "  restart    - Restart all services"
    Write-Host "  rebuild    - Rebuild and restart all services"
    Write-Host "  logs       - View logs (follow mode)"
    Write-Host "  status     - Show container status"
    Write-Host "  clean      - Remove all containers, images, and volumes"
    Write-Host "  network    - Create caddy network if not exists"
    Write-Host "  help       - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\start.ps1 up"
    Write-Host "  .\start.ps1 logs"
    Write-Host "  .\start.ps1 rebuild"
    Write-Host ""
}

function Start-Services {
    Write-Host "Starting Stark Project services..." -ForegroundColor Green
    docker-compose up -d
    Write-Host ""
    Write-Host "Services started!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:800" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:801" -ForegroundColor Cyan
    Write-Host "API Docs: http://localhost:801/docs" -ForegroundColor Cyan
}

function Stop-Services {
    Write-Host "Stopping Stark Project services..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "Services stopped!" -ForegroundColor Green
}

function Restart-Services {
    Write-Host "Restarting Stark Project services..." -ForegroundColor Yellow
    docker-compose restart
    Write-Host "Services restarted!" -ForegroundColor Green
}

function Rebuild-Services {
    Write-Host "Rebuilding Stark Project services..." -ForegroundColor Yellow
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    Write-Host ""
    Write-Host "Services rebuilt and started!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:800" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:801" -ForegroundColor Cyan
}

function Show-Logs {
    Write-Host "Showing logs (press Ctrl+C to exit)..." -ForegroundColor Cyan
    docker-compose logs -f
}

function Show-Status {
    Write-Host "Container Status:" -ForegroundColor Cyan
    Write-Host ""
    docker-compose ps
    Write-Host ""
    Write-Host "Docker Stats:" -ForegroundColor Cyan
    docker stats --no-stream stark-frontend stark-backend
}

function Clean-All {
    Write-Host "WARNING: This will remove all containers, images, and volumes!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -eq "yes") {
        Write-Host "Cleaning up..." -ForegroundColor Yellow
        docker-compose down -v --rmi all
        Write-Host "Cleanup complete!" -ForegroundColor Green
    } else {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    }
}

function Create-Network {
    Write-Host "Creating caddy network..." -ForegroundColor Cyan
    
    $networkExists = docker network ls --filter name=caddy -q
    
    if ($networkExists) {
        Write-Host "Network 'caddy' already exists." -ForegroundColor Yellow
    } else {
        docker network create caddy
        Write-Host "Network 'caddy' created!" -ForegroundColor Green
    }
}

# Main script execution
switch ($Command.ToLower()) {
    "up" {
        Start-Services
    }
    "down" {
        Stop-Services
    }
    "restart" {
        Restart-Services
    }
    "rebuild" {
        Rebuild-Services
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "clean" {
        Clean-All
    }
    "network" {
        Create-Network
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
