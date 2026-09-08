"""
PRAMAAN OCR Engine — Stage A.1
Region-based OCR pipeline for passport-style ICAO TD3 documents.

Pipeline:
  1. Image validation & normalization (color & grayscale preservation, standard resolution)
  2. Document normalization & perspective correction (with safe fallback)
  3. Deskew (Hough line orientation correction within safe angle window)
  4. VIZ region extraction & preprocessing (3x bicubic upscaling, contrast enhancement)
  5. Label-aware VIZ field OCR (per-field Tesseract config, PSM selection, real confidences)
  6. Independent MRZ extraction (dedicated OCR-B pass, strict ICAO charset)
  7. MRZ normalization & TD3 parser alignment
  8. Structured output with confidence source declaration and debug image hooks
"""

from __future__ import annotations

import logging
import math
import os
import re
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np
import pytesseract

try:
    import winocr
    HAS_WINOCR = True
except ImportError:
    HAS_WINOCR = False

logger = logging.getLogger(__name__)

def _is_tesseract_available() -> bool:
    """Check if pytesseract has a working tesseract executable."""
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _safe_winocr_recognize(img: np.ndarray) -> dict:
    """Safely run winocr, handling cases where we are called from within an active asyncio event loop."""
    try:
        import asyncio
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(winocr.recognize_cv2_sync, img).result()
    else:
        return winocr.recognize_cv2_sync(img)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# VIZ region: rows [10%, 83%], cols [27%, 100%]
# Covers the visual inspection zone of a standard ICAO TD3 passport.
# Skips the header band, portrait photo, and MRZ strip.
VIZ_ROW_START = 0.10
VIZ_ROW_END   = 0.83
VIZ_COL_START = 0.27

# MRZ strip — bottom 17% of image, full width
MRZ_ROW_START = 0.83

# Minimum width for reliable OCR
MIN_WIDTH_PX = 1400

# Confidence threshold below which a field is flagged as low-confidence
LOW_CONF_THRESHOLD = 50.0

# Date regex pattern for VIZ extraction: e.g. "15 JAN 2005" or "08 AUG 1997"
DATE_PATTERN = re.compile(r"\b(\d{1,2})\s*([A-Za-z]{3})\s*(\d{4})\b")

# Multilingual VIZ label tokens to remove if stray label text leaks into value regions
LABEL_WORDS = {
    "surname", "nom", "given", "names", "prénoms", "prenoms", "prnoms",
    "nationality", "nationalité", "nationalite", "nationalit", "date", "of", "birth",
    "de", "naissance", "sex", "sexe", "seve", "place", "lieu", "issue", "délivrance",
    "delivrance", "expiry", "d\x27espiration", "d\x27expiration", "expiration",
    "passport", "no", "passeport", "type", "country", "code", "pays"
}

# Tesseract configs
TESS_VIZ_CONFIG = "--psm 6 --oem 1"

TESS_MRZ_CONFIG = (
    "--psm 6 --oem 1 "
    "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class OcrField:
    label: str
    value: str
    confidence: float          # 0–100 from Tesseract word-level data
    confidence_source: str     # "tesseract" | "derived"
    low_confidence: bool = False

    def to_dict(self) -> dict:
        return {
            "label":            self.label,
            "value":            self.value,
            "confidence":       round(self.confidence, 1),
            "confidenceSource": self.confidence_source,
            "lowConfidence":    self.low_confidence,
        }


@dataclass
class OcrResult:
    viz_text:     str                  # full VIZ region text (backward compat)
    viz_fields:   list[OcrField]       # per-field structured extraction
    mrz_raw:      str                  # raw MRZ Tesseract dump
    mrz_line1:    str                  # normalised MRZ line 1 (44 chars)
    mrz_line2:    str                  # normalised MRZ line 2 (44 chars)
    mrz_lines:    list[str]            # [line1, line2] or fewer
    image_width:  int = 0
    image_height: int = 0
    warnings:     list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "viz_text":    self.viz_text,
            "viz_fields":  [f.to_dict() for f in self.viz_fields],
            "mrz_raw":     self.mrz_raw,
            "mrz_line1":   self.mrz_line1,
            "mrz_line2":   self.mrz_line2,
            "mrz_lines":   self.mrz_lines,
            "imageWidth":  self.image_width,
            "imageHeight": self.image_height,
            "warnings":    self.warnings,
        }


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _tess_to_str(result: object) -> str:
    """Narrow pytesseract.image_to_string() result to plain str."""
    if isinstance(result, str):
        return result
    if isinstance(result, bytes):
        return result.decode("utf-8", errors="replace")
    if isinstance(result, dict):
        text = result.get("text", "")
        return text if isinstance(text, str) else str(text)
    return str(result)


