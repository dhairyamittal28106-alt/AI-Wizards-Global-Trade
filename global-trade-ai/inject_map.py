
import os

with open('map_paths_fragment.txt', 'r') as f:
    paths = f.read()

with open('templates/index.html', 'r') as f:
    content = f.read()

# Replace the world-map-bg div and the routeSvg definition
old_map_bg = '<div class="world-map-bg"></div>'
new_map_bg = '<!-- World Map Landmasses Integrated -->'

content = content.replace(old_map_bg, new_map_bg)

# Update viewBox and preserveAspectRatio
# We'll replace the whole <svg ...> tag and its initial content
import re

svg_pattern = r'<svg id="routeSvg".*?>'
new_svg_tag = '<svg id="routeSvg" width="100%" height="100%" viewBox="0 0 1010 660" preserveAspectRatio="xMidYMid meet">'

content = re.sub(svg_pattern, new_svg_tag, content)

# Insert the landmasses group before <defs> or right after <svg>
landmasses_group = f'<g id="mapLandmasses" class="land-layers" style="opacity: 0.8; fill: #2ed573; stroke: white; stroke-width: 0.5;">{paths}</g>'

content = content.replace('<defs>', landmasses_group + '\n            <defs>')

with open('templates/index.html', 'w') as f:
    f.write(content)

print("Updated index.html with landmasses")
