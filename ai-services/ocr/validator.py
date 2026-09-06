import re
from datetime import datetime


def validate_name(value):
    if not value:
        return False, "Name is missing"

    if not re.fullmatch(r"[A-Za-z ]+", value):
        return False, "Name contains invalid characters"

    return True, "Valid"


def validate_passport_number(value):
    if not value:
        return False, "Passport number is missing"

    if not re.fullmatch(r"[A-Z][0-9]{7}", value.upper()):
        return False, "Invalid passport number format"

    return True, "Valid"


def validate_nationality(value):
    if not value:
        return False, "Nationality is missing"

    if not re.fullmatch(r"[A-Za-z ]+", value):
        return False, "Invalid nationality"

    return True, "Valid"


def parse_date(value):
    try:
        return datetime.strptime(value.upper(), "%d %b %Y")
    except ValueError:
        return None


def validate_date_of_birth(value):
    if not value:
        return False, "Date of birth is missing"

    date = parse_date(value)

    if date is None:
        return False, "Invalid date format"

    if date > datetime.now():
        return False, "Date of birth is in the future"

    return True, "Valid"


def validate_expiry(value):
    if not value:
        return False, "Date of expiry is missing"

    date = parse_date(value)

    if date is None:
        return False, "Invalid date format"

    if date < datetime.now():
        return False, "Expired"

    return True, "Valid"


def validate_gender(value):
    if not value:
        return False, "Gender is missing"

    if value.upper() not in {"M", "F"}:
        return False, "Invalid gender"

    return True, "Valid"


def validate_fields(fields):
    validators = {
        "Full Name": validate_name,
        "Passport Number": validate_passport_number,
        "Nationality": validate_nationality,
        "Date of Birth": validate_date_of_birth,
        "Date of Expiry": validate_expiry,
        "Gender": validate_gender
    }

    results = []

    for field in fields:
        label = field["label"]
        value = field["value"]

        validator = validators.get(label)

        if validator:
            valid, message = validator(value)

            results.append({
                "field": label,
                "value": value,
                "status": "VALID" if valid else "INVALID",
                "message": message
            })

    return results