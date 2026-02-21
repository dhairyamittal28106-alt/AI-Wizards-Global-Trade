# Product Requirements Document (PRD)

**Project:** Global Trade Intelligence
**Tagline:** India's Sovereign Trade Intelligence

## What It Is
An AI-powered web platform assisting users (importers/exporters) with international trade logistics, compliance, and cost analysis.

## How it Works (Architecture & Data Flow)

### 1. The Frontend (Client-Side)
- **UI Base:** Built with vanilla HTML, CSS, and JS.
- **Input Forms:** Users fill out trade parameters (HS Code, Import/Export, Quantity, Price, Origin, Destination).
- **Map Visualizations:** Uses an embedded SVG. When users search, JS dynamically plots a curved animation between the Origin and Destination nodes using hardcoded node coordinates (`countryCoords`).
- **Cart System:** Uses a JS array (`tradeCart`) to store multiple products. Upon clicking "Analyse All Products", JS groups all data into a natural language sentence.

### 2. The Backend Bridge (Python/Flask)
- Provides a `/process` endpoint (`app.py`).
- Receives the natural language prompt constructed by frontend JS.
- Acts as a proxy to prevent frontend exposure of API keys. 

### 3. The AI & Intelligence Engine (Langflow)
- The Flask backend securely forwards the user's generated queries to a configured **Langflow API Endpoint** (`LANGFLOW_API_URL` & `LANGFLOW_FLOW_ID`).
- Langflow processes the trade specifics (Landed Costs, Compliance, CBAM checks, Tariff optimizations) and generates the data.
- **Fallback Mock:** If `LANGFLOW_API_KEY` is completely missing natively, the app gracefully falls back to returning generic mocked chat responses.

### 4. Interactive Chat 
- Users converse via a floating chat widget or a right-side panel.
- Inputs here also hit the `/process` proxy and query the same Langflow graph, maintaining context or fetching dynamic trade documentation data.
