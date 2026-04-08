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


# --- HELPER FUNCTIONS ---

def parse_log_line(line):
    """Helper to turn a raw log string into a dictionary using Regex"""
    # Pattern looks for: Timestamp - Level - Message
    pattern = r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*? - (\w+) - (.*)"
    match = re.search(pattern, line)
    if match:
        return {
            "timestamp": match.group(1),
            "level": match.group(2),
            "message": match.group(3).strip()
        }
    return None

def read_logs(limit=50):
    if not os.path.exists(LOG_FILE):
        return []
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return [line.strip() for line in lines[-limit:]]

def count_levels(lines):
    counts = Counter()
    for line in lines:
        for level in ["INFO", "WARNING", "ERROR", "CRITICAL"]:
            if f" {level} " in line:
                counts[level] += 1
    return counts

# --- ENDPOINTS ---

@app.route('/api/analytics')
def get_analytics():
    """
    Advanced analytics including health heuristic
    """
    lines = read_logs(limit=100)
    parsed_logs = [parse_log_line(l) for l in lines if parse_log_line(l)]
    
    # Calculate counts from parsed data
    levels = [log['level'] for log in parsed_logs]
    summary = {
        "INFO": levels.count("INFO"),
        "WARNING": levels.count("WARNING"),
        "ERROR": levels.count("ERROR"),
        "CRITICAL": levels.count("CRITICAL")
    }
    
    total = len(levels)
    error_count = summary["ERROR"] + summary["CRITICAL"]
    
    # Health Logic: Deduct points for errors
    health_score = 100
    if total > 0:
        health_score = max(0, 100 - (summary["WARNING"] * 5) - (summary["ERROR"] * 15) - (summary["CRITICAL"] * 30))

    return jsonify({
        "summary": summary,
        "status": "Healthy" if health_score > 70 else "Unstable",
        "health_score": f"{health_score}%",
        "total_analyzed": total,
        "error_rate": f"{(error_count/total)*100:.1f}%" if total > 0 else "0%"
    })

@app.route("/logs")
def logs():
    search = request.args.get('search', '', type=str).lower()
    lines = read_logs(limit=500)
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

@app.route("/logs", methods=["DELETE"])
def clear_logs():

    if os.path.exists(LOG_FILE):
        open(LOG_FILE, "w").close()
    return jsonify({"status": "cleared"}), 200

@app.route("/")
def home():
    return "Monitoring API Running ✅"

@app.route("/api/health-check")
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({
        "status": "API is running",
        "service": "monitor_api"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)

