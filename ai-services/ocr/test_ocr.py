from PIL import Image, ImageDraw, ImageFont

image = Image.new("RGB", (1200, 800), "white")
draw = ImageDraw.Draw(image)

font = ImageFont.load_default()
bold_font = ImageFont.load_default()

draw.text((450, 50), "PASSPORT", fill="black", font=bold_font)

data = [
    "Name: RAHUL SHARMA",
    "Passport No: T1234567",
    "Nationality: INDIAN",
    "Date of Birth: 15 JAN 2005",
    "Date of Expiry: 14 JAN 2035",
    "Gender: M"
]

y = 180

for line in data:
    draw.text((100, y), line, fill="black", font=font)
    y += 90

image.save("test_document.png")

print("Synthetic document created: test_document.png")
