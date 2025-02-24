from PIL import Image, ImageDraw, ImageFont
import os

def create_station_icon(size=192, bg_color=(144, 238, 144), text_color=(0, 0, 0)):
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Draw circle
    draw.ellipse([0, 0, size, size], fill=bg_color)

    # Add text
    font = ImageFont.load_default()
    text = "T"
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    text_width = right - left
    text_height = bottom - top
    position = ((size-text_width)/2, (size-text_height)/2)
    draw.text(position, text, font=font, fill=text_color)

    return image

if __name__ == "__main__":
    # Crear el directorio static/icons si no existe
    icons_dir = "static/icons"
    os.makedirs(icons_dir, exist_ok=True)

    # Generar y guardar el icono
    icon = create_station_icon()
    icon.save(f"{icons_dir}/icon-192x192.png")
    print("Station icon generated successfully.")