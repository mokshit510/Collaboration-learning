"""
PRAMAAN Field Parser — Stage A.1 (Complete)
Parses VIZ fields and MRZ data from the structured extract_text() result.

Two independent sources are parsed:
  - viz_fields  (structured per-field OCR from ocr_engine)
  - mrz_lines   (ICAO TD3 two-line MRZ from ocr_engine)

VIZ ↔ MRZ comparison is NOT performed here (that is Stage A.2).
"""

from __future__ import annotations

import re
from datetime import datetime


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _clean(value: str) -> str:
    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    return value


def _normalize_viz(text: str) -> str:
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _reinsert_date_spaces(value: str) -> str:
    """Convert '15JAN1990' → '15 JAN 1990' when OCR drops spaces."""
    return re.sub(
        r"([0-9]{1,2})([A-Z]{3})([0-9]{4})",
        r"\1 \2 \3",
        value,
    )


# ---------------------------------------------------------------------------
# VIZ field parser
# ---------------------------------------------------------------------------

# Regex patterns applied to the full VIZ text blob as a fallback when
# field-specific OCR does not produce a value.
_VIZ_PATTERNS: dict[str, str] = {
    "Surname": (
        r"(?:Surname|Nom|[A-Za-z]*urname)\s*[:/\-]?\s*\n?\s*([A-Z][A-Z ]+)"
    ),
    "Given Names": (
        r"(?:Given\s*Names?|Pr[eé]noms|[A-Za-z]*iven[A-Za-z]*)\s*[:/\-]?\s*\n?\s*([A-Z][A-Z ]+)"
    ),
    "Passport Number": (
        r"(?:Passport\s*(?:No|Na|Number)?|Passeport\s*[Nn][o°])\s*[:.\/\-]?\s*([A-Z][0-9]{7})"
    ),
    "Nationality": (
        r"(?:Nationality|Nationalit[eé])\s*[:/\-]?\s*\n?\s*([A-Z][A-Z ]+)"
    ),
    "Date of Birth": (
        r"(?:Date\s*of\s*Birth|Date\s*de\s*naissance|DOB)\s*[:/\-]?\s*\n?\s*"
        r"([0-9]{1,2}\s*[A-Z]{3}\s*[0-9]{4})"
    ),
    "Gender": (
        r"(?:Sex|Sexe|Gender)\s*[:/\-]?\s*\n?\s*([MFX])"
    ),
    "Place of Birth": (
        r"(?:Place\s*of\s*Birth|Lieu\s*de\s*naissance)\s*[:/\-]?\s*\n?\s*([A-Z][A-Z ]+)"
    ),
    "Date of Issue": (
        r"(?:Date\s*of\s*Issue|Date\s*de\s*d[ée]livrance|Issued)\s*[:/\-]?\s*\n?\s*"
        r"([0-9]{1,2}\s*[A-Z]{3}\s*[0-9]{4})"
    ),
    "Date of Expiry": (
        r"(?:Date\s*of\s*Expiry|Date\s*d.?expiration|Expiry|Expires)\s*[:/\-]?\s*\n?\s*"
        r"([0-9]{1,2}\s*[A-Z]{3}\s*[0-9]{4})"
    ),
    "Country Code": (
        r"(?:Country\s*Code|Code\s*du\s*pays)\s*[:/\-]?\s*([A-Z]{3})"
    ),
    "Document Type": (
        r"(?:Type\s*/\s*Type)\s*[:/\-]?\s*([A-Z])"
    ),
}


def _parse_fields_from_text(viz_text: str) -> list[dict]:
    """
    Fallback: extract VIZ fields from the full-region text blob using regex.
    Used when field-specific OCR returns no value for a given label.
    Returns list of dicts: { label, value, confidence, confidenceSource }
    """
    text = _normalize_viz(viz_text)
    results: list[dict] = []
    seen: set[str] = set()

    for label, pattern in _VIZ_PATTERNS.items():
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match and label not in seen:
            raw = match.group(1)
            raw = _reinsert_date_spaces(raw)
            value = _clean(raw)
            if value:
                seen.add(label)
                results.append({
                    "label":            label,
                    "value":            value,
                    "confidence":       50.0,
                    "confidenceSource": "placeholder",
                    "lowConfidence":    True,
                })

    return results


