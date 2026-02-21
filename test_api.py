import requests
import json
import uuid

# Configuration
LANGFLOW_ID = "f84e7ae5-2763-47cd-be4a-9905eb5b1a19"
BASE_API_URL = "http://127.0.0.1:7860"
# Placeholder: User needs to provide the real SK key
APPLICATION_TOKEN = "sk-thSYGf-Oq7CcsffJFtRzSbLlWwXf3H26NLoF7uF_P-s"

def run_flow(message: str) -> dict:
    api_url = f"{BASE_API_URL}/api/v1/run/{LANGFLOW_ID}"
    
    payload = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
        "session_id": str(uuid.uuid4())
    }
    
    headers = {
        "x-api-key": APPLICATION_TOKEN,
        "Content-Type": "application/json"
    }
    
    with open("api_debug.log", "w") as f:
        f.write(f"Testing URL: {api_url}\n")
        
        try:
            response = requests.post(api_url, json=payload, headers=headers)
            f.write(f"Status Code: {response.status_code}\n")
            f.write(f"Response: {response.text}\n")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            f.write(f"Error: {e}\n")
            return str(e)

if __name__ == "__main__":
    print(run_flow("Test message"))
