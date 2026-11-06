#!/usr/bin/env python3
"""Prüft src/data/vulns.json und src/data/advent.json, bevor die Seite gebaut wird.

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
ADVENT = os.path.join(ROOT, "data", "advent.json")
FREE_LICENSES = {"CC0", "CC-BY-4.0", "CC-BY-2.5", "CC-BY-SA-4.0", "MIT", "PD"}

CATEGORIES = {"hardware", "crypto", "wireless", "software", "network"}
LICENSES = {"CC0", "CC-BY-4.0", "CC-BY-2.5", "CC-BY-SA-4.0", "MIT", "PD", "free", "none"}
NOTES = {"chromium", "safari", "ai", "css"}
MAX_IMG_BYTES = 300 * 1024   # harte Grenze
WARN_IMG_BYTES = 100 * 1024  # Ziel laut CLAUDE.md

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
        og = os.path.join(IMG, "..", "og", str(v.get("id", "")) + ".jpg")
        if not os.path.isfile(og):
            warnings.append(f"{where}: Vorschaubild fehlt, ./bin/gen_og.py ausführen")

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
            elif size > WARN_IMG_BYTES:
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

    check_advent(data, errors, warnings)

    for w in warnings:
        print("Warnung:", w)
    for e in errors:
        print("Fehler:", e)
    print(f"{len(data)} Einträge geprüft, {len(errors)} Fehler, {len(warnings)} Warnungen")
    return 1 if errors else 0


def check_advent(data, errors, warnings):
    """Adventskalender: 24 Türchen, jede Lücke höchstens einmal, Texte DE/EN."""
    if not os.path.exists(ADVENT):
        return
    with open(ADVENT, encoding="utf-8") as fh:
        cal = json.load(fh)
    by_id = {v.get("id"): v for v in data}
    doors = cal.get("doors") if isinstance(cal, dict) else None
    if not isinstance(cal.get("year") if isinstance(cal, dict) else None, int) or not isinstance(doors, list):
        errors.append("advent.json: braucht \"year\" (Zahl) und \"doors\" (Liste)")
        return
    days = [d.get("day") for d in doors]
    if sorted(days) != list(range(1, 25)):
        errors.append("advent.json: Türchen 1 bis 24 müssen genau einmal vorkommen")
    ids = [d.get("id") for d in doors]
    for vid in {i for i in ids if ids.count(i) > 1}:
        errors.append(f"advent.json: {vid} kommt mehrfach vor")
    for d in doors:
        where = f"advent.json Türchen {d.get('day')}"
        v = by_id.get(d.get("id"))
        if not v:
            errors.append(f"{where}: unbekannte Lücke {d.get('id')!r}")
            continue
        for field, limit in (("title", 120), ("text", 600)):
            for lang in ("de", "en"):
                t = str((d.get(field) or {}).get(lang, "")).strip()
                if not t:
                    errors.append(f"{where}: {field}.{lang} fehlt")
                elif len(t) > limit:
                    errors.append(f"{where}: {field}.{lang} ist länger als {limit} Zeichen")
        if v.get("credit", {}).get("license") not in FREE_LICENSES:
            warnings.append(f"{where}: Logo von {d['id']} hat keine freie Lizenz, für Social Media ungeeignet")


if __name__ == "__main__":
    sys.exit(main())
