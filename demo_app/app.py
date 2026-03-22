from flask import Flask
from flask_cors import CORS
import logging
import time
import random
import os

app = Flask(__name__)
CORS(app)

LOG_DIR = "/app/logs"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "app.log")

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
