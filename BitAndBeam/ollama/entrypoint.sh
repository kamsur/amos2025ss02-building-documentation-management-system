#!/bin/sh

# Start Ollama server
ollama serve &

# Wait for it to be ready
sleep 10

# Pull base model
ollama pull gemma3:4b

# Create custom model with 16384 context tokens
ollama create gemma3-4b-16k -f /app/Modelfile

# Keep container alive
wait