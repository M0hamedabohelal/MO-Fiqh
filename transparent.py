import sys
from PIL import Image

def make_transparent(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    
    # Do a floodfill from the top-left corner (0, 0)
    # Target color is the color of the pixel at (0, 0)
    target_color = img.getpixel((0, 0))
    
    # We will use floodfill to create a mask
    from PIL import ImageDraw
    
    # Create a mask image (L mode)
    mask = Image.new("L", img.size, 255) # 255 means keep
    
    # Instead of ImageDraw.floodfill, we can just do it manually to be safe or use ImageDraw
    ImageDraw.floodfill(mask, (0, 0), 0, thresh=15)
    ImageDraw.floodfill(mask, (img.width-1, 0), 0, thresh=15)
    ImageDraw.floodfill(mask, (0, img.height-1), 0, thresh=15)
    ImageDraw.floodfill(mask, (img.width-1, img.height-1), 0, thresh=15)
    
    # Apply mask to alpha channel
    img.putalpha(mask)
    
    img.save(output_path, "PNG")
    print(f"Saved transparent image to {output_path}")

images_to_process = [
    "src/assets/logo.png",
    "public/og-image.png",
    "public/icons/apple-touch-icon.png",
    "public/icons/maskable-192.png",
    "public/icons/maskable-512.png",
    "public/icons/pwa-192.png",
    "public/icons/pwa-512.png",
]

for path in images_to_process:
    make_transparent(path, path)
