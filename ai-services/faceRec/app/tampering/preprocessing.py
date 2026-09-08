import cv2
import numpy as np


MAX_DIMENSION = 2000


def load_image(contents: bytes):
    """
    Convert uploaded image bytes into an OpenCV image.
    """

    image_array = np.frombuffer(contents, dtype=np.uint8)

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise ValueError("Invalid or unsupported image")

    return image


def resize_for_analysis(image):
    """
    Resize very large images while maintaining aspect ratio.

    We avoid unnecessary filtering because forensic artifacts
    can be destroyed by aggressive preprocessing.
    """

    height, width = image.shape[:2]

    largest_dimension = max(height, width)

    if largest_dimension <= MAX_DIMENSION:
        return image

    scale = MAX_DIMENSION / largest_dimension

    new_width = int(width * scale)
    new_height = int(height * scale)

    resized = cv2.resize(
        image,
        (new_width, new_height),
        interpolation=cv2.INTER_AREA
    )

    return resized


def preprocess_document(contents: bytes):
    """
    Main preprocessing pipeline.
    """

    image = load_image(contents)

    original_height, original_width = image.shape[:2]

    processed = resize_for_analysis(image)

    processed_height, processed_width = processed.shape[:2]

    return {
        "image": processed,

        "original_size": {
            "width": original_width,
            "height": original_height
        },

        "processed_size": {
            "width": processed_width,
            "height": processed_height
        }
    }