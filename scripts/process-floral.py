from PIL import Image

SRC = r"C:\Users\micah\.cursor\projects\d-coding-project-apps-wedding-registry\assets\c__Users_micah_AppData_Roaming_Cursor_User_workspaceStorage_1c759e9566c5660b992e31ffcc8bc359_images_image-ebafab57-6e0a-4b35-922e-2f24dfcb033f.png"
DST = r"d:\coding_project&apps\wedding_registry\public\images\floral-divider.png"

img = Image.open(SRC).convert("RGBA")
width, height = img.size

min_x, min_y = width, height
max_x, max_y = 0, 0

for y in range(height):
    for x in range(width):
        r, g, b, _ = img.getpixel((x, y))
        if r < 245 or g < 245 or b < 245:
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

pad = 2
img = img.crop(
    (
        max(0, min_x - pad),
        max(0, min_y - pad),
        min(width, max_x + pad + 1),
        min(height, max_y + pad + 1),
    )
)

for y in range(img.height):
    for x in range(img.width):
        r, g, b, _ = img.getpixel((x, y))
        if r > 230 and g > 230 and b > 230:
            img.putpixel((x, y), (0, 0, 0, 0))
        else:
            img.putpixel((x, y), (r, g, b, 255))

img.save(DST, "PNG")
print(f"saved {DST} at {img.size}")
