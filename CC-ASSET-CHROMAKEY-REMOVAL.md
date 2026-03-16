# CC-ASSET-CHROMAKEY-REMOVAL
# Lynx Mascot Image Processing — Green Screen Removal
# Status: READY FOR CC EXECUTION
# Independent: Can run in parallel with other specs. Only touches image files.

---

## STANDING RULES

1. **Do NOT modify any code files, hooks, components, screens, or migrations.**
2. **Do NOT rename any image files.** Keep original filenames exactly as they are.
3. **Only modify files inside `assets/images/activitiesmascot/`.**
4. **Back up originals before processing.** Create `assets/images/activitiesmascot/originals/` and copy all PNGs there before overwriting.
5. **Commit after each phase.** Commit message format: `[asset-processing] Phase X: description`
6. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Removes the bright green (#00FF00) chroma key background from all mascot illustration PNGs and replaces it with transparency. The processed images will render cleanly on the dark navy Journey Path background and anywhere else in the app.

---

## PHASE 1: Install dependencies and verify images

### Step 1A: Install Pillow

```bash
pip install Pillow --break-system-packages
```

If Pillow is already installed, skip.

### Step 1B: List all images to process

```bash
ls -la assets/images/activitiesmascot/*.png | wc -l
ls assets/images/activitiesmascot/*.png
```

Report the count and full list. Expected: approximately 48 PNG files.

### Step 1C: Back up originals

```bash
mkdir -p assets/images/activitiesmascot/originals
cp assets/images/activitiesmascot/*.png assets/images/activitiesmascot/originals/
```

Verify the backup:
```bash
ls assets/images/activitiesmascot/originals/*.png | wc -l
```

Should match the original count.

**Commit:** `[asset-processing] Phase 1: backup original mascot images`

---

## PHASE 2: Create and run the processing script

Create a Python script at the repo root (temporary, will be deleted after use):

```
process_mascot_images.py
```

```python
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
```

### Run the script:

```bash
python3 process_mascot_images.py
```

**Expected output:** Each image processed with pixel counts. Most images should have thousands of green pixels removed.

**Commit:** `[asset-processing] Phase 2: remove green screen from mascot images`

---

## PHASE 3: Verify results

### Step 3A: Spot check image sizes

The processed images should be roughly the same file size or slightly smaller (PNG compression with transparency). If any image is dramatically smaller (like 90% smaller), it may have been over-processed.

```bash
# Compare file sizes
echo "=== ORIGINALS ==="
ls -la assets/images/activitiesmascot/originals/ | head -10
echo ""
echo "=== PROCESSED ==="
ls -la assets/images/activitiesmascot/ | head -10
```

### Step 3B: Verify transparency

Write a quick verification script:

```python
#!/usr/bin/env python3
"""Quick check: verify processed images have transparency."""
import os
from PIL import Image

DIR = "assets/images/activitiesmascot"
files = sorted([f for f in os.listdir(DIR) if f.lower().endswith(".png") and os.path.isfile(os.path.join(DIR, f))])

for f in files:
    img = Image.open(os.path.join(DIR, f)).convert("RGBA")
    pixels = list(img.getdata())
    transparent = sum(1 for r, g, b, a in pixels if a == 0)
    total = len(pixels)
    pct = round(transparent / total * 100, 1)
    status = "OK" if pct > 5 else "WARNING: low transparency"
    print(f"{f}: {pct}% transparent — {status}")
```

Run it:
```bash
python3 verify_transparency.py
```

**Expected:** Every image should have significant transparency (the green background area). Images with less than 5% transparency may not have had green backgrounds or may need manual review.

### Step 3C: Check for the special case file

There's one file with an unusual name: `ChatGPT Image Mar 15, 2026, 04_13_11 PM.png`. Verify it processed correctly. If it has spaces in the filename, Python's `os.listdir` should handle it fine, but verify.

---

## PHASE 4: Clean up

### Step 4A: Delete temporary scripts

```bash
rm process_mascot_images.py
rm -f verify_transparency.py
```

### Step 4B: Add originals to .gitignore (optional)

The backup originals are large binary files. Consider adding to `.gitignore`:

```
assets/images/activitiesmascot/originals/
```

Or if Carlos wants to keep originals in the repo for safety, skip this step.

**Commit:** `[asset-processing] Phase 4: cleanup processing scripts`

---

## PHASE 5: Verification

### Report back with:

```
## VERIFICATION REPORT: Asset Processing

### Images Processed: [count]
### Images With Green Removed: [count] (should match total or very close)
### Images Skipped (no green found): [count] [list filenames if any]
### Errors: NONE / [list]

### Backup: assets/images/activitiesmascot/originals/ contains [count] files

### Spot Check (pick 3 images, report):
- [filename]: [original size] -> [processed size], [% transparent]
- [filename]: [original size] -> [processed size], [% transparent]
- [filename]: [original size] -> [processed size], [% transparent]

### Special Case File:
- ChatGPT Image Mar 15, 2026, 04_13_11 PM.png: PROCESSED / SKIPPED / ERROR

### Files Created: NONE (scripts deleted in cleanup)
### Files Modified: [count] PNG files in assets/images/activitiesmascot/
### Files NOT Modified: All code files, migrations, components — UNTOUCHED
```

---

## THRESHOLD TUNING

If the results look rough (harsh edges around the character, green fringe remaining, or parts of the character accidentally removed), the THRESHOLD and FEATHER_RANGE values can be adjusted:

- **Green fringe remaining on edges:** Increase THRESHOLD (try 100-110) or increase FEATHER_RANGE (try 40)
- **Parts of the character removed** (especially yellow/lime colored areas): Decrease THRESHOLD (try 70-80)
- **Harsh edges:** Increase FEATHER_RANGE (try 40-50)

If tuning is needed, restore from originals and re-run:
```bash
cp assets/images/activitiesmascot/originals/*.png assets/images/activitiesmascot/
# Edit THRESHOLD/FEATHER_RANGE in script
python3 process_mascot_images.py
```

Report the issue and I'll adjust the values for a second pass.
