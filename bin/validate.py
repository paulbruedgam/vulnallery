#!/usr/bin/env python3
"""Prüft src/data/vulns.json, bevor die Seite gebaut wird.

Bricht mit Exit-Code 1 ab, wenn ein Eintrag die Regeln aus der README verletzt.
Nur Standardbibliothek, damit der Build keine Abhängigkeiten braucht.
"""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src")
DATA = os.path.join(ROOT, "data", "vulns.json")
IMG = os.path.join(ROOT, "assets", "img")

CATEGORIES = {"hardware", "crypto", "wireless", "software", "network"}
LICENSES = {"CC0", "CC-BY-4.0", "CC-BY-2.5", "CC-BY-SA-4.0", "PD", "free", "none"}
NOTES = {"chromium", "safari", "ai"}
MAX_IMG_BYTES = 2 * 1024 * 1024  # harte Grenze; Ziel laut Plan sind deutlich kleinere Dateien

RE_ID = re.compile(r"^[a-z0-9-]{1,48}$")
RE_DATE = re.compile(r"^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$")
RE_IMG = re.compile(r"^[a-z0-9._-]{1,64}\.(png|jpe?g|svg|webp|gif)$", re.I)
RE_CVE = re.compile(r"^CVE-\d{4}-\d{4,7}$")
RE_URL = re.compile(r"^https?://[^\s]+$")
SVG_DANGER = re.compile(rb"<script|\son[a-z]+\s*=|javascript:|<foreignObject", re.I)


def main() -> int:
    with open(DATA, encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        print("vulns.json muss eine Liste sein")
        return 1

    errors, warnings, seen = [], [], set()
    for n, v in enumerate(data):
        where = f"Eintrag {n} ({v.get('id', '?')})"
        def err(msg):
            errors.append(f"{where}: {msg}")

        if not RE_ID.match(str(v.get("id", ""))):
            err("id fehlt oder ist ungültig")
        elif v["id"] in seen:
            err("id doppelt")
        else:
            seen.add(v["id"])
        if not str(v.get("name", "")).strip():
            err("name fehlt")
        if not RE_DATE.match(str(v.get("date", ""))):
            err("date fehlt oder ist ungültig")
        if v.get("category") not in CATEGORIES:
            err("category ungültig")
        if not RE_URL.match(str(v.get("url", ""))):
            err("url fehlt oder ist ungültig")
        for c in v.get("cve", []):
            if not RE_CVE.match(c):
                err(f"CVE ungültig: {c}")
        desc = v.get("description", {})
        for lang in ("de", "en"):
            if not str(desc.get(lang, "")).strip():
                err(f"description.{lang} fehlt")

        img = str(v.get("image", ""))
        path = os.path.join(IMG, img)
        if not RE_IMG.match(img):
            err("image fehlt oder hat einen ungültigen Namen")
        elif not os.path.isfile(path):
            err(f"Bilddatei fehlt: {img}")
        else:
            size = os.path.getsize(path)
            if size > MAX_IMG_BYTES:
                err(f"{img} ist zu groß ({size // 1024} KB)")
            elif size > 300 * 1024:
                warnings.append(f"{where}: {img} hat {size // 1024} KB, bitte verkleinern")
            if img.lower().endswith(".svg"):
                with open(path, "rb") as fh:
                    if SVG_DANGER.search(fh.read()):
                        err(f"{img} enthält Script- oder Event-Inhalte")

        cr = v.get("credit")
        if not isinstance(cr, dict):
            err("credit fehlt")
        else:
            if cr.get("license") not in LICENSES:
                err("credit.license ungültig")
            if cr.get("note") and cr["note"] not in NOTES:
                err("credit.note ungültig")
            if cr.get("source") and not RE_URL.match(cr["source"]):
                err("credit.source ungültig")

    for w in warnings:
        print("Warnung:", w)
    for e in errors:
        print("Fehler:", e)
    print(f"{len(data)} Einträge geprüft, {len(errors)} Fehler, {len(warnings)} Warnungen")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
