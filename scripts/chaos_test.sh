#!/bin/bash
# Chaos Engineering Script
# Randomly stops a target microservice container temporarily to test Resilience.

CONTAINERS=("containerized-monitoring-user_service-1" "containerized-monitoring-order_service-1" "containerized-monitoring-monitor_api-1")

echo "======================================"
echo "🤖 CHAOS ENGINE INITIATED"
echo "======================================"
echo "Targeting microservices..."

while true; do
    # Select random container
    TARGET=${CONTAINERS[$RANDOM % ${#CONTAINERS[@]}]}
    
    echo "⚡ INJECTING FAULT: Shutting down $TARGET..."
    docker stop $TARGET > /dev/null 2>&1
    
    # Keep it dead for a random duration (4 to 10 seconds)
    DOWNTIME=$(( ( RANDOM % 6 )  + 4 ))
    echo "💀 $TARGET is offline for $DOWNTIME seconds. Watch your Dashboard Graph!"
    sleep $DOWNTIME
    
    echo "⚕️ RECOVERING: Restarting $TARGET..."
    docker start $TARGET > /dev/null 2>&1
    
    # Wait before next attack
    WAIT_TIME=$(( ( RANDOM % 8 )  + 5 ))
    echo "⏳ Chaos pausing for $WAIT_TIME seconds..."
    sleep $WAIT_TIME
done
