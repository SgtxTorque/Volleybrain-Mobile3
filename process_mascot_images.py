#!/usr/bin/env python3
"""
Lynx Mascot Image Processor
Removes #00FF00 green screen background and replaces with transparency.
Uses color distance threshold to handle anti-aliased edges cleanly.
"""

import os
import sys
from PIL import Image
import math

INPUT_DIR = "assets/images/activitiesmascot"
BACKUP_DIR = os.path.join(INPUT_DIR, "originals")

# Green screen color
GREEN_R, GREEN_G, GREEN_B = 0, 255, 0

# Threshold for color distance from pure green
# Lower = stricter (only exact green removed)
# Higher = more aggressive (catches green-tinted edge pixels)
# 80-100 works well for bright green screens with anti-aliased cartoon art
THRESHOLD = 90

# Edge feathering: pixels near the threshold get partial transparency
# This prevents harsh edges around the character
FEATHER_RANGE = 30


def color_distance(r, g, b):
    """Euclidean distance from the target green color."""
    return math.sqrt((r - GREEN_R) ** 2 + (g - GREEN_G) ** 2 + (b - GREEN_B) ** 2)


def green_ratio(r, g, b):
    """How green-dominant is this pixel? Returns 0-1."""
    total = r + g + b
    if total == 0:
        return 0
    return g / total


def process_image(filepath):
    """Remove green screen from a single image."""
    img = Image.open(filepath).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    removed = 0
    feathered = 0

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            # Skip already transparent pixels
            if a == 0:
                continue

            dist = color_distance(r, g, b)
            g_ratio = green_ratio(r, g, b)

            # Pure green or very close: fully transparent
            if dist < THRESHOLD and g_ratio > 0.5:
                pixels[x, y] = (r, g, b, 0)
                removed += 1

            # Edge zone: partial transparency for smooth edges
            elif dist < (THRESHOLD + FEATHER_RANGE) and g_ratio > 0.45:
                # Linear falloff from fully transparent to fully opaque
                factor = (dist - THRESHOLD) / FEATHER_RANGE
                new_alpha = int(a * min(factor, 1.0))
                pixels[x, y] = (r, g, b, new_alpha)
                feathered += 1

    img.save(filepath, "PNG", optimize=True)
    return removed, feathered


def main():
    if not os.path.isdir(INPUT_DIR):
        print(f"ERROR: Directory not found: {INPUT_DIR}")
        sys.exit(1)

    if not os.path.isdir(BACKUP_DIR):
        print(f"ERROR: Backup directory not found: {BACKUP_DIR}")
        print("Run Phase 1 first to create backups.")
        sys.exit(1)

    png_files = sorted([
        f for f in os.listdir(INPUT_DIR)
        if f.lower().endswith(".png") and f != "originals"
    ])

    # Filter out the originals directory entry
    png_files = [f for f in png_files if os.path.isfile(os.path.join(INPUT_DIR, f))]

    print(f"Processing {len(png_files)} images...")
    print(f"Threshold: {THRESHOLD}, Feather: {FEATHER_RANGE}")
    print("-" * 60)

    total_removed = 0
    total_feathered = 0
    errors = []

    for i, filename in enumerate(png_files, 1):
        filepath = os.path.join(INPUT_DIR, filename)
        try:
            removed, feathered = process_image(filepath)
            total_removed += removed
            total_feathered += feathered
            status = "OK" if removed > 0 else "SKIP (no green found)"
            print(f"[{i}/{len(png_files)}] {filename}: {removed} removed, {feathered} feathered — {status}")
        except Exception as e:
            errors.append((filename, str(e)))
            print(f"[{i}/{len(png_files)}] {filename}: ERROR — {e}")

    print("-" * 60)
    print(f"Done. {total_removed} pixels removed, {total_feathered} feathered across {len(png_files)} images.")

    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for fname, err in errors:
            print(f"  {fname}: {err}")
    else:
        print("No errors.")


if __name__ == "__main__":
    main()
