#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Simple OCR wrapper used by the web demo.

By default we try to use Apple's Vision framework (available on macOS 10.15+ with
PyObjC installed). If it is not available, we fall back to pytesseract when
present. When neither backend is reachable we raise a clear runtime error so the
caller can surface a helpful message to the user.
"""

from __future__ import annotations

import os
import pathlib
from typing import Iterable, List, Optional

DEFAULT_LANG = ["en-US"]

try:  # macOS Vision backend
    import Vision  # type: ignore
    from Foundation import NSURL

    HAS_VISION = True
except Exception:  # pragma: no cover - Vision only exists on macOS with PyObjC
    HAS_VISION = False

try:  # pytesseract fallback
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore

    HAS_TESSERACT = True
except Exception:  # pragma: no cover - optional dependency
    HAS_TESSERACT = False


class OCRError(RuntimeError):
    """Raised when no OCR backend is available."""


def _normalize_languages(langs: Iterable[str] | None) -> List[str]:
    if not langs:
        return DEFAULT_LANG
    normalized = []
    for lang in langs:
        lang = (lang or "").strip()
        if not lang:
            continue
        if lang not in normalized:
            normalized.append(lang)
    return normalized or DEFAULT_LANG


def _ocr_with_vision(path: str, langs: List[str], fast: bool) -> str:
    url = NSURL.fileURLWithPath_(os.path.abspath(path))
    handler = Vision.VNImageRequestHandler.alloc().initWithURL_options_(url, None)

    collected: List[str] = []
    error_holder: List[Exception] = []

    def completion(request, err):  # pragma: no cover - macOS only
        if err is not None:
            error_holder.append(RuntimeError(err))
            return
        results = request.results() or []
        for observation in results:
            candidates = observation.topCandidates_(1)
            if candidates:
                collected.append(str(candidates[0].string()))

    request = Vision.VNRecognizeTextRequest.alloc().initWithCompletionHandler_(completion)
    request.setRecognitionLanguages_(langs)
    level = Vision.VNRequestTextRecognitionLevelFast if fast else Vision.VNRequestTextRecognitionLevelAccurate
    request.setRecognitionLevel_(level)
    request.setUsesLanguageCorrection_(not fast)

    success, perform_err = handler.performRequests_error_([request], None)
    if not success:
        raise RuntimeError(perform_err or "Vision OCR failed")
    if error_holder:
        raise error_holder[0]
    return "\n".join(collected).strip()


def _ocr_with_tesseract(path: str, langs: List[str]) -> str:
    if not HAS_TESSERACT:
        raise OCRError("Neither Apple Vision nor pytesseract is available")
    lang_tokens = []
    for raw in langs:
        token = raw.split("-")[0].split("_")[0]
        if token and token not in lang_tokens:
            lang_tokens.append(token)
    lang_arg = "+".join(lang_tokens) if lang_tokens else None
    with Image.open(path) as img:
        text = pytesseract.image_to_string(img, lang=lang_arg)
    return text.strip()


def ocr_image(path: str, languages: Optional[Iterable[str]] = None, fast: bool = False) -> str:
    """Run OCR for the provided image path and return extracted text."""

    langs = _normalize_languages(languages)

    if HAS_VISION:
        try:
            return _ocr_with_vision(path, langs, fast)
        except Exception as exc:
            if HAS_TESSERACT:
                return _ocr_with_tesseract(path, langs)
            raise RuntimeError(f"Vision OCR failed: {exc}")

    if HAS_TESSERACT:
        return _ocr_with_tesseract(path, langs)

    raise OCRError("OCR backend not available. Install PyObjC or pytesseract.")


__all__ = ["ocr_image", "OCRError"]


def _normalize_path(path: str) -> str:
    """Expand user/relative portions of a path string."""
    if not path:
        return ""
    cleaned = path.strip().strip('"\'')
    path_obj = pathlib.Path(cleaned)
    path_obj = path_obj.expanduser()
    try:
        return str(path_obj.resolve(strict=False))
    except Exception:
        return str(path_obj)


__all__.append("_normalize_path")
