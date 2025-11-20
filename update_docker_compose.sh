#!/bin/bash

# Add extra_hosts to services that don't have it
services=(
    "user-service"
    "chat-service"
    "tracing-service"
    "admin-service"
    "worker-service"
    "celery-beat"
    "worker-api"
    "llm-proxy-service"
    "flower"
)

docker_compose="/home/aidivn/A2A-Agent-Platform/repos/infra/docker-compose.yml"

for service in "${services[@]}"; do
    # Check if service already has extra_hosts
    if ! grep -A2 "container_name: a2g-$service" "$docker_compose" | grep -q "extra_hosts:"; then
        echo "Adding extra_hosts to $service"
        # Find the line with networks: for this service and add extra_hosts before it
        sed -i "/container_name: a2g-$service/,/networks:/ {
            /networks:/ i\\    extra_hosts:\\
    - \"host.docker.internal:host-gateway\"
        }" "$docker_compose"
    fi
done

echo "Done updating docker-compose.yml"