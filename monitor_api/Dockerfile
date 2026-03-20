FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY api.py /app/api.py

EXPOSE 8000

CMD ["python", "/app/api.py"]
