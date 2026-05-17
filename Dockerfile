FROM python:3.11-slim

# 1. Install system dependencies for building C extensions (like PyAudio)
# and for connecting to PostgreSQL.
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libportaudio2 \
    portaudio19-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Upgrade pip first (good practice)
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .

# 3. This should now succeed!
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]