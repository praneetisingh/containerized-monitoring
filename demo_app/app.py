from flask import Flask
import logging
import time

app = Flask(__name__)

logging.basicConfig(
    filename="app.log",
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

@app.route("/crash")
def crash():
    logging.error("Application crashed intentionally")
    raise Exception("Crash")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
