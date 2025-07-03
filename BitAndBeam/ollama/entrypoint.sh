#!/bin/sh

# Start Ollama in background
ollama serve &

# Wait for Ollama to come up
sleep 10

# Pull model (ignore errors)
ollama pull gemma3:1b || true

# Wait forever (taki container running rahe)
wait
