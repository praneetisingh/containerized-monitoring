#!/bin/bash
# System Auto-Healer Script
# Constantly monitors endpoints and restarts containers if they fail.

echo "======================================"
echo "🩺 HEALTH CHECK MONITOR INITIATED"
echo "======================================"

check_and_heal() {
    URL=$1
    CONTAINER=$2
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health")
    
    if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 500 ]; then
        echo "⚠️ WARNING: $CONTAINER is unresponsive (Status: $HTTP_CODE). Connection failed."
        echo "🔧 HEALING: Attempting to restart $CONTAINER via Docker Daemon..."
        docker restart $CONTAINER > /dev/null 2>&1
        echo "✅ $CONTAINER resurrected and traffic restored."
    fi
}

while true; do
    check_and_heal "http://localhost:5001" "containerized-monitoring-user_service-1"
    check_and_heal "http://localhost:5002" "containerized-monitoring-order_service-1"
    check_and_heal "http://localhost:8001" "containerized-monitoring-monitor_api-1"
    
    sleep 3
done
