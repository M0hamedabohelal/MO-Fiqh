from PIL import Image

logo_path = "src/assets/logo.png"
logo = Image.open(logo_path)

# Restore icons
icons = {
    "public/icons/apple-touch-icon.png": (180, 180),
    "public/icons/maskable-192.png": (192, 192),
    "public/icons/maskable-512.png": (512, 512),
    "public/icons/pwa-192.png": (192, 192),
    "public/icons/pwa-512.png": (512, 512)
}

for path, size in icons.items():
    resized = logo.resize(size, Image.Resampling.LANCZOS)
    resized.save(path)

print("Icons restored!")
