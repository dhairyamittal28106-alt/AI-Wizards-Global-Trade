from flask import Flask, render_template, request, jsonify
import os
import requests

app = Flask(__name__)

# --- Configuration ---
# TODO: Replace with actual Langflow API details
LANGFLOW_API_URL = os.environ.get("LANGFLOW_API_URL", "http://127.0.0.1:7860")
LANGFLOW_FLOW_ID = os.environ.get("LANGFLOW_FLOW_ID", "f84e7ae5-2763-47cd-be4a-9905eb5b1a19")
LANGFLOW_API_KEY = os.environ.get("LANGFLOW_API_KEY", "sk-thSYGf-Oq7CcsffJFtRzSbLlWwXf3H26NLoF7uF_P-s")

@app.route('/')
def home():
    """Renders the home page with the RedBus-themed chat widget."""
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    """
    Handles the chat input from the frontend.
    Forwards the input to Langflow (or mocks it if not configured).
    """
    data = request.json
    user_input = data.get('input')

    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    # Mock response if API details are missing/default
    # Note: We keep the check for the Default ID if the user hasn't set an env var, 
    # but we updated the default above. So we check if the KEY is still the placeholder.
    if LANGFLOW_API_KEY == "YOUR_API_KEY":
        # Simulate a delay and return a mock response
        import time
        time.sleep(1) 
        return jsonify({
            "outputs": [
                {
                    "outputs": [
                        {
                            "results": {
                                "message": {
                                    "text": f"Echo: {user_input}\n\n*Note: This is a mock response. Please configure LANGFLOW_API_KEY to connect to the real flow.*"
                                }
                            }
                        }
                    ]
                }
            ],
            "status": "success"
        })

    # Actual Langflow Integration
    try:
        # Construct the payload compatible with Langflow API
        payload = {
            "input_value": user_input,
            "output_type": "chat",
            "input_type": "chat",
            "tweaks": {
                # Add any specific tweaks here if needed
            }
        }
        headers = {
            "x-api-key": LANGFLOW_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Note: The actual endpoint structure might vary based on Langflow version
        # This is a common pattern: /api/v1/run/{flow_id}
        api_url = f"{LANGFLOW_API_URL}/api/v1/run/{LANGFLOW_FLOW_ID}?stream=false"
        
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()
        
        response_data = response.json()
        print("Langflow Response:", response_data)
        return jsonify(response_data)
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e), "status": "failed"}), 500

if __name__ == '__main__':
    app.run(debug=True)
