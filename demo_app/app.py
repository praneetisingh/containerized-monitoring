from flask import Flask
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler
import time
import random
import os
import psutil
import requests

app = Flask(__name__)
CORS(app)

# Use a local 'logs' folder if we aren't in the Docker '/app' directory
LOG_DIR = os.environ.get("LOG_DIR", "logs") 
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.environ.get("LOG_FILE", os.path.join(LOG_DIR, "app.log"))
MONITOR_API_URL = os.environ.get("MONITOR_API_URL", "http://monitor_api:8000")

class NetworkLogHandler(logging.Handler):
    def emit(self, record):
        log_entry = self.format(record)
        try:
            requests.post(f"{MONITOR_API_URL}/logs/ingest", json={"log": log_entry}, timeout=1)
        except Exception:
            pass

# Setup Production-Grade Log Rotation (100KB max per file, keep 3 backups)
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
handler = RotatingFileHandler(LOG_FILE, maxBytes=100000, backupCount=3)
formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
handler.setFormatter(formatter)
root_logger.addHandler(handler)

network_handler = NetworkLogHandler()
network_handler.setFormatter(formatter)
root_logger.addHandler(network_handler)

@app.route("/")
def home():
    return """
    <html>
        <head>
            <title>Buggy E-Commerce Store</title>
            <style>
                body { font-family: sans-serif; padding: 40px; background: #f0f4f8; }
                .btn { padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>Nexus Demo Target (Buggy Website)</h1>
            <p>Welcome to our totally functional website! Install the Chrome Extension, then click below to trigger a bug.</p>
            <button class="btn" onclick="triggerBug()">Checkout (Will produce JS Error)</button>
            <script>
                function triggerBug() {
                    console.log("Attempting checkout...");
                    // This creates an intentional Uncaught TypeError in JavaScript!
                    const user = null;
                    console.log(user.creditCardNumber); 
                }
            </script>
        </body>
    </html>
    """

@app.route("/success")
def success():
    logging.info("Success request received")
    return "Success"

@app.route("/error")
def error():
    logging.error("Invalid input error")
    return "Error", 400

@app.route("/slow")
def slow():
    logging.warning("Slow response warning")
    time.sleep(2)
    return "Slow response"


@app.route("/random")
def random_event():
    event = random.choice(["info", "warning", "error"])
    
    if event == "info":
        logging.info("Random info event generated")
        return "INFO event"

    elif event == "warning":
        logging.warning("Random warning generated")
        return "WARNING event"

    else:
        logging.error("Random error generated")
        return "ERROR event", 500


request_count = 0

@app.route("/load")
def load():
    global request_count
    request_count += 1
    logging.info(f"Load request number {request_count}")
    return f"Request number {request_count}"

start_time = time.time()

@app.route("/health")
def health():
    logging.info("Health check endpoint called")
    return {"status": "application running"}

@app.route("/uptime")
def uptime():
    current = time.time() - start_time
    logging.info(f"Uptime checked: {current}")
    return {"uptime_seconds": int(current)}

@app.route("/crash")
def crash():
    try:
        raise Exception("Crash simulation")
    except Exception as e:
        logging.critical(f"Application crash simulated: {str(e)}")
        return "Crash simulated", 500

@app.route("/metrics")
def metrics():
    return {
        "cpu": psutil.cpu_percent(interval=0.1),
        "ram": psutil.virtual_memory().percent
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
