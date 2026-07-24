#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сглобява един самостоятелен HTML от index.html + js/*.js.
Реда на скриптовете и стиловете се вземат ОТ index.html (нищо не се въвежда ръчно).
Изход:
  bezdna-online.html      - самостоятелен файл (за артефакт/еднофайлово ползване)
  docs/index.html         - същият файл, който GitHub Pages сервира
  docs/manifest.json      - копие на манифеста
  docs/icon-*.png         - копия на иконите
Стъпки от заданието: 2 (сглобяване) и 6 (кеширане + видима версия).
"""
import re, os, sys, shutil, datetime

try:
    sys.stdout.reconfigure(encoding="utf-8")  # кирилица в конзолата на Windows (cp1252) иначе гърми
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(ROOT, "index.html")
DOCS = os.path.join(ROOT, "docs")

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def build():
    html = read(INDEX)

    # 1) стилов блок от index.html (вграждаме го както си е)
    m = re.search(r"<style>.*?</style>", html, re.S)
    style = m.group(0) if m else "<style></style>"

    # 2) реда на скриптовете ОТ index.html (auto: нов файл в index.html се хваща сам)
    srcs = re.findall(r'<script\s+src="([^"?]+)(?:\?[^"]*)?"\s*></script>', html)
    if not srcs:
        print("ГРЕШКА: не намерих <script src=...> в index.html", file=sys.stderr)
        sys.exit(1)

    # 3) времеви печат за проверка коя версия гледаш (стъпка 6)
    build_ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    parts = []
    parts.append('<!DOCTYPE html>')
    parts.append('<html lang="en">')
    parts.append('<head>')
    parts.append('<meta charset="utf-8">')
    parts.append('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">')
    parts.append('<meta name="mobile-web-app-capable" content="yes">')
    parts.append('<meta name="apple-mobile-web-app-capable" content="yes">')  # iOS цял екран
    parts.append('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
    parts.append('<meta http-equiv="Cache-Control" content="no-cache">')       # GitHub Pages кешира агресивно
    parts.append('<meta name="theme-color" content="#04060b">')
    parts.append('<link rel="manifest" href="manifest.json">')
    parts.append('<link rel="icon" href="icon-192.png">')
    parts.append('<link rel="apple-touch-icon" href="icon-192.png">')
    parts.append('<title>sword and MAGE</title>')
    parts.append(style)
    parts.append('</head>')
    parts.append('<body class="menu">')
    parts.append('<canvas id="game"></canvas>')
    parts.append('<script>')
    parts.append('// сглобено от build.py — не редактирай ръчно; промени js/*.js')
    parts.append('window.__BUILD__ = "%s";' % build_ts)
    for src in srcs:
        name = os.path.basename(src)
        js_path = os.path.join(ROOT, src)
        code = read(js_path)
        parts.append("// ==== %s ====" % name)
        parts.append(code.rstrip("\n"))
    parts.append('</script>')
    parts.append('</body>')
    parts.append('</html>')
    out = "\n".join(parts) + "\n"

    # проверка: 0 външни скрипта (стъпка 2)
    ext = len(re.findall(r'<script\s+src=', out))
    if ext != 0:
        print("ГРЕШКА: в изхода има %d външни <script src=> (трябва 0)" % ext, file=sys.stderr)
        sys.exit(1)

    # запис: root bezdna-online.html + docs/index.html (Pages)
    with open(os.path.join(ROOT, "bezdna-online.html"), "w", encoding="utf-8") as f:
        f.write(out)
    os.makedirs(DOCS, exist_ok=True)
    with open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8") as f:
        f.write(out)
    # манифест + икони в docs/ (за да работи PWA от Pages)
    for asset in ("manifest.json", "icon-192.png", "icon-512.png"):
        src_a = os.path.join(ROOT, asset)
        if os.path.exists(src_a):
            shutil.copy(src_a, os.path.join(DOCS, asset))

    kb = len(out.encode("utf-8")) / 1024
    print("OK  версия %s" % build_ts)
    print("    скриптове (от index.html): %s" % ", ".join(os.path.basename(s) for s in srcs))
    print("    външни <script src=>: %d" % ext)
    print("    размер: %.1f KB" % kb)
    print("    записано: bezdna-online.html, docs/index.html (+ manifest/икони в docs/)")

if __name__ == "__main__":
    build()
