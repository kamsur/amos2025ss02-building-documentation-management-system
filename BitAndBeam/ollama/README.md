# Ollama AI Setup

This directory sets up a **Dockerized Ollama LLM engine** that can be used directly by your backend (e.g., C#) via REST API.

---

## ✅ Features

- Pure Dockerized Ollama LLM runtime (no Python or FastAPI layer)
- Automatically pulls and loads the `gemma3:1b` model on container start
- Exposes Ollama's REST API on port `11434`
- Simple integration with your backend via HTTP (no extra API keys or wrappers)
- Model can be easily changed by updating the Dockerfile or entrypoint script

---

## 🚀 How to Run

To build and run this service using Docker:

```bash
# Build (if using a custom Dockerfile)
docker build -t ollama-custom ./ollama

# Run
docker run -d --name ollama -p 11434:11434 ollama-custom
````

Or, if using `docker-compose`:

```bash
docker-compose up -d ollama
```

The container will automatically pull and load the `gemma3:1b` model.
You can access the Ollama REST API at `http://localhost:11434/`.

---

## 📁 Project Structure

```
ollama/
├── Dockerfile               # Builds Ollama container and pulls default model
├── entrypoint.sh            # (if used) Pulls model on startup
├── README.md
├── README_DOCKER.md
```

---