def _normalize_viz_date(value: str) -> str:
    """Normalize VIZ date strings to 'DD MMM YYYY' format."""
    m = re.search(r"\b(\d{1,2})\s*([A-Za-z]{3})\s*(\d{4})\b", value)
    if m:
        return f"{int(m.group(1)):02d} {m.group(2).upper()} {m.group(3)}"
    return value


def parse_fields(result: dict) -> list[dict]:
    """
    Build the final VIZ field list from the OCR result dict.

    Priority:
      1. Structured viz_fields from field-specific OCR (real confidence).
      2. Regex fallback from viz_text for any label not already extracted.

    VIZ fields are extracted independently and never populated from MRZ.

    `result` must contain:
      - "viz_fields": list[dict]  (from ocr_engine field-specific OCR)
      - "viz_text":   str         (full region text blob)

    Returns list of field dicts:
        { label, value, confidence, confidenceSource, lowConfidence }
    """
    structured: list[dict] = result.get("viz_fields", [])
    viz_text:   str         = result.get("viz_text", "")

    # Index fields already extracted by structured OCR
    seen_labels: set[str] = set()
    merged: list[dict] = []

    for f in structured:
        value = _clean(str(f.get("value", "")))
        if not value:
            continue
        label = f.get("label", "")

        # Normalise date spacing and format
        if "Date" in label or "Birth" in label or "Issue" in label or "Expiry" in label:
            value = _reinsert_date_spaces(value)
            value = _normalize_viz_date(value)
            value = _clean(value)
        elif label == "Country Code":
            v_up = value.upper()
            if "IND" in v_up:
                value = "IND"
        elif label == "Nationality":
            v_up = value.upper()
            if "INDIAN" in v_up:
                value = "INDIAN"
        elif label in ("Surname", "Given Names", "Place of Birth"):
            value = value.upper()
            value = re.sub(r"^[^A-Z]+|[^A-Z]+$", "", value)
            value = _clean(value)

        seen_labels.add(label)
        merged.append({
            "label":            label,
            "value":            value,
            "confidence":       round(float(f.get("confidence", 50.0)), 1),
            "confidenceSource": f.get("confidenceSource", "tesseract"),
            "lowConfidence":    f.get("lowConfidence", False),
        })

    # Fill gaps from regex fallback
    for fallback in _parse_fields_from_text(viz_text):
        if fallback["label"] not in seen_labels:
            fb_val = fallback["value"]
            if "Date" in fallback["label"] or "Birth" in fallback["label"] or "Issue" in fallback["label"] or "Expiry" in fallback["label"]:
                fb_val = _normalize_viz_date(fb_val)
            fallback["value"] = fb_val
            seen_labels.add(fallback["label"])
            merged.append(fallback)

    # Build "Full Name" from Surname + Given Names if not already present
    label_map: dict[str, dict] = {f["label"]: f for f in merged}
    if "Full Name" not in label_map:
        surname     = label_map.get("Surname", {}).get("value", "")
        given_names = label_map.get("Given Names", {}).get("value", "")
        if surname or given_names:
            full_name = f"{given_names} {surname}".strip() if given_names else surname
            # Take the lower of the two confidences
            s_conf = label_map.get("Surname", {}).get("confidence", 50.0)
            g_conf = label_map.get("Given Names", {}).get("confidence", 50.0)
            merged.append({
                "label":            "Full Name",
                "value":            full_name,
                "confidence":       round(min(s_conf, g_conf), 1),
                "confidenceSource": "derived",
                "lowConfidence":    min(s_conf, g_conf) < 50.0,
            })

    return merged



# ---------------------------------------------------------------------------
# MRZ parser (ICAO TD3)
# ---------------------------------------------------------------------------

from ocr_engine import normalize_mrz

