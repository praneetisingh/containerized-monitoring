from flask import Flask, jsonify, request
from flask_cors import CORS
from flasgger import Swagger
from collections import Counter
import os
import re

app = Flask(__name__)
CORS(app)
Swagger(app, template={
    "info": {
        "title": "Monitoring API",
        "description": "Telemetry and logging API for parsing system events.",
        "version": "1.0.0"
    }
})

# Path to the log file created by demo_app (mounted via Docker volume)
LOG_FILE = os.environ.get("LOG_FILE", "/app/logs/app.log")

def read_logs(limit=50):
    if not os.path.exists(LOG_FILE):
        return []

    with open(LOG_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    return [line.strip() for line in lines[-limit:]]

def count_levels(lines):
    counts = Counter()
    for line in lines:
        if " INFO " in line:
            counts["INFO"] += 1
        elif " WARNING " in line:
            counts["WARNING"] += 1
        elif " ERROR " in line:
            counts["ERROR"] += 1
        elif " CRITICAL " in line:
            counts["CRITICAL"] += 1
    return counts

def parse_log_counts():
    """Parses the log file and returns counts of each level."""
    counts = {"INFO": 0, "WARNING": 0, "ERROR": 0, "CRITICAL": 0}
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            content = f.read()
            for level in counts.keys():
                counts[level] = len(re.findall(fr" {level} ", content))
    except FileNotFoundError:
        pass
    return counts

@app.route("/logs")
def logs():
    """
    Retrieve system logs
    ---
    parameters:
      - name: search
        in: query
        type: string
        required: false
        description: Text to filter logs by
    responses:
      200:
        description: A list of log strings
    """
    # Allow filtering by a search query
    search = request.args.get('search', '', type=str).lower()
    
    lines = read_logs(limit=500) # Fetch more lines if we need to filter
    if search:
        lines = [line for line in lines if search in line.lower()]
        
    return jsonify(lines[-50:])

@app.route("/logs/<level>")
def logs_by_level(level):
    """
    Retrieve logs by severity level
    ---
    parameters:
      - name: level
        in: path
        type: string
        required: true
        description: Severity level (e.g., info, error, critical)
    responses:
      200:
        description: A list of log strings matching the level
    """
    level = level.upper()
    lines = read_logs(limit=500)
    filtered = [line for line in lines if f" {level} " in line]
    return jsonify(filtered[-50:])

@app.route("/summary")
def summary():
    """
    Get log metric summary
    ---
    responses:
      200:
        description: A dictionary of log counts by level
    """
    lines = read_logs(limit=500)
    counts = count_levels(lines)
    return jsonify(counts)

@app.route("/api/summary")
def get_summary():
    """
    Get analytics summary with health score
    """
    data = parse_log_counts()
    total_logs = sum(data.values())
    health_score = 100

    if total_logs > 0:
        health_score = max(0, 100 - (data["ERROR"] * 10) - (data["CRITICAL"] * 20))

    return jsonify({
        "stats": data,
        "health_score": f"{health_score}%",
        "status": "Healthy" if health_score > 70 else "Unstable"
    })

@app.route("/logs", methods=["DELETE"])
def clear_logs():
    """
    Erase all system logs
    ---
    responses:
      200:
        description: Status message indicating logs were cleared
    """
    if os.path.exists(LOG_FILE):
        open(LOG_FILE, "w").close()
    return jsonify({"status": "cleared"}), 200

@app.route("/")
def home():
    return "Monitoring API Running ✅"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
