
import re

with open('static/world_map.svg', 'r') as f:
    content = f.read()

# Find the <g> block containing the paths
match = re.search(r'<g>(.*?)</g>', content, re.DOTALL)
if match:
    paths = match.group(1).strip()
    # Remove whitespace between tags to keep it compact
    paths = re.sub(r'>\s+<', '><', paths)
    with open('map_paths_fragment.txt', 'w') as f:
        f.write(paths)
    print("Paths extracted to map_paths_fragment.txt")
else:
    print("Could not find <g> block")