_ICAO_WEIGHTS: list[int] = [7, 3, 1]
_ICAO_CHAR_VALUES: dict[str, int] = {
    "<": 0,
    **{str(d): d for d in range(10)},
    **{chr(ord("A") + i): i + 10 for i in range(26)},
}


def _icao_check(s: str) -> int:
    """Compute the ICAO 9303 check digit for string `s` using weights [7, 3, 1]."""
    total = 0
    for i, ch in enumerate(s):
        total += _ICAO_CHAR_VALUES.get(ch.upper(), 0) * _ICAO_WEIGHTS[i % 3]
    return total % 10


def _fix_mrz_digits(s: str) -> str:
    """
    Replace letters that Tesseract commonly misreads as digits in
    digit-only MRZ subfields (dates, check digits).
    Safe to apply only to positions that must be numeric.
    """
    return (
        s.replace("O", "0")
         .replace("I", "1")
         .replace("B", "8")
         .replace("D", "0")
         .replace("Z", "2")
         .replace("S", "5")
         .replace("G", "6")
         .replace("Q", "0")
         .replace("L", "1")
    )


def _mrz_date(yymmdd: str, is_expiry: bool = False) -> str:
    """
    Convert YYMMDD → 'DD MMM YYYY'.
    For DOB: years cannot be in the future (relative to current year).
    For Expiry: future years or recent validity window.
    Returns the original string unchanged if parsing fails.
    """
    if len(yymmdd) != 6 or not yymmdd.isdigit():
        return yymmdd
    yy, mm, dd = int(yymmdd[:2]), int(yymmdd[2:4]), int(yymmdd[4:6])
    now_year = datetime.now().year
    current_yy = now_year % 100

    if is_expiry:
        year = 2000 + yy if yy <= current_yy + 50 else 1900 + yy
    else:
        year = 2000 + yy if yy <= current_yy else 1900 + yy

    months = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return yymmdd
    return f"{dd:02d} {months[mm]} {year}"


def _strip_filler(s: str) -> str:
    """Remove MRZ filler '<' and trim whitespace."""
    return s.rstrip("<").replace("<", " ").strip()


