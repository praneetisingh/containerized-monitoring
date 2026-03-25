from flask import Flask, jsonify, request
from flask_cors import CORS
from collections import Counter
import os

app = Flask(__name__)
CORS(app)

# Path to the log file created by demo_app (mounted via Docker volume)
LOG_FILE = "/app/logs/app.log"

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

@app.route("/logs")
def logs():
    # Allow filtering by a search query
    search = request.args.get('search', '', type=str).lower()
    
    lines = read_logs(limit=500) # Fetch more lines if we need to filter
    if search:
        lines = [line for line in lines if search in line.lower()]
        
    return jsonify(lines[-50:])

@app.route("/logs/<level>")
def logs_by_level(level):
    level = level.upper()
    lines = read_logs(limit=500)
    filtered = [line for line in lines if f" {level} " in line]
    return jsonify(filtered[-50:])

@app.route("/summary")
def summary():
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
