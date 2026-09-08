"""
PRAMAAN Validator — Stage A.1
Validates extracted VIZ fields and MRZ check digits.
"""

import re
from datetime import datetime


# ---------------------------------------------------------------------------
# VIZ field validators (unchanged logic from original)
# ---------------------------------------------------------------------------

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


def _parse_date(value):
    try:
        return datetime.strptime(value.upper(), "%d %b %Y")
    except ValueError:
        return None


def validate_date_of_birth(value):
    if not value:
        return False, "Date of birth is missing"

    date = _parse_date(value)

    if date is None:
        return False, "Invalid date format"

    if date > datetime.now():
        return False, "Date of birth is in the future"

    return True, "Valid"


def validate_date_of_issue(value):
    if not value:
        return False, "Date of issue is missing"

    date = _parse_date(value)

    if date is None:
        return False, "Invalid date format"

    if date > datetime.now():
        return False, "Date of issue is in the future"

    return True, "Valid"


def validate_expiry(value):
    if not value:
        return False, "Date of expiry is missing"

    date = _parse_date(value)

    if date is None:
        return False, "Invalid date format"

    if date < datetime.now():
        return False, "Expired"

    return True, "Valid"


def validate_place_of_birth(value):
    if not value:
        return False, "Place of birth is missing"

    if not re.fullmatch(r"[A-Za-z ,]+", value):
        return False, "Place of birth contains invalid characters"

    return True, "Valid"


def validate_gender(value):
    if not value:
        return False, "Gender is missing"

    if value.upper() not in {"M", "F"}:
        return False, "Invalid gender"

    return True, "Valid"


def validate_fields(fields: list) -> list:
    validators = {
        "Full Name": validate_name,
        "Passport Number": validate_passport_number,
        "Nationality": validate_nationality,
        "Date of Birth": validate_date_of_birth,
        "Date of Issue": validate_date_of_issue,
        "Date of Expiry": validate_expiry,
        "Place of Birth": validate_place_of_birth,
        "Gender": validate_gender,
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
                "message": message,
            })

    return results


# ---------------------------------------------------------------------------
# MRZ check-digit validator
# ---------------------------------------------------------------------------

def validate_mrz_checksums(mrz_parsed: dict) -> dict:
    """
    Validate the MRZ check digits from the parsed MRZ dict.

    Returns a summary dict with per-field status and an overall flag.
    """
    checksum_status = mrz_parsed.get("checksumStatus", {})

    def _field_check(label: str, key: str) -> dict:
        stat = checksum_status.get(key, "UNAVAILABLE")
        if stat == "VALID":
            msg = "Check digit matches" if key != "composite" else "Composite check digit matches"
        elif stat == "INVALID":
            msg = "Check digit mismatch" if key != "composite" else "Composite check digit mismatch"
        else:
            msg = "Check digit unavailable" if key != "composite" else "Composite check digit unavailable"
        return {
            "field": label,
            "status": stat,
            "message": msg,
        }

    checks = [
        _field_check("Document Number", "documentNumber"),
        _field_check("Date of Birth", "dateOfBirth"),
        _field_check("Date of Expiry", "expiryDate"),
        _field_check("Composite", "composite"),
    ]

    mrz_complete = mrz_parsed.get("mrzComplete", False)
    all_valid = (
        all(c["status"] == "VALID" for c in checks)
        and mrz_complete
    )

    return {
        "mrzIntact": all_valid,
        "checks": checks,
    }