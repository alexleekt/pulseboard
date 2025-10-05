#!/bin/bash

# ChromaDB Management Script for TeamCards

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CHROMA_DATA_DIR="$PROJECT_DIR/data/chroma"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed."
        echo ""
        echo "Please install Docker first:"
        echo "  macOS: https://docs.docker.com/desktop/install/mac-install/"
        echo "  Linux: https://docs.docker.com/engine/install/"
        echo "  Windows: https://docs.docker.com/desktop/install/windows-install/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available."
        echo ""
        echo "Please install Docker Compose or update Docker to include the 'docker compose' command."
        exit 1
    fi
}

# Create data directory if it doesn't exist
ensure_data_dir() {
    if [ ! -d "$CHROMA_DATA_DIR" ]; then
        print_info "Creating ChromaDB data directory at $CHROMA_DATA_DIR"
        mkdir -p "$CHROMA_DATA_DIR"
        print_success "Data directory created"
    fi
}

# Start ChromaDB
start_chromadb() {
    print_info "Starting ChromaDB..."

    ensure_data_dir

    cd "$PROJECT_DIR"

    # Try docker compose first, fall back to docker-compose
    if docker compose version &> /dev/null; then
        docker compose up -d chromadb
    else
        docker-compose up -d chromadb
    fi

    print_success "ChromaDB started successfully"
    print_info "ChromaDB is running at http://localhost:8000"
    print_info "Data is stored in $CHROMA_DATA_DIR"
}

# Stop ChromaDB
stop_chromadb() {
    print_info "Stopping ChromaDB..."

    cd "$PROJECT_DIR"

    if docker compose version &> /dev/null; then
        docker compose stop chromadb
    else
        docker-compose stop chromadb
    fi

    print_success "ChromaDB stopped"
}

# Restart ChromaDB
restart_chromadb() {
    stop_chromadb
    start_chromadb
}

# Show ChromaDB status
status_chromadb() {
    if docker ps --filter "name=teamcards-chromadb" --filter "status=running" | grep -q teamcards-chromadb; then
        print_success "ChromaDB is running"
        echo ""
        docker ps --filter "name=teamcards-chromadb" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        print_warning "ChromaDB is not running"
    fi
}

# Show ChromaDB logs
logs_chromadb() {
    cd "$PROJECT_DIR"

    if docker compose version &> /dev/null; then
        docker compose logs -f chromadb
    else
        docker-compose logs -f chromadb
    fi
}

# Remove ChromaDB container and data
clean_chromadb() {
    print_warning "This will remove the ChromaDB container and ALL data!"
    read -p "Are you sure? (yes/no): " -n 3 -r
    echo

    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        cd "$PROJECT_DIR"

        print_info "Stopping and removing ChromaDB container..."
        if docker compose version &> /dev/null; then
            docker compose down chromadb
        else
            docker-compose down chromadb
        fi

        print_info "Removing data directory..."
        rm -rf "$CHROMA_DATA_DIR"

        print_success "ChromaDB cleaned successfully"
    else
        print_info "Clean operation cancelled"
    fi
}

# Show help
show_help() {
    echo "ChromaDB Management Script for TeamCards"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start ChromaDB container"
    echo "  stop      Stop ChromaDB container"
    echo "  restart   Restart ChromaDB container"
    echo "  status    Show ChromaDB container status"
    echo "  logs      Show ChromaDB logs (press Ctrl+C to exit)"
    echo "  clean     Remove ChromaDB container and data"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs"
}

# Main script
main() {
    # Check Docker installation first
    check_docker

    case "${1:-}" in
        start)
            start_chromadb
            ;;
        stop)
            stop_chromadb
            ;;
        restart)
            restart_chromadb
            ;;
        status)
            status_chromadb
            ;;
        logs)
            logs_chromadb
            ;;
        clean)
            clean_chromadb
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
