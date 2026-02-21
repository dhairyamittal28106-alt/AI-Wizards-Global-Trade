
import re

with open('static/world_map.svg', 'r') as f:
    content = f.read()

# Find all paths with id="XX" and get the first coordinate in d="..."
matches = re.findall(r'<path id="([A-Z]+)"[^>]+d="M([0-9.]+),([0-9.]+)', content)

coords = {}
for code, x, y in matches:
    coords[code] = {"x": float(x), "y": float(y)}

import json
print(json.dumps(coords, indent=2))