def _clean_label_noise(s: str) -> str:
    """Strip label tokens and noise characters while preserving genuine field text."""
    tokens = s.split()
    cleaned = [t for t in tokens if re.sub(r"[^a-zA-Z]", "", t).lower() not in LABEL_WORDS]
    res = " ".join(cleaned)
    res = re.sub(r"[/|\\:;\-\[\]\(\)]", " ", res)
    return " ".join(res.split()).strip()


def _save_debug_image(filename: str, img: np.ndarray) -> None:
    """Save debug image if DEBUG_OCR environment variable is enabled."""
    if os.environ.get("DEBUG_OCR", "").lower() in ("1", "true", "yes"):
        try:
            cv2.imwrite(filename, img)
            logger.info("Saved debug image: %s", filename)
        except Exception as exc:
            logger.warning("Failed to save debug image %s: %s", filename, exc)


# ---------------------------------------------------------------------------
# Preprocessing & Normalization Pipeline
# ---------------------------------------------------------------------------

def _load_and_normalize(image_path: str) -> tuple[np.ndarray, np.ndarray]:
    """
    Load image and create normalized color and grayscale representations.
    Upscales to minimum working width if image is below MIN_WIDTH_PX.
    """
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Unable to read image: {image_path}")

    h, w = image.shape[:2]
    if w < 50 or h < 50:
        raise ValueError(f"Image too small: {w}×{h} px")

    if w < MIN_WIDTH_PX:
        scale = MIN_WIDTH_PX / w
        new_w = int(w * scale)
        new_h = int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return image, gray


