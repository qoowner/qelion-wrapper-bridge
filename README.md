

# ✨ Qelion-Wrapper-Bridge

Chat with your images, text files, and PDFs using local OCR (Apple Vision) and your own Ollama LLM.

This project provides a simple and clean **web interface** to feed document context directly into a local language model running via Ollama. It leverages **Apple's native Vision framework** for high-performance, on-device OCR.

> **Note:** This project is currently **macOS-only** (macOS 10.15+) due to its reliance on the Apple Vision framework for OCR.

<img width="1470" height="702" alt="UI" src="https://github.com/user-attachments/assets/e0bf86ba-c3a7-47b0-abd9-0473e4dbe095" />


## Core Features

  * **Multi-Modal Input:** Upload images (PNG, JPG, HEIC), text files (TXT, MD, CSV), or PDF documents.
  * **High-Performance OCR:** Uses Apple's native **Vision framework** on macOS for fast and accurate text recognition.
  * **LLM Integration:** Connects to your local Ollama instance (`http://localhost:11434` by default).
  * **Sleek Web UI:**
      * Select any available Ollama model on the fly.
      * Handles file uploads via a simple picker.
      * Multi-language UI support (English, Russian, German, French).

## How It Works

1.  **Upload:** You provide a file (image, PDF, or text) to the **web interface**.
2.  **Extract:**
      * **Images:** The file is processed by `apple_vision_ocr.py`, using the native macOS Vision framework.
      * **PDFs:** Text is extracted page-by-page using `PyPDF2`.
      * **Text:** The file is read directly.
3.  **Contextualize:** The extracted text is prepended to your prompt as context for the LLM. The system also intelligently truncates large documents to fit the model's context window.
4.  **Chat:** The combined prompt (context + your question) is sent to the Ollama `/api/chat` endpoint.
5.  **Respond:** The model's answer is displayed in the interface.

## Requirements

  * **macOS 10.15+** (Catalina) or newer.
  * Python 3.10+
  * A running [Ollama](https://ollama.com/) instance.
  * At least one model downloaded (e.g., `ollama pull qwen3:4b`).

## 🚀 Installation

1.  **Clone the repository and create a virtual environment:**

    ```bash
    git clone https://github.com/qoowner/qelion-wrapper-bridge.git
    cd qelion-wrapper-bridge
    python3 -m venv .venv
    source .venv/bin/activate
    ```

2.  **Install core dependencies:**
    This includes the web server, API client, and PDF support.

    ```bash
    pip install Flask requests PyPDF2
    ```

    *(Note: The repository includes a `requirements.txt` which also lists `pytesseract` and `Pillow`, but they are not required for macOS operation).*

3.  **Install Apple Vision Bindings:**
    This is required for the core OCR functionality.

    ```bash
    pip install "pyobjc-framework-Vision>=10.0"
    ```

## 🏃 Running the App

Run the Flask server:

```bash
python web/server.py
```

The application will be available at **`http://127.0.0.1:8765`**.

You can upload files, select your model, and start chatting.

### Configuration

  * **Ollama Host:** To use a different Ollama address, set the `OLLAMA_HOST` environment variable:
    ```bash
    export OLLAMA_HOST="http://192.168.1.100:11434"
    python web/server.py
    ```

## 🗺️ Roadmap

This project is in active development. Future plans include:

  * Windows Support
  * Agent Mode

## Project Structure

```
.
├── apple_vision_ocr.py      # OCR Layer (Vision only)
├── requirements.txt         # Core Python dependencies
├── .gitignore               # Standard .gitignore
└── web/
    ├── server.py            # Flask server (API)
    └── static/
        ├── index.html       # Frontend HTML
        ├── main.js          # Frontend JavaScript (Logic)
        └── styles.css       # Frontend CSS
```
