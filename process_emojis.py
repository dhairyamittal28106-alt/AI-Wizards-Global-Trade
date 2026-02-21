import os
import sys

# ensure rembg is installed first via pip install
try:
    from rembg import remove
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rembg", "onnxruntime"])
    from rembg import remove
    from PIL import Image

os.makedirs('static/images', exist_ok=True)

img1 = r'C:\Users\HP\.gemini\antigravity\brain\ef48978d-0395-4dd3-8737-78f59338944e\money_tree_1771689318087.png'
img2 = r'C:\Users\HP\.gemini\antigravity\brain\ef48978d-0395-4dd3-8737-78f59338944e\globe_money_1771689361184.png'

out1 = 'static/images/money_tree.png'
out2 = 'static/images/globe_money.png'

if os.path.exists(img1):
    remove(Image.open(img1)).save(out1)
    print(f"Processed {out1}")
if os.path.exists(img2):
    remove(Image.open(img2)).save(out2)
    print(f"Processed {out2}")

print("Done processing images.")
