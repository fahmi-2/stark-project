#!/bin/bash
# Stark Project - Docker Management Script (Bash)
# Usage: ./start.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

show_help() {
    echo ""
    echo -e "${CYAN}Stark Project - Docker Management${NC}"
    echo -e "${CYAN}==================================${NC}"
    echo ""
    echo -e "${YELLOW}Usage: ./start.sh [command]${NC}"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  up         - Start all services"
    echo "  down       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  rebuild    - Rebuild and restart all services"
    echo "  logs       - View logs (follow mode)"
    echo "  status     - Show container status"
    echo "  clean      - Remove all containers, images, and volumes"
    echo "  network    - Create caddy network if not exists"
    echo "  help       - Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./start.sh up"
    echo "  ./start.sh logs"
    echo "  ./start.sh rebuild"
    echo ""
}

start_services() {
    echo -e "${GREEN}Starting Stark Project services...${NC}"
    docker-compose up -d
    echo ""
    echo -e "${GREEN}Services started!${NC}"
    echo -e "${CYAN}Frontend: http://localhost:800${NC}"
    echo -e "${CYAN}Backend:  http://localhost:801${NC}"
    echo -e "${CYAN}API Docs: http://localhost:801/docs${NC}"
}

stop_services() {
    echo -e "${YELLOW}Stopping Stark Project services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped!${NC}"
}

restart_services() {
    echo -e "${YELLOW}Restarting Stark Project services...${NC}"
    docker-compose restart
    echo -e "${GREEN}Services restarted!${NC}"
}

rebuild_services() {
    echo -e "${YELLOW}Rebuilding Stark Project services...${NC}"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo ""
    echo -e "${GREEN}Services rebuilt and started!${NC}"
    echo -e "${CYAN}Frontend: http://localhost:800${NC}"
    echo -e "${CYAN}Backend:  http://localhost:801${NC}"
}

show_logs() {
    echo -e "${CYAN}Showing logs (press Ctrl+C to exit)...${NC}"
    docker-compose logs -f
}

show_status() {
    echo -e "${CYAN}Container Status:${NC}"
    echo ""
    docker-compose ps
    echo ""
    echo -e "${CYAN}Docker Stats:${NC}"
    docker stats --no-stream stark-frontend stark-backend
}

clean_all() {
    echo -e "${RED}WARNING: This will remove all containers, images, and volumes!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" == "yes" ]; then
        echo -e "${YELLOW}Cleaning up...${NC}"
        docker-compose down -v --rmi all
        echo -e "${GREEN}Cleanup complete!${NC}"
    else
        echo -e "${YELLOW}Cleanup cancelled.${NC}"
    fi
}

create_network() {
    echo -e "${CYAN}Creating caddy network...${NC}"
    
    if docker network ls | grep -q caddy; then
        echo -e "${YELLOW}Network 'caddy' already exists.${NC}"
    else
        docker network create caddy
        echo -e "${GREEN}Network 'caddy' created!${NC}"
    fi
}

# Main script execution
COMMAND=${1:-help}

case $COMMAND in
    up)
        start_services
        ;;
    down)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    rebuild)
        rebuild_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    network)
        create_network
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
