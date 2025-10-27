#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Interactive chat with Ollama (qwen3:4b) that can OCR images via Apple Vision.

Usage:
  python3 ollama_ocr_chat.py [--lang ru-RU,en-US] [--fast] [--model qwen3:4b]

How it works:
  - Paste or drag an image path to OCR it. The text becomes the current context.
  - Then type your question: the LLM will use the OCR text.
  - Shortcut: in one line, use: <path> | <your question>
  - Type 'clear' to clear OCR/context; 'q' to quit.

Requires:
  - macOS with PyObjC and Vision frameworks (see apple_vision_ocr.py for deps)
  - Ollama running locally with the model available: `ollama pull qwen3:4b`
"""

import os
import sys
import shlex
import json
import argparse
from typing import List, Dict, Any, Optional

import requests

from apple_vision_ocr import ocr_image, _normalize_path  # type: ignore


def is_image_file(path: str) -> bool:
    exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".heic", ".webp", ".pdf"}
    _, ext = os.path.splitext(path.lower())
    return ext in exts and os.path.isfile(path)


def call_ollama_chat(messages: List[Dict[str, str]], model: str = "qwen3:4b", host: str = "http://localhost:11434", stream: bool = False) -> str:
    url = host.rstrip("/") + "/api/chat"
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": stream,
    }
    r = requests.post(url, json=payload, timeout=600)
    r.raise_for_status()
    if stream:
        out = []
        for line in r.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            delta = obj.get("message", {}).get("content", "")
            print(delta, end="", flush=True)
            out.append(delta)
        print()
        return "".join(out)
    else:
        data = r.json()
        return data.get("message", {}).get("content", "")


def build_messages(history: List[Dict[str, str]], ocr_text: Optional[str], user_prompt: str) -> List[Dict[str, str]]:
    msgs = history.copy()
    if ocr_text:
        msgs.append({
            "role": "user",
            "content": "Context (OCR text from image):\n" + ocr_text,
        })
    msgs.append({"role": "user", "content": user_prompt})
    return msgs


def parse_line_for_path_and_prompt(line: str):
    # Support syntax: <path> | <prompt>
    if "|" in line:
        left, right = line.split("|", 1)
        path = _normalize_path(left)
        prompt = right.strip()
        return path, prompt
    # Otherwise, try if the whole line is a path
    path_cand = _normalize_path(line)
    if os.path.exists(path_cand):
        return path_cand, None
    return None, line.strip()


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser(description="Ollama chat integrated with Apple Vision OCR")
    ap.add_argument("--lang", default="", help="Comma-separated language tags, e.g. ru-RU,en-US")
    ap.add_argument("--fast", action="store_true", help="Use fast OCR recognition level")
    ap.add_argument("--model", default="qwen3:4b", help="Ollama model name")
    args = ap.parse_args(argv)

    languages = [s.strip() for s in args.lang.split(",") if s.strip()] if args.lang else []
    model = args.model

    print(f"Chat with {model}. Type image path to OCR, or '<path> | question'. Type 'q' to quit.")

    history: List[Dict[str, str]] = [
        {"role": "system", "content": "You are a helpful assistant. When the user provides OCR context, use it to answer the question. If the context seems unrelated to the question, explain assumptions."}
    ]

    last_ocr_text: Optional[str] = None
    last_ocr_path: Optional[str] = None

    while True:
        try:
            line = input("You> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line.lower() in {"q", "quit", ":q"}:
            return 0
        if line.lower() in {"clear", "reset"}:
            history = history[:1]
            last_ocr_text = None
            last_ocr_path = None
            print("Context cleared.")
            continue

        path, maybe_prompt = parse_line_for_path_and_prompt(line)

        if path and is_image_file(path):
            print(f"[OCR] Reading: {path}")
            try:
                last_ocr_text = ocr_image(path, languages, args.fast)
                last_ocr_path = path
            except Exception as e:
                print(f"OCR error: {e}")
                continue
            print("[OCR] Extracted text (truncated to 600 chars):")
            preview = (last_ocr_text[:600] + ("…" if len(last_ocr_text) > 600 else "")) if last_ocr_text else ""
            print(preview)
            if maybe_prompt is None:
                # Ask for a question next
                print("Now ask a question about this text, or paste another path.")
                continue
            # Fall-through to run LLM with the provided prompt
            user_prompt = maybe_prompt
        else:
            # No valid image path; treat entire input as a user question
            user_prompt = maybe_prompt if maybe_prompt is not None else line

        msgs = build_messages(history, last_ocr_text, user_prompt)
        try:
            reply = call_ollama_chat(msgs, model=model, stream=False)
        except Exception as e:
            print(f"LLM error: {e}")
            continue
        history.append({"role": "user", "content": ("Context included. " if last_ocr_text else "") + user_prompt})
        history.append({"role": "assistant", "content": reply})
        print(f"{model}> {reply}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

