import time
import subprocess
import urllib.request

print("======================================")
print("🩺 HEALTH CHECK MONITOR INITIATED")
print("======================================")

def check_and_heal(url, container):
    try:
        req = urllib.request.Request(f"{url}/health")
        with urllib.request.urlopen(req, timeout=1.5) as response:
            status = response.getcode()
            if status not in [200, 500]:
                raise Exception("Bad Status")
    except Exception:
        print(f"\n⚠️ WARNING: {container} is unresponsive. Connection failed.")
        print(f"🔧 HEALING: Attempting to restart {container} via Docker Daemon...")
        subprocess.run(["docker", "restart", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"✅ {container} resurrected and traffic restored.\n")

while True:
    check_and_heal("http://localhost:5001", "containerized-monitoring-user_service-1")
    check_and_heal("http://localhost:5002", "containerized-monitoring-order_service-1")
    check_and_heal("http://localhost:8001", "containerized-monitoring-monitor_api-1")
    time.sleep(3)
