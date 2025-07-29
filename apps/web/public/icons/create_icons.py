from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create a purple background image
    img = Image.new('RGB', (size, size), (79, 70, 229))  # Purple color
    draw = ImageDraw.Draw(img)
    
    # Draw white text
    text = "IDE"
    # Try to use a built-in font, fall back to default if not available
    try:
        font_size = size // 4
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill=(255, 255, 255), font=font)
    
    img.save(filename)
    print(f"Created {filename}")

# Create icons
create_icon(144, 'icon-144x144.png')
create_icon(192, 'icon-192x192.png')
create_icon(512, 'icon-512x512.png')
EOF < /dev/null
