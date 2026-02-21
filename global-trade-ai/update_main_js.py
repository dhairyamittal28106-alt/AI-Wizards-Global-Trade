
import json
import re

# Load the new coordinates
with open('country_coords_utf8.json', 'r') as f:
    new_coords = json.load(f)

# Mapping from UI names to ISO codes
mapping = {
    "China": "CN",
    "USA": "US",
    "India": "IN",
    "Vietnam": "VN",
    "Germany": "DE",
    "UAE": "AE",
    "UK": "GB",
    "Canada": "CA",
    "Australia": "AU",
    "Japan": "JP",
    "South Korea": "KR",
    "France": "FR",
    "Italy": "IT",
    "Brazil": "BR",
    "Mexico": "MX"
}

# Construct the new countryCoords object string
lines = ["const countryCoords = {"]
for name, code in mapping.items():
    if code in new_coords:
        c = new_coords[code]
        lines.append(f'    "{name}": {{ x: {c["x"]}, y: {c["y"]}, code: \'{code.lower()}\' }},')
    else:
        print(f"Warning: No coordinates for {name} ({code})")
lines[-1] = lines[-1].rstrip(',') # remove trailing comma for the last item though JS allows it
lines.append("};")
new_coords_js = "\n".join(lines)

# Read main.js
with open('static/js/main.js', 'r') as f:
    js_content = f.read()

# Replace the countryCoords object
# Match from const countryCoords = { to };
pattern = r'const countryCoords = \{.*?\};'
updated_js = re.sub(pattern, new_coords_js, js_content, flags=re.DOTALL)

with open('static/js/main.js', 'w') as f:
    f.write(updated_js)

print("Updated main.js with new countryCoords")