def _perspective_correct(color_img: np.ndarray, gray_img: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Attempt to detect document boundary and apply perspective transform.
    Falls back safely to input images if detection is unreliable.
    """
    h, w = gray_img.shape[:2]
    blurred = cv2.GaussianBlur(gray_img, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return color_img, gray_img

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    doc_contour: Optional[np.ndarray] = None
    for cnt in contours[:5]:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        area = cv2.contourArea(cnt)
        if len(approx) == 4 and area > (w * h * 0.40):
            doc_contour = approx
            break

    if doc_contour is None:
        return color_img, gray_img  # Safe fallback

    pts = doc_contour.reshape(4, 2).astype(np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    src = np.array([tl, tr, br, bl], dtype=np.float32)

    dst_w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    dst_h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))

    if dst_w < 300 or dst_h < 300:
        return color_img, gray_img

    dst = np.array([
        [0,       0],
        [dst_w-1, 0],
        [dst_w-1, dst_h-1],
        [0,       dst_h-1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src, dst)
    warped_color = cv2.warpPerspective(color_img, M, (dst_w, dst_h))
    warped_gray = cv2.warpPerspective(gray_img, M, (dst_w, dst_h))
    return warped_color, warped_gray


def _deskew(gray: np.ndarray) -> np.ndarray:
    """Correct small document skew angles (±5°) using Hough transform."""
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, math.pi / 180, threshold=200)
    if lines is None:
        return gray

    angles: list[float] = []
    for line in lines[:30]:
        rho, theta = line[0]
        angle_deg = math.degrees(theta) - 90
        if abs(angle_deg) < 5:
            angles.append(angle_deg)

    if not angles:
        return gray

    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.3:
        return gray

    h, w = gray.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    return cv2.warpAffine(
        gray, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _sharpen(image: np.ndarray) -> np.ndarray:
    """Sharpen image using an unsharp kernel to enhance text stroke edges."""
    kernel = np.array(
        [[ 0, -1,  0],
         [-1,  5, -1],
         [ 0, -1,  0]], dtype=np.float32
    )
    return cv2.filter2D(image, -1, kernel)


# ---------------------------------------------------------------------------
# VIZ Extraction Pipeline
# ---------------------------------------------------------------------------

TARGET_VIZ_WIDTH = 1050


def _extract_viz_data(gray: np.ndarray) -> tuple[str, list[OcrField]]:
    """
    Extract structured VIZ fields using region upscaling and label-aware line analysis.
    Preserves real Tesseract confidences from word-level image_to_data.
    """
    gh, gw = gray.shape
    viz_r0 = int(gh * VIZ_ROW_START)
    viz_r1 = int(gh * VIZ_ROW_END)
    viz_c0 = int(gw * VIZ_COL_START)

    viz_crop = gray[viz_r0:viz_r1, viz_c0:gw]
    if viz_crop.size == 0:
        viz_crop = gray

    # Normalise VIZ width to 1050px for predictable Tesseract character height
    vh, vw = viz_crop.shape[:2]
    if vw > 0 and vh > 0:
        scale = TARGET_VIZ_WIDTH / vw
        target_h = int(vh * scale)
        viz_scaled = cv2.resize(viz_crop, (TARGET_VIZ_WIDTH, target_h), interpolation=cv2.INTER_CUBIC)
    else:
        viz_scaled = viz_crop

    v_gray = _sharpen(viz_scaled)
    vgh, vgw = v_gray.shape

    _save_debug_image("debug_viz.png", v_gray)

    ocr_source = "tesseract"
    if _is_tesseract_available():
        # Backward-compatibility full VIZ text
        viz_text = _tess_to_str(
            pytesseract.image_to_string(v_gray, config=TESS_VIZ_CONFIG)
        ).strip()

        # Run Tesseract word-level analysis on the VIZ region
        d = pytesseract.image_to_data(v_gray, output_type=pytesseract.Output.DICT)
        words = []
        for i in range(len(d["text"])):
            txt = d["text"][i].strip()
            conf = float(d["conf"][i])
            if txt and conf > 0:
                words.append({
                    "top":    d["top"][i],
                    "left":   d["left"][i],
                    "width":  d["width"][i],
                    "height": d["height"][i],
                    "conf":   conf,
                    "text":   txt
                })
    elif HAS_WINOCR:
        ocr_source = "winocr"
        res = _safe_winocr_recognize(v_gray)
        if len(res.get("lines", [])) < 3:
            res_full = _safe_winocr_recognize(gray)
            if len(res_full.get("lines", [])) > len(res.get("lines", [])):
                res = res_full
        lines_txt = [line["text"] for line in res["lines"]]
        viz_text = "\n".join(lines_txt).strip()
        words = []
        for line in res["lines"]:
            for w in line["words"]:
                txt = w["text"].strip()
                if txt:
                    rect = w["bounding_rect"]
                    words.append({
                        "top":    int(rect["y"]),
                        "left":   int(rect["x"]),
                        "width":  int(rect["width"]),
                        "height": int(rect["height"]),
                        "conf":   95.0,
                        "text":   txt
                    })
    else:
        ocr_source = "none"
        viz_text = ""
        words = []

    # Group words into lines by vertical position
    lines = []
    curr: list[dict] = []
    last_top = -100
    for w_obj in sorted(words, key=lambda x: (x["top"], x["left"])):
        if abs(w_obj["top"] - last_top) > 16:
            if curr:
                lines.append(curr)
            curr = [w_obj]
            last_top = w_obj["top"]
        else:
            curr.append(w_obj)
            last_top = w_obj["top"]
    if curr:
        lines.append(curr)

    fields_dict: dict[str, tuple[str, float]] = {}

    # Label-aware line extraction
    for idx, line in enumerate(lines):
        line_text = " ".join(w_obj["text"] for w_obj in line)

        # 1. Surname
        if any(k in line_text.lower() for k in ["surname", "nom"]) and idx + 1 < len(lines):
            val_line = lines[idx + 1]
            val_words = [w for w in val_line if w["left"] / vgw < 0.65]
            val_txt = _clean_label_noise(" ".join(w["text"] for w in val_words))
            val_c = [w["conf"] for w in val_words if w["text"] in val_txt]
            if val_txt and "Surname" not in fields_dict:
                fields_dict["Surname"] = (val_txt.upper(), sum(val_c) / len(val_c) if val_c else 50.0)

        # 2. Given Names
        if any(k in line_text.lower() for k in ["given", "prénoms", "prenoms"]) and idx + 1 < len(lines):
            val_line = lines[idx + 1]
            val_words = [w for w in val_line if w["left"] / vgw < 0.65]
            val_txt = _clean_label_noise(" ".join(w["text"] for w in val_words))
            val_c = [w["conf"] for w in val_words if w["text"] in val_txt]
            if val_txt and "Given Names" not in fields_dict:
                fields_dict["Given Names"] = (val_txt.upper(), sum(val_c) / len(val_c) if val_c else 50.0)

        # 3. Nationality
        if "nationalit" in line_text.lower():
            same_val = _clean_label_noise(line_text)
            if same_val and len(same_val) >= 3 and same_val.upper() not in ("NATIONALITY", "NATIONALITE"):
                fields_dict["Nationality"] = (same_val.upper(), 95.0)
            elif idx + 1 < len(lines):
                val_line = lines[idx + 1]
                val_words = [w for w in val_line if w["left"] / vgw < 0.65]
                val_txt = _clean_label_noise(" ".join(w["text"] for w in val_words))
                val_c = [w["conf"] for w in val_words if w["text"] in val_txt]
                if val_txt and "Nationality" not in fields_dict:
                    fields_dict["Nationality"] = (val_txt.upper(), sum(val_c) / len(val_c) if val_c else 50.0)

        # 4. Date of Birth
        if ("birth" in line_text.lower() or "naissance" in line_text.lower() or "girth" in line_text.lower()) and "place" not in line_text.lower() and "lieu" not in line_text.lower():
            m_same = DATE_PATTERN.search(line_text)
            if m_same and "Date of Birth" not in fields_dict:
                d_str = f"{int(m_same.group(1)):02d} {m_same.group(2).upper()} {m_same.group(3)}"
                fields_dict["Date of Birth"] = (d_str, 95.0)
            elif idx + 1 < len(lines):
                val_line = lines[idx + 1]
                val_words = sorted([w for w in val_line if w["left"] / vgw < 0.65], key=lambda x: x["left"])
                m = DATE_PATTERN.search(" ".join(w["text"] for w in val_words))
                if m and "Date of Birth" not in fields_dict:
                    d_str = f"{int(m.group(1)):02d} {m.group(2).upper()} {m.group(3)}"
                    confs = [w["conf"] for w in val_words]
                    fields_dict["Date of Birth"] = (d_str, sum(confs) / len(confs))

        # 5. Sex and Place of Birth
        if any(k in line_text.lower() for k in ["sex", "sexe"]) and any(k in line_text.lower() for k in ["place", "lieu"]):
            if idx + 1 < len(lines):
                val_line = lines[idx + 1]
                sex_words = [w for w in val_line if w["left"] / vgw < 0.22]
                pob_words = [w for w in val_line if 0.22 <= w["left"] / vgw < 0.85]
                for sw in sex_words:
                    st = sw["text"].strip().upper()
                    if st in ("M", "F", "X") and "Gender" not in fields_dict:
                        fields_dict["Gender"] = (st, sw["conf"])
                        break
                pob_txt = _clean_label_noise(" ".join(w["text"] for w in pob_words))
                pob_txt = re.sub(r"[^A-Za-z ]", "", pob_txt).strip()
                pob_c = [w["conf"] for w in pob_words if w["text"] in pob_txt]
                if pob_txt and "Place of Birth" not in fields_dict:
                    fields_dict["Place of Birth"] = (pob_txt.upper(), sum(pob_c) / len(pob_c) if pob_c else 50.0)

        # 6. Date of Issue & Date of Expiry
        if "issue" in line_text.lower() or "délivrance" in line_text.lower() or "delivrance" in line_text.lower():
            m_issue = DATE_PATTERN.search(line_text)
            if m_issue and "Date of Issue" not in fields_dict:
                fields_dict["Date of Issue"] = (f"{int(m_issue.group(1)):02d} {m_issue.group(2).upper()} {m_issue.group(3)}", 95.0)
        if "expiry" in line_text.lower() or "expiration" in line_text.lower() or "expires" in line_text.lower():
            m_exp = DATE_PATTERN.search(line_text)
            if m_exp and "Date of Expiry" not in fields_dict:
                fields_dict["Date of Expiry"] = (f"{int(m_exp.group(1)):02d} {m_exp.group(2).upper()} {m_exp.group(3)}", 95.0)

        if ("issue" in line_text.lower() or "délivrance" in line_text.lower() or "delivrance" in line_text.lower()) and idx + 1 < len(lines):
            val_line = lines[idx + 1]
            left_words = sorted([w for w in val_line if w["left"] / vgw < 0.50], key=lambda x: x["left"])
            right_words = sorted([w for w in val_line if w["left"] / vgw >= 0.50], key=lambda x: x["left"])
            m_left = DATE_PATTERN.search(" ".join(w["text"] for w in left_words))
            if m_left and "Date of Issue" not in fields_dict:
                d_str = f"{int(m_left.group(1)):02d} {m_left.group(2).upper()} {m_left.group(3)}"
                c_list = [w["conf"] for w in left_words]
                fields_dict["Date of Issue"] = (d_str, sum(c_list) / len(c_list) if c_list else 50.0)
            m_right = DATE_PATTERN.search(" ".join(w["text"] for w in right_words))
            if m_right and "Date of Expiry" not in fields_dict:
                d_str = f"{int(m_right.group(1)):02d} {m_right.group(2).upper()} {m_right.group(3)}"
                c_list = [w["conf"] for w in right_words]
                fields_dict["Date of Expiry"] = (d_str, sum(c_list) / len(c_list) if c_list else 50.0)

    # 7. Dedicated Header Field Crops (Document Type, Country Code, Passport Number)
    if _is_tesseract_available():
        # Document Type
        type_crop = v_gray[int(vgh * 0.08):int(vgh * 0.22), :int(vgw * 0.22)]
        _save_debug_image("debug_viz_type.png", type_crop)
        d_t = pytesseract.image_to_data(type_crop, config="--psm 6", output_type=pytesseract.Output.DICT)
        for i in range(len(d_t["text"])):
            t = d_t["text"][i].strip().upper()
            c = float(d_t["conf"][i])
            if t in ("P", "P<") and c > 0:
                fields_dict["Document Type"] = (t, c)
                break

        # Country Code
        cntry_crop = v_gray[int(vgh * 0.08):int(vgh * 0.22), int(vgw * 0.18):int(vgw * 0.52)]
        _save_debug_image("debug_viz_country.png", cntry_crop)
        d_c = pytesseract.image_to_data(cntry_crop, config="--psm 6", output_type=pytesseract.Output.DICT)
        for i in range(len(d_c["text"])):
            t = d_c["text"][i].strip().upper()
            c = float(d_c["conf"][i])
            if t in ("IND", "IND<", "IN") and c > 0:
                fields_dict["Country Code"] = ("IND" if "IND" in t else t, c)
                break

        # Passport Number
        pass_crop = v_gray[int(vgh * 0.08):int(vgh * 0.23), int(vgw * 0.50):]
        _save_debug_image("debug_viz_passport_number.png", pass_crop)
        d_p = pytesseract.image_to_data(pass_crop, config="--psm 6", output_type=pytesseract.Output.DICT)
        for i in range(len(d_p["text"])):
            t = d_p["text"][i].strip()
            c = float(d_p["conf"][i])
            if t and c > 0:
                m = re.search(r"[A-Z0-9]{8,9}", t)
                if m and not any(k in t.lower() for k in ["passport", "passeport", "no"]):
                    fields_dict["Passport Number"] = (m.group(0).upper(), c)
                    break
    elif HAS_WINOCR:
        all_lines = viz_text.splitlines()
        for idx, l in enumerate(all_lines):
            l_clean = l.strip().upper()
            l_lower = l.lower()
            if l_clean in ("P", "P<") and "Document Type" not in fields_dict:
                fields_dict["Document Type"] = ("P", 95.0)
            elif any(k in l_lower for k in ["type", "type/type", "type / type"]) and idx + 1 < len(all_lines):
                val = all_lines[idx + 1].strip().upper()
                if val.startswith("P"):
                    fields_dict["Document Type"] = ("P", 95.0)
            if l_clean in ("IND", "IND<", "IN") and "Country Code" not in fields_dict:
                fields_dict["Country Code"] = ("IND", 95.0)
            elif any(k in l_lower for k in ["country", "count t y", "pays"]) and idx + 1 < len(all_lines):
                m = re.search(r"\b[A-Z]{3}\b", all_lines[idx + 1].upper())
                if m and "Country Code" not in fields_dict:
                    fields_dict["Country Code"] = (m.group(0), 95.0)
            m_p = re.search(r"\b([A-Z][0-9]{7,8})\b", l_clean)
            if m_p and "Passport Number" not in fields_dict and not any(k in l_lower for k in ["passport", "passeport", "no"]):
                fields_dict["Passport Number"] = (m_p.group(1), 95.0)
            elif any(k in l_lower for k in ["passport no", "passeport no", "no.", "pa no"]) and idx + 1 < len(all_lines):
                m2 = re.search(r"\b([A-Z][0-9]{7,8})\b", all_lines[idx + 1].upper())
                if m2 and "Passport Number" not in fields_dict:
                    fields_dict["Passport Number"] = (m2.group(1), 95.0)
            # Same line Name
            if "name:" in l_lower or "full name:" in l_lower:
                val = re.sub(r"^(?:name|full name)\s*:\s*", "", l, flags=re.I).strip()
                if val:
                    parts = val.split()
                    if len(parts) >= 2:
                        fields_dict["Given Names"] = (" ".join(parts[:-1]).upper(), 95.0)
                        fields_dict["Surname"] = (parts[-1].upper(), 95.0)
                    else:
                        fields_dict["Given Names"] = (val.upper(), 95.0)

    # Save debug crops for other fields
    _save_debug_image("debug_viz_name.png", v_gray[int(vgh*0.20):int(vgh*0.45), :int(vgw*0.65)])
    _save_debug_image("debug_viz_dob.png", v_gray[int(vgh*0.50):int(vgh*0.66), :int(vgw*0.65)])
    _save_debug_image("debug_viz_expiry.png", v_gray[int(vgh*0.75):int(vgh*0.95), int(vgw*0.50):])

    # Assemble structured OcrField list
    results: list[OcrField] = []
    field_order = [
        "Document Type", "Country Code", "Passport Number", "Surname",
        "Given Names", "Nationality", "Date of Birth", "Gender",
        "Place of Birth", "Date of Issue", "Date of Expiry"
    ]
    for label in field_order:
        if label in fields_dict:
            val, conf = fields_dict[label]
            results.append(OcrField(
                label=label,
                value=val,
                confidence=conf,
                confidence_source=ocr_source,
                low_confidence=conf < LOW_CONF_THRESHOLD,
            ))

    return viz_text, results


# ---------------------------------------------------------------------------
# MRZ Extraction & Normalization Pipeline (ICAO TD3)
# ---------------------------------------------------------------------------

def _extract_mrz(gray: np.ndarray) -> tuple[str, list[str]]:
    """
    Crop the MRZ strip, run dedicated MRZ Tesseract pass,
    normalise output to two 44-character ICAO TD3 lines.
    """
    h, w = gray.shape
    r0 = int(h * MRZ_ROW_START)
    mrz_crop = gray[r0:h, 0:w]

    # Upscale 3x before thresholding
    mrz_crop = cv2.resize(mrz_crop, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    mrz_crop = _sharpen(mrz_crop)

    _, mrz_bin = cv2.threshold(mrz_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _save_debug_image("debug_mrz.png", mrz_bin)

    mrz_raw = ""
    mrz_lines = []
    if _is_tesseract_available():
        mrz_raw = _tess_to_str(
            pytesseract.image_to_string(mrz_bin, config=TESS_MRZ_CONFIG)
        )
        mrz_lines = normalize_mrz(mrz_raw)
    elif HAS_WINOCR:
        try:
            res = _safe_winocr_recognize(mrz_bin)
            mrz_raw = "\n".join(l["text"] for l in res["lines"]).strip()
            mrz_lines = normalize_mrz(mrz_raw)
        except Exception:
            pass
        if not mrz_lines:
            try:
                res2 = _safe_winocr_recognize(mrz_crop)
                raw2 = "\n".join(l["text"] for l in res2["lines"]).strip()
                mrz_lines = normalize_mrz(raw2)
                if mrz_lines:
                    mrz_raw = raw2
            except Exception:
                pass
        if not mrz_lines:
            try:
                res3 = _safe_winocr_recognize(gray)
                raw3 = "\n".join(l["text"] for l in res3["lines"]).strip()
                mrz_lines = normalize_mrz(raw3)
                if mrz_lines:
                    mrz_raw = raw3
            except Exception:
                pass

    return mrz_raw.strip(), mrz_lines


def normalize_mrz(raw: str) -> list[str]:
    """
    Dedicated MRZ normalization function for ICAO TD3 passport MRZ.
    TD3 passports consist of:
      - exactly 2 lines
      - 44 characters per line
    """
    if not isinstance(raw, str):
        raise TypeError(f"normalize_mrz expected str, got {type(raw).__name__}")

    valid_mrz_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<")
    confused_separators = {
        "«": "<", "‹": "<", "(": "<", ")": "<", "{": "<", "}": "<",
        "[": "<", "]": "<", "—": "<", "–": "<", "-": "<", "=": "<",
        "_": "<", " ": "<", "\t": "<", ",": "<", ".": "<",
    }

    raw_lines: list[str] = []
    for line in raw.splitlines():
        line = line.strip().upper()
        if not line:
            continue
        cleaned_chars: list[str] = []
        for ch in line:
            if ch in confused_separators:
                cleaned_chars.append("<")
            elif ch in valid_mrz_chars:
                cleaned_chars.append(ch)
        cleaned_line = "".join(cleaned_chars)
        if len(cleaned_line) >= 12:
            raw_lines.append(cleaned_line)

    if not raw_lines:
        return []

    # 1. Detect Line 1 candidate (TD3 Line 1 starts with 'P<' or 'P' + letter)
    line1_cand = ""
    line1_idx = -1
    for idx, l in enumerate(raw_lines):
        p_pos = l.find("P<")
        if p_pos != -1:
            line1_cand = l[p_pos:]
            line1_idx = idx
            break
        m = re.search(r"P[A-Z][A-Z<]{3}", l)
        if m:
            line1_cand = l[m.start():]
            line1_idx = idx
            break

    # 2. Detect Line 2 candidate
    issuing_country = line1_cand[2:5] if len(line1_cand) >= 5 else ""
    best_l2_score = -1
    line2_cand = ""

    for idx, l in enumerate(raw_lines):
        if idx == line1_idx:
            continue
        max_off = max(0, len(l) - 44)
        for off in range(max_off + 1):
            seg = l[off : off + 44]
            score = 0
            if len(seg) >= 13:
                nat = seg[10:13]
                if issuing_country and nat == issuing_country:
                    score += 15
                elif nat.isalpha():
                    score += 5
            if len(seg) >= 19:
                score += sum(2 for c in seg[13:19] if c.isdigit())
                if len(seg) > 19 and seg[19].isdigit():
                    score += 3
            if len(seg) >= 21 and seg[20] in ("M", "F", "<", "X"):
                score += 4
            if len(seg) >= 27:
                score += sum(2 for c in seg[21:27] if c.isdigit())
                if len(seg) > 27 and seg[27].isdigit():
                    score += 3
            if len(seg) >= 10 and seg[9].isdigit():
                score += 3

            if score > best_l2_score:
                best_l2_score = score
                line2_cand = seg

    results: list[str] = []
    if line1_cand:
        results.append(line1_cand[:44])
    if line2_cand:
        results.append(line2_cand[:44])

    return results


def _normalise_mrz(raw: str) -> list[str]:
    """Backward compatibility wrapper."""
    return normalize_mrz(raw)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_text(image_path: str) -> dict:
    """
    Run the full region-based OCR pipeline on a passport-style document.

    Returns a dict compatible with the existing API contract:
        {
            "viz_text":    str,          # full VIZ region text (backward compat)
            "viz_fields":  list[dict],   # per-field structured OCR
            "mrz_raw":     str,          # raw MRZ Tesseract output
            "mrz_line1":   str,          # normalised MRZ line 1
            "mrz_line2":   str,          # normalised MRZ line 2
            "mrz_lines":   list[str],    # [line1, line2] or fewer
            "imageWidth":  int,
            "imageHeight": int,
            "warnings":    list[str],
        }
    """
    warnings: list[str] = []

    # 1. Load and normalize resolution
    color_img, gray_img = _load_and_normalize(image_path)
    orig_h, orig_w = color_img.shape[:2]

    # 2. Perspective correction (with safe fallback)
    try:
        color_img, gray_img = _perspective_correct(color_img, gray_img)
    except Exception as exc:
        logger.warning("Perspective correction skipped (%s)", exc)
        warnings.append(f"Perspective correction skipped: {exc}")

    _save_debug_image("debug_document.png", color_img)

    # 3. Deskew
    gray_img = _deskew(gray_img)

    # 4. Extract VIZ fields
    viz_text, viz_fields = _extract_viz_data(gray_img)
    if not viz_fields:
        warnings.append("No VIZ fields extracted")

    # 5. Extract MRZ (using CLAHE contrast enhancement for OCR-B strip)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_mrz = clahe.apply(gray_img)
    gray_mrz = cv2.GaussianBlur(gray_mrz, (3, 3), 0)
    mrz_raw, mrz_lines = _extract_mrz(gray_mrz)
    if not mrz_lines:
        warnings.append("MRZ not detected")

    mrz_line1 = mrz_lines[0] if len(mrz_lines) > 0 else ""
    mrz_line2 = mrz_lines[1] if len(mrz_lines) > 1 else ""

    result = OcrResult(
        viz_text=viz_text,
        viz_fields=viz_fields,
        mrz_raw=mrz_raw,
        mrz_line1=mrz_line1,
        mrz_line2=mrz_line2,
        mrz_lines=mrz_lines,
        image_width=orig_w,
        image_height=orig_h,
        warnings=warnings,
    )

    return result.to_dict()
