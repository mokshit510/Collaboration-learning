import re


def normalize_text(text):
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def clean_value(value):
    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    return value


def parse_fields(text):
    text = normalize_text(text)

    fields = []

    patterns = {
        "Full Name": r"(?:Name|Full Name)\s*[:.\-]?\s*([A-Z][A-Z ]+)",
        "Passport Number": r"Passport\s*(?:No|Na|Number)?\s*[:.\-]?\s*([A-Z0-9]{6,12})",
        "Nationality": r"Nationality\s*[:.\-]?\s*([A-Z]+)",
        "Date of Birth": r"(?:Date of Birth|Dets of Barth|DOB)\s*[:.\-]?\s*([0-9]{1,2}\s+[A-Z]{3}\s+[0-9]{4})",
        "Date of Expiry": r"(?:Date of Expiry|Dets of Expiry|Expiry)\s*[:.\-]?\s*([0-9]{1,2}\s+[A-Z]{3}\s+[0-9]{4})",
        "Gender": r"Gender\s*[:.\-]?\s*([MF])"
    }

    for label, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            value = clean_value(match.group(1))

            fields.append({
                "label": label,
                "value": value,
                "confidence": 90
            })

    return fields
