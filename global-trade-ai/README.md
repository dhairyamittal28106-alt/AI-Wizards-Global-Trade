# Global Trade Intelligence (Sarvam Theme)

A modern AI-powered platform for Global Trade Analysis, featuring:
*   **Landed Cost Calculation** (HS Codes, Tariffs, Logistics).
*   **AI Assistant Advisor** (Optimization suggestions).
*   **Sarvam Theme** (Clean, Gradient, Glassmorphism UI).

## Setup

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configuration:**
    *   Ensure **Langflow** (v1.0+) is running locally on port `7860`.
    *   Set your Environment Variables (Optional, defaults provided in `app.py`):
        *   `LANGFLOW_API_URL`: URL of Langflow (default: `http://127.0.0.1:7860`)
        *   `LANGFLOW_FLOW_ID`: ID of your flow.
        *   `LANGFLOW_API_KEY`: Your Langflow API Key.

3.  **Run the App:**
    ```bash
    python app.py
    ```
    Open [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Architecture

*   **Frontend:** Flask (Jinja2 Templates), Vanilla JS, CSS (Sarvam Theme).
*   **Backend:** Python (Flask), acting as a proxy to Langflow API.
*   **AI:** Langflow (RAG + Agents).

## Features

*   **Main Search:** Calculates landed cost and displays results in a dedicated card.
*   **Advisor Bot:** Automatically suggests optimizations (e.g., cheaper routes) after a search.
*   **Chat Widget:** Floating assistant for follow-up questions.
