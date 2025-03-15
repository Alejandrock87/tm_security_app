
from PIL import Image, ImageDraw, ImageFont
import os

def create_security_icon(size=512):
    # Crear imagen con fondo transparente
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Colores
    tm_red = (200, 16, 46)      # Rojo TransMilenio
    security_blue = (0, 48, 135) # Azul seguridad
    white = (255, 255, 255)
    
    # Dibujar escudo
    shield_margin = size // 8
    shield_points = [
        (shield_margin, size//4),  # Top left
        (size//2, shield_margin),  # Top middle
        (size-shield_margin, size//4),  # Top right
        (size-shield_margin, size*2//3),  # Bottom right
        (size//2, size-shield_margin),  # Bottom point
        (shield_margin, size*2//3),  # Bottom left
    ]
    draw.polygon(shield_points, fill=security_blue)
    
    # Dibujar borde del escudo
    draw.line(shield_points + [shield_points[0]], fill=white, width=size//30)
    
    # Dibujar "T" de TransMilenio
    font_size = size // 2
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "T"
    # Obtener dimensiones del texto
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    text_width = right - left
    text_height = bottom - top
    
    # Posicionar texto en el centro
    position = ((size-text_width)//2, (size-text_height)//2 - size//10)
    
    # Dibujar "T" con borde blanco para mejor visibilidad
    offset = size//50
    for dx, dy in [(-offset,-offset), (-offset,offset), (offset,-offset), (offset,offset)]:
        draw.text((position[0]+dx, position[1]+dy), text, font=font, fill=white)
    draw.text(position, text, font=font, fill=tm_red)

    return image

if __name__ == "__main__":
    # Crear el directorio static/icons si no existe
    icons_dir = "static/icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generar iconos en diferentes tamaños
    sizes = [192, 512]
    for size in sizes:
        icon = create_security_icon(size)
        icon.save(f"{icons_dir}/icon-{size}x{size}.png")
    print("Security icons generated successfully.")