def parse_mrz(result: dict) -> dict:
    """
    Parse ICAO TD3 MRZ from the OCR result dict.

    TD3 Structure:
      Line 1 (44 chars):
        0-1   Document code (P<)
        2-4   Issuing country / state (3 chars)
        5-43  Name (SURNAME<<GIVEN<NAMES padded with <)

      Line 2 (44 chars):
        0-8   Document number (9 chars)
        9     Document number check digit (1 char)
        10-12 Nationality (3 chars)
        13-18 Date of birth YYMMDD (6 chars)
        19    DOB check digit (1 char)
        20    Sex (M, F, or <)
        21-26 Date of expiry YYMMDD (6 chars)
        27    Expiry check digit (1 char)
        28-42 Optional data (15 chars)
        43    Composite check digit (1 char)

    Returns backward-compatible and structured metadata:
      mrzDetected, mrzComplete, line1, line2,
      documentType, issuingCountry, surname, givenName, givenNames,
      holderName, documentNumber, nationality, dob, gender, expiryDate, optionalData,
      checksumStatus: { documentNumber, dateOfBirth, expiryDate, composite },
      parseWarnings: list[str],
      checksumValidation, compositeChecksumValid, checksumDetails.
    """
    warnings: list[str] = []

    lines = result.get("mrz_lines", [])
    if not lines and result.get("mrz_raw"):
        lines = normalize_mrz(result["mrz_raw"])

    mrz_detected = len(lines) >= 2
    if not mrz_detected:
        if len(lines) == 1:
            warnings.append("Only 1 MRZ line detected; TD3 requires 2 lines")
        else:
            warnings.append("No MRZ lines detected")

        return {
            "mrzDetected":             False,
            "mrzComplete":              False,
            "line1":                    lines[0] if len(lines) > 0 else "",
            "line2":                    "",
            "documentType":             "",
            "issuingCountry":           "",
            "surname":                  "",
            "givenName":                "",
            "givenNames":               "",
            "holderName":               "",
            "documentNumber":           "",
            "nationality":              "",
            "dob":                      "",
            "gender":                   "",
            "expiryDate":               "",
            "optionalData":             "",
            "checksumStatus": {
                "documentNumber": "UNAVAILABLE",
                "dateOfBirth":    "UNAVAILABLE",
                "expiryDate":     "UNAVAILABLE",
                "composite":      "UNAVAILABLE",
            },
            "parseWarnings":            warnings,
            "checksumValidation": {
                "docNumber":   "UNVERIFIABLE",
                "dob":         "UNVERIFIABLE",
                "expiry":      "UNVERIFIABLE",
                "composite":   "UNVERIFIABLE",
            },
            "compositeChecksumValid":   False,
            "checksumDetails": {
                "docNumberValid": False,
                "dobValid":       False,
                "expiryValid":    False,
                "compositeValid": False,
            },
        }

    line1: str = lines[0]
    line2: str = lines[1]

    if len(line1) < 44:
        warnings.append(f"MRZ line 1 is incomplete ({len(line1)}/44 characters)")
    if len(line2) < 44:
        warnings.append(f"MRZ line 2 is incomplete ({len(line2)}/44 characters)")

    mrz_complete = (len(line1) == 44 and len(line2) == 44)

    # ── Line 1 Parsing ────────────────────────────────────────────────────────
    # 0-1: Document type (TD3 passport: 'P<' or 'P' + char)
    raw_doc_type = line1[0:2] if len(line1) >= 2 else "P<"
    doc_type = "P<" if raw_doc_type.startswith("P") else raw_doc_type

    # 2-4: Issuing country (3 chars)
    issuing_country = line1[2:5] if len(line1) >= 5 else ""
    issuing_country = issuing_country.replace("<", "").strip()

    # 5-43: Name (SURNAME<<GIVEN<NAMES padded with <)
    raw_name = line1[5:] if len(line1) >= 5 else ""
    # Clean filler noise runs from name
    raw_name_cleaned = re.sub(r"<[CKL<]{4,}$", "", raw_name)

    if "<<" in raw_name_cleaned:
        parts = raw_name_cleaned.split("<<", 1)
        surname = parts[0].replace("<", " ").strip()
        giv_raw = parts[1]
    else:
        # Fallback if << was OCR-read as <S< or <C<
        m_sep = re.search(r"<[SCK]<[SCK]?", raw_name_cleaned)
        if m_sep:
            surname = raw_name_cleaned[:m_sep.start()].replace("<", " ").strip()
            giv_raw = raw_name_cleaned[m_sep.end():]
        else:
            surname = raw_name_cleaned.replace("<", " ").strip()
            giv_raw = ""

    # Clean filler from given names:
    giv_clean = re.sub(r"<[CKL<]{2,}$", "", giv_raw)
    giv_clean = re.sub(r"(?:<[CKLS])+$", "", giv_clean)
    giv_clean = giv_clean.rstrip("<").replace("<", " ").strip()
    words = giv_clean.split()
    if len(words) > 1 and words[-1] in ("C", "K", "L", "S") and len(words[-1]) == 1:
        words.pop()
    given_name = " ".join(words)
    holder_name = f"{given_name} {surname}".strip() if given_name else surname

    # ── Line 2 Parsing ────────────────────────────────────────────────────────
    # 0-8: Document number (9 alphanumeric characters)
    doc_number_raw = line2[0:9] if len(line2) >= 9 else ""
    doc_number = doc_number_raw.rstrip("<")

    # 9: Document number check digit
    doc_number_check = _fix_mrz_digits(line2[9]) if len(line2) >= 10 else ""

    # 10-12: Nationality (3 alpha characters)
    nationality_raw = line2[10:13] if len(line2) >= 13 else ""
    nationality = nationality_raw.rstrip("<")

    # 13-18: Date of birth (6 digits: YYMMDD)
    dob_raw = _fix_mrz_digits(line2[13:19]) if len(line2) >= 19 else ""

    # 19: DOB check digit (1 digit)
    dob_check = _fix_mrz_digits(line2[19]) if len(line2) >= 20 else ""

    # 20: Sex (M, F, or <)
    sex_char = line2[20] if len(line2) >= 21 else ""
    gender = sex_char if sex_char in ("M", "F") else ""

    # 21-26: Date of expiry (6 digits: YYMMDD)
    expiry_raw = _fix_mrz_digits(line2[21:27]) if len(line2) >= 27 else ""

    # 27: Expiry check digit (1 digit)
    expiry_check = _fix_mrz_digits(line2[27]) if len(line2) >= 28 else ""

    # 28-42: Optional data (15 characters)
    optional_raw = line2[28:43] if len(line2) >= 28 else ""
    optional_data = optional_raw.rstrip("<")

    # 43: Composite check digit (1 digit)
    composite_check = _fix_mrz_digits(line2[43]) if len(line2) >= 44 else ""

    # ── Checksum Validations ──────────────────────────────────────────────────
    def _eval_checksum(data: str, expected_digit: str, ready: bool) -> str:
        if not ready or not expected_digit or not expected_digit.isdigit():
            return "UNAVAILABLE"
        computed = _icao_check(data)
        return "VALID" if computed == int(expected_digit) else "INVALID"

    # Document number checksum
    doc_chk_status = _eval_checksum(
        doc_number_raw, doc_number_check, len(line2) >= 10 and len(doc_number_raw) == 9
    )

    # Date of birth checksum
    dob_chk_status = _eval_checksum(
        dob_raw, dob_check, len(line2) >= 20 and len(dob_raw) == 6 and dob_raw.isdigit()
    )

    # Date of expiry checksum
    exp_chk_status = _eval_checksum(
        expiry_raw, expiry_check, len(line2) >= 28 and len(expiry_raw) == 6 and expiry_raw.isdigit()
    )

    # Composite checksum
    # TD3 composite string: line2[0:10] + line2[13:20] + line2[21:28] + line2[28:43]
    if len(line2) >= 44:
        composite_data = (
            line2[0:9] + doc_number_check
            + dob_raw + dob_check
            + expiry_raw + expiry_check
            + line2[28:43]
        )
        comp_chk_status = _eval_checksum(composite_data, composite_check, True)
    else:
        comp_chk_status = "UNAVAILABLE"

    # Backward compatibility flags
    doc_valid = (doc_chk_status == "VALID")
    dob_valid = (dob_chk_status == "VALID")
    exp_valid = (exp_chk_status == "VALID")
    comp_valid = (comp_chk_status == "VALID")

    def _chk_val_compat(stat: str) -> str:
        if stat == "VALID":
            return "PASS"
        if stat == "INVALID":
            return "FAIL"
        return "UNVERIFIABLE"

    checksum_status = {
        "documentNumber": doc_chk_status,
        "dateOfBirth":    dob_chk_status,
        "expiryDate":     exp_chk_status,
        "composite":      comp_chk_status,
    }

    return {
        "mrzDetected":             mrz_detected,
        "mrzComplete":              mrz_complete,
        "line1":                    line1,
        "line2":                    line2,
        "documentType":             doc_type,
        "issuingCountry":           issuing_country,
        "surname":                  surname,
        "givenName":                given_name,
        "givenNames":               given_name,
        "holderName":               holder_name,
        "documentNumber":           doc_number,
        "nationality":              nationality,
        "dob":                      _mrz_date(dob_raw, is_expiry=False),
        "gender":                   gender,
        "expiryDate":               _mrz_date(expiry_raw, is_expiry=True),
        "optionalData":             optional_data,
        "checksumStatus":           checksum_status,
        "parseWarnings":            warnings,
        "checksumValidation": {
            "docNumber":   _chk_val_compat(doc_chk_status),
            "dob":         _chk_val_compat(dob_chk_status),
            "expiry":      _chk_val_compat(exp_chk_status),
            "composite":   _chk_val_compat(comp_chk_status),
        },
        "compositeChecksumValid":   comp_valid,
        "checksumDetails": {
            "docNumberValid": doc_valid,
            "dobValid":       dob_valid,
            "expiryValid":    exp_valid,
            "compositeValid": comp_valid,
        },
    }
