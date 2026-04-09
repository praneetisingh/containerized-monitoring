import os
import time
import random
import subprocess

containers = [
    "containerized-monitoring-user_service-1",
    "containerized-monitoring-order_service-1",
    "containerized-monitoring-monitor_api-1"
]

print("======================================")
print("🤖 CHAOS ENGINE INITIATED")
print("======================================")
print("Targeting microservices...")

while True:
    target = random.choice(containers)
    print(f"\n⚡ INJECTING FAULT: Shutting down {target}...")
    subprocess.run(["docker", "stop", target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    downtime = random.randint(4, 10)
    print(f"💀 {target} is offline for {downtime} seconds. Watch your Dashboard Graph!")
    time.sleep(downtime)
    
    print(f"⚕️ RECOVERING: Restarting {target}...")
    subprocess.run(["docker", "start", target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    wait_time = random.randint(5, 12)
    print(f"⏳ Chaos pausing for {wait_time} seconds before the next strike...\n")
    time.sleep(wait_time)
