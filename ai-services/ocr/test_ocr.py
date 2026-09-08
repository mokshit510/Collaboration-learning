import os
import sys

# If no image argument is provided, print usage immediately and exit cleanly
if len(sys.argv) < 2:
    print("Usage:")
    print("python test_ocr.py <image_path>")
    sys.exit(0)

# If running with an interpreter that doesn't have the dependencies, fallback to .venv python
try:
    import cv2
    import pytesseract
except ImportError:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(script_dir, ".venv", "bin", "python")
    if os.path.exists(venv_python) and sys.executable != venv_python:
        os.execv(venv_python, [venv_python] + sys.argv)
    else:
        raise

from ocr_engine import extract_text
from field_parser import parse_fields, parse_mrz


def test_icao_algorithm():
    """
    Deterministic unit test for the ICAO 9303 check-digit algorithm using
    official synthetic TD3 passport test samples.
    """
    # Sample 1: Official ICAO Doc 9303 sample (Anna Maria Eriksson)
    sample1 = {
        "mrz_lines": [
            "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
            "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
        ]
    }
    res1 = parse_mrz(sample1)
    assert res1["mrzComplete"] is True, "Sample 1 should be complete"
    assert res1["checksumStatus"]["documentNumber"] == "VALID", "Doc checksum must be VALID"
    assert res1["checksumStatus"]["dateOfBirth"] == "VALID", "DOB checksum must be VALID"
    assert res1["checksumStatus"]["expiryDate"] == "VALID", "Expiry checksum must be VALID"
    assert res1["checksumStatus"]["composite"] == "VALID", "Composite checksum must be VALID"
    assert res1["documentNumber"] == "L898902C3"
    assert res1["surname"] == "ERIKSSON"
    assert res1["givenName"] == "ANNA MARIA"
    assert res1["nationality"] == "UTO"
    assert res1["gender"] == "F"

    # Sample 2: Official ICAO Doc 9303 sample (John Smith)
    sample2 = {
        "mrz_lines": [
            "P<UTOSMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
            "D231458907UTO3407127F9507122<<<<<<<<<<<<<<<2",
        ]
    }
    res2 = parse_mrz(sample2)
    assert res2["mrzComplete"] is True, "Sample 2 should be complete"
    assert res2["checksumStatus"]["documentNumber"] == "VALID"
    assert res2["checksumStatus"]["dateOfBirth"] == "VALID"
    assert res2["checksumStatus"]["expiryDate"] == "VALID"
    assert res2["checksumStatus"]["composite"] == "VALID"

    # Sample 3: Deliberate checksum error check
    sample3 = {
        "mrz_lines": [
            "P<UTOSMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
            "D231458909UTO3407127F9507122<<<<<<<<<<<<<<<2",  # Check digit changed 7 -> 9
        ]
    }
    res3 = parse_mrz(sample3)
    assert res3["checksumStatus"]["documentNumber"] == "INVALID"

    # Sample 4: Incomplete line check (43 chars instead of 44)
    sample4 = {
        "mrz_lines": [
            "P<UTOSMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
            "D231458907UTO3407127F9507122<<<<<<<<<<<<<<<",  # 43 chars
        ]
    }
    res4 = parse_mrz(sample4)
    assert res4["mrzComplete"] is False
    assert res4["checksumStatus"]["composite"] == "UNAVAILABLE"

    return True


