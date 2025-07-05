#!/bin/sh

# Start Ollama server
ollama serve &

# Wait for it to be ready
sleep 10

# Pull base model
ollama pull gemma3:4b-it-qat

# Create custom model with 16384 context tokens
ollama create gemma3-4b-it-qat-16k -f /app/Modelfile

# Keep container alive
wait