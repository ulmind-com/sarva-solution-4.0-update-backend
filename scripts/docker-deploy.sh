#!/bin/bash

# Default image name
IMAGE_NAME="sarvasolution_backend"

# Help function
show_help() {
    echo "Usage: ./scripts/docker-deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  build       Build the Docker image"
    echo "  run         Run the Docker container locally (uses .env)"
    echo "  push <user> Tag and push the image to Docker Hub (requires username)"
    echo "  help        Show this help message"
}

# Check if no arguments provided
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

case "$1" in
    build)
        echo "Building Docker image..."
        docker build -t $IMAGE_NAME .
        ;;
    run)
        echo "Running Docker container..."
        if [ ! -f .env ]; then
            echo "Error: .env file not found!"
            exit 1
        fi
        docker run --env-file .env -p 8000:8000 $IMAGE_NAME
        ;;
    push)
        if [ -z "$2" ]; then
            echo "Error: Please provide your Docker Hub username."
            echo "Usage: ./scripts/docker-deploy.sh push <your-docker-hub-username>"
            exit 1
        fi
        DOCKER_USER=$2
        echo "Tagging image for $DOCKER_USER..."
        docker tag $IMAGE_NAME $DOCKER_USER/$IMAGE_NAME:latest
        
        echo "Pushing image to Docker Hub..."
        docker push $DOCKER_USER/$IMAGE_NAME:latest
        echo "Done! Image pushed to: $DOCKER_USER/$IMAGE_NAME:latest"
        ;;
    *)
        show_help
        ;;
esac
