#!/bin/sh

# Start Ollama server
ollama serve &

# Wait for it to be ready
sleep 10

# # Remove all existing models
# ollama list --quiet | xargs -r -n 1 ollama rm

# echo "Remaining models:"
# ollama list

# Pull base model
ollama pull gemma3:4b

# Create custom model with 8192 context tokens
# ollama create gemma3-4b-8k -f /app/Modelfile

# Keep container alive
wait