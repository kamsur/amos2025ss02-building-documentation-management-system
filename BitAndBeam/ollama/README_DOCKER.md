
### 🐳 Docker Guide for Ollama AI Microservice

This guide helps you run the **Ollama AI microservice** using Docker.
It covers both development and production setups, managed from the root `BitAndBeam/` directory.

---

## 🧰 Prerequisites

Make sure Docker is installed and running on your system.

### 🔗 Install Docker

* **Windows/macOS**:
  [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

* **Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
````

> 🔁 You may need to restart your system or log out/in after installing Docker

---

## ▶️ Run in Development Mode

> Make sure you're in the **BitAndBeam/** root directory (not inside `ollama/`)

### 🔧 Option 1: Using Docker Compose (Recommended)

```bash
docker compose up --build
```

This will:

* Build the Ollama container from `./ollama/Dockerfile`
* Pull the `gemma3:1b` model (default, can be changed in Dockerfile or entrypoint)
* Expose the Ollama REST API on:

  * `11434` – Ollama's native REST API (`http://localhost:11434/`)

---

### 🐳 Option 2: Manual Docker Commands (No Compose)

> Run these inside the `ollama/` directory:

```bash
docker build -t ollama-custom .
docker run -d -p 11434:11434 --name ollama-test ollama-custom
```

This will:

* Build the container image and tag it as `ollama-custom`
* Start the container in detached mode
* Expose the Ollama REST API at `http://localhost:11434/`

---

## 🚀 Run in Production Mode

> Still from the **BitAndBeam/** root directory:

```bash
docker compose -f docker-compose-prod.yml up --pull always
```

This will:

* Pull/build the Ollama image as defined in production compose
* Start the Ollama REST API container at:

```
http://localhost:11434/         ← Native Ollama API endpoint
```

---

## 🌐 API Testing

After starting the container, test using any REST client:

```bash
curl http://localhost:11434/
```

Or use the `/api/generate` endpoint to send prompts:

```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
        "model": "gemma3:1b",
        "prompt": "What is the capital of Germany?",
        "stream": false
      }'
```

Expected response (shortened):

```json
{
  "model": "gemma3:1b",
  "created_at": "...",
  "response": "Berlin is the capital of Germany.",
  ...
}
```

---

## 🧼 Stop and Remove Ollama Container

```bash
docker stop ollama-test
docker rm ollama-test
```

---

## 📝 Notes

* You can change the default model by editing `Dockerfile` (look for the `ollama pull ...` line).
* If you update the model, don’t forget to rebuild:

```bash
docker compose up --build
```
