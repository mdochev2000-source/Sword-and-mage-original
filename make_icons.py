#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генерира icon-192.png и icon-512.png — пиксел-арт меч в палитрата на играта.
Стартира се ЕДНОКРАТНО; иконите се commit-ват и build.py само ги копира."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
N = 32  # базова решетка (после nearest-upscale за остри пиксели)

BG0 = (10, 16, 32)      # тъмно синьо в центъра
BG1 = (4, 6, 11)        # почти черно по краищата (#04060b)
STEEL = [(232, 236, 244), (194, 205, 221), (152, 165, 187), (124, 138, 168), (90, 103, 127)]
GOLD = (232, 192, 74)
GRIP = (125, 86, 54)
GEM = (138, 176, 255)   # синьо-лилавото на „MAGE"
GEM2 = (74, 63, 158)

def make(size):
    img = Image.new("RGB", (N, N), BG1)
    px = img.load()
    cx, cy = (N - 1) / 2, (N - 1) / 2
    # фон: лек радиален градиент
    for y in range(N):
        for x in range(N):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / (N * 0.62)
            d = min(1.0, d)
            px[x, y] = tuple(int(BG0[i] * (1 - d) + BG1[i] * d) for i in range(3))
    # магическа искра (синьо-лилаво сияние горе-вдясно)
    for y in range(N):
        for x in range(N):
            d = ((x - N * 0.66) ** 2 + (y - N * 0.34) ** 2) ** 0.5
            if d < 7:
                a = max(0.0, 1 - d / 7) * 0.5
                px[x, y] = tuple(int(px[x, y][i] * (1 - a) + GEM2[i] * a) for i in range(3))
    # диагонално острие (долу-ляво -> горе-дясно), с дебелина за фаска
    for t in range(N):
        bx, by = 5 + t * 0.68, N - 6 - t * 0.68
        if not (0 <= bx < N and 0 <= by < N):
            continue
        if t < N * 0.72:  # само острието, не и дръжката
            for w, col in ((0, STEEL[0]), (1, STEEL[1]), (-1, STEEL[2]), (2, STEEL[3])):
                xx, yy = int(bx + w * 0.7), int(by + w * 0.7)
                if 0 <= xx < N and 0 <= yy < N:
                    px[xx, yy] = col
    # връх (бляскава точка)
    px[int(5 + N * 0.71 * 0.68), int(N - 6 - N * 0.71 * 0.68)] = (255, 255, 255)
    # предпазител (кръст) и дръжка долу-ляво
    for dx in range(-2, 3):
        xx, yy = 6 + dx, N - 7 - dx
        if 0 <= xx < N and 0 <= yy < N:
            px[xx, yy] = GOLD
    for k in range(3):
        xx, yy = 4 - k, N - 4 + k - 1
        if 0 <= xx < N and 0 <= yy < N:
            px[xx, yy] = GRIP
    # гем на дръжката
    px[3, N - 3] = GEM
    big = img.resize((size, size), Image.NEAREST)
    big.save(os.path.join(ROOT, "icon-%d.png" % size))
    print("записан icon-%d.png" % size)

for s in (192, 512):
    make(s)
