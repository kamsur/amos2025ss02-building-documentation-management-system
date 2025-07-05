FROM python:3.10-slim

# Install Ollama dependencies
RUN apt-get update && apt-get install -y curl gnupg procps && \
    curl -fsSL https://ollama.com/install.sh | sh && \
    apt-get clean

# Copy app files
WORKDIR /app
COPY app/ .

# Add custom Modelfile to increase context
COPY Modelfile /root/Modelfile

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Create custom model with extended context
RUN ollama serve & \
    sleep 8 && \
    ollama pull gemma3:12b-it-qat && \
    ollama create gemma3-12b-it-qat-16k -f /root/Modelfile && \
    pkill ollama

# Start Ollama + FastAPI server with custom model
CMD ["sh", "-c", "ollama serve & sleep 8 && uvicorn main:app --host 0.0.0.0 --port 8000"]

# # Start Ollama + FastAPI server
# CMD ["sh", "-c", "ollama serve & sleep 8 && ollama pull gemma3:27b-it-qat && uvicorn main:app --host 0.0.0.0 --port 8000"]