def main():
    # Handle unit-test flag
    if sys.argv[1] == "--unit-test":
        test_icao_algorithm()
        print("Deterministic ICAO 9303 check-digit unit tests: ALL PASSED")
        sys.exit(0)

    # Always verify deterministic ICAO unit tests
    test_icao_algorithm()

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found.")
        sys.exit(1)

    try:
        raw_result = extract_text(image_path)
        fields = parse_fields(raw_result)
        mrz_parsed = parse_mrz(raw_result)
    except Exception as e:
        print(f"OCR Error: {e}")
        sys.exit(1)

    def get_viz_field(labels: list[str]) -> str:
        for l in labels:
            for f in fields:
                if f.get("label", "").lower() == l.lower():
                    val = f.get("value")
                    if val is not None and str(val).strip():
                        return str(val).strip()
        return "NOT EXTRACTED"

    doc_type = get_viz_field(["Document Type", "Type"])
    country = get_viz_field(["Country Code", "Country"])
    full_name = get_viz_field(["Full Name", "Name"])
    surname = get_viz_field(["Surname"])
    given_name = get_viz_field(["Given Names", "Given Name"])
    passport_num = get_viz_field(["Passport Number", "Passport No"])
    nationality = get_viz_field(["Nationality"])
    dob = get_viz_field(["Date of Birth", "DOB"])
    gender = get_viz_field(["Gender", "Sex"])
    place_of_birth = get_viz_field(["Place of Birth"])
    issue_date = get_viz_field(["Date of Issue", "Issue Date"])
    expiry_date = get_viz_field(["Date of Expiry", "Expiry Date"])

    mrz_lines = raw_result.get("mrz_lines", [])
    mrz_line1 = (mrz_lines[0] if len(mrz_lines) > 0 and mrz_lines[0] else raw_result.get("mrz_line1")) or "NOT EXTRACTED"
    mrz_line2 = (mrz_lines[1] if len(mrz_lines) > 1 and mrz_lines[1] else raw_result.get("mrz_line2")) or "NOT EXTRACTED"

    l1_len = len(mrz_line1) if mrz_line1 != "NOT EXTRACTED" else 0
    l2_len = len(mrz_line2) if mrz_line2 != "NOT EXTRACTED" else 0

    parsed_doc_num = mrz_parsed.get("documentNumber") or "NOT EXTRACTED"
    parsed_nationality = mrz_parsed.get("nationality") or "NOT EXTRACTED"
    parsed_dob = mrz_parsed.get("dob") or "NOT EXTRACTED"
    parsed_gender = mrz_parsed.get("gender") or "NOT EXTRACTED"
    parsed_expiry = mrz_parsed.get("expiryDate") or "NOT EXTRACTED"
    parsed_issuing_country = mrz_parsed.get("issuingCountry") or "NOT EXTRACTED"
    parsed_doc_type = mrz_parsed.get("documentType") or "NOT EXTRACTED"
    parsed_surname = mrz_parsed.get("surname") or "NOT EXTRACTED"
    parsed_given_name = mrz_parsed.get("givenName") or "NOT EXTRACTED"

    checksum_status = mrz_parsed.get("checksumStatus", {})
    chk_doc = checksum_status.get("documentNumber", "UNAVAILABLE")
    chk_dob = checksum_status.get("dateOfBirth", "UNAVAILABLE")
    chk_exp = checksum_status.get("expiryDate", "UNAVAILABLE")
    chk_comp = checksum_status.get("composite", "UNAVAILABLE")

    warnings = list(dict.fromkeys(raw_result.get("warnings", []) + mrz_parsed.get("parseWarnings", [])))

    confs = [
        float(f["confidence"])
        for f in fields
        if f.get("confidence") is not None and float(f.get("confidence", -1)) >= 0
    ]
    if confs:
        mean_val = sum(confs) / len(confs)
        avg_confidence = f"{round(mean_val, 1)}%"
        status = "OPTIMAL" if mean_val >= 90 else "MODERATE" if mean_val >= 75 else "LOW"
    else:
        avg_confidence = "NOT EXTRACTED"
        status = "LOW"

    sources = list(dict.fromkeys(f.get("confidenceSource") for f in fields if f.get("confidenceSource")))
    confidence_source = ", ".join(sources) if sources else "NOT EXTRACTED"

    print("========================================")
    print("OCR TEST RESULT")
    print("========================================")
    print()
    print("Input:")
    print(image_path)
    print()
    print("VIZ")
    print("----------------------------------------")
    print(f"Document Type: {doc_type}")
    print(f"Country: {country}")
    print(f"Full Name: {full_name}")
    print(f"Surname: {surname}")
    print(f"Given Name: {given_name}")
    print(f"Passport Number: {passport_num}")
    print(f"Nationality: {nationality}")
    print(f"DOB: {dob}")
    print(f"Gender: {gender}")
    print(f"Place of Birth: {place_of_birth}")
    print(f"Issue Date: {issue_date}")
    print(f"Expiry Date: {expiry_date}")
    print()
    print("MRZ")
    print("----------------------------------------")
    print(f"Detected: {'YES' if mrz_parsed.get('mrzDetected') else 'NO'}")
    print(f"Complete: {'YES' if mrz_parsed.get('mrzComplete') else 'NO'}")
    print(f"Line 1 (len: {l1_len}): {mrz_line1}")
    print(f"Line 2 (len: {l2_len}): {mrz_line2}")
    print()
    print("PARSED MRZ")
    print("----------------------------------------")
    print(f"Document Type: {parsed_doc_type}")
    print(f"Issuing Country: {parsed_issuing_country}")
    print(f"Surname: {parsed_surname}")
    print(f"Given Name: {parsed_given_name}")
    print(f"Document Number: {parsed_doc_num}")
    print(f"Nationality: {parsed_nationality}")
    print(f"DOB: {parsed_dob}")
    print(f"Gender: {parsed_gender}")
    print(f"Expiry: {parsed_expiry}")
    print()
    print("CHECKSUMS")
    print("----------------------------------------")
    print(f"Document Number: {chk_doc}")
    print(f"Date of Birth: {chk_dob}")
    print(f"Expiry Date: {chk_exp}")
    print(f"Composite: {chk_comp}")
    print()
    print("WARNINGS")
    print("----------------------------------------")
    if warnings:
        for w in warnings:
            print(f"- {w}")
    else:
        print("None")
    print()
    print("QUALITY")
    print("----------------------------------------")
    print(f"Status: {status}")
    print(f"Average Confidence: {avg_confidence}")
    print(f"Confidence Source: {confidence_source}")
    print()
    print("========================================")


if __name__ == "__main__":
    main()
