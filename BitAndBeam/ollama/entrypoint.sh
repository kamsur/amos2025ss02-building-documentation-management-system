#!/bin/sh

ollama serve &

sleep 10

ollama pull gemma3:1b || true

wait
