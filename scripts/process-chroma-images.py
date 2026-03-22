"""
Chroma Key Image Processor
Removes #00FF00 green backgrounds from mascot illustrations
and saves as transparent PNGs.
"""
import os
import sys
from PIL import Image
import numpy as np

# Source directories relative to project root
SOURCE_DIRS = [
    'assets/images/ACHIEVEMENTS.STATS',
    'assets/images/LYNXFAMILY',
    'assets/images/SHOUTOUTS',
    'assets/images/VOLLEYBALLACTION',
]

# Output root
OUTPUT_ROOT = 'assets/images/processed'

# Chroma key target: #00FF00
TARGET_R, TARGET_G, TARGET_B = 0, 255, 0

# Tolerance per channel for hard removal
TOLERANCE = 30

# Edge blending: pixels that are "greenish" but not pure chroma
# get alpha based on how far they are from pure green
EDGE_TOLERANCE = 60


def process_image(src_path, dst_path):
    """Remove chroma green background from a single image."""
    img = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float64)

    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    # Distance from pure chroma green per channel
    dr = np.abs(r - TARGET_R)
    dg = np.abs(g - TARGET_G)
    db = np.abs(b - TARGET_B)

    # Hard match: all channels within TOLERANCE → fully transparent
    hard_mask = (dr <= TOLERANCE) & (dg <= TOLERANCE) & (db <= TOLERANCE)

    # Soft edge: within EDGE_TOLERANCE — partial transparency
    # Calculate "greenness" score (0 = pure green, 1 = not green at all)
    max_dist = np.sqrt(3 * (EDGE_TOLERANCE ** 2))
    dist = np.sqrt(dr ** 2 + dg ** 2 + db ** 2)

    soft_mask = (dist < EDGE_TOLERANCE) & ~hard_mask
    # Alpha scales from 0 (pure green) to 255 (at edge of tolerance)
    soft_alpha = np.clip((dist / EDGE_TOLERANCE) * 255, 0, 255)

    # Apply masks
    result = data.copy()
    # Hard match: fully transparent
    result[hard_mask, 3] = 0
    # Soft match: partial alpha, also de-green the color to reduce fringe
    result[soft_mask, 3] = soft_alpha[soft_mask]

    # De-spill: reduce green channel on semi-transparent edge pixels
    # to remove green fringe
    spill_mask = soft_mask & (g > np.maximum(r, b))
    if np.any(spill_mask):
        avg_rb = (r[spill_mask] + b[spill_mask]) / 2
        result[spill_mask, 1] = np.clip(avg_rb, 0, 255)

    out_img = Image.fromarray(result.astype(np.uint8), 'RGBA')
    out_img.save(dst_path, 'PNG')


def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_root)

    total = 0
    for src_dir in SOURCE_DIRS:
        if not os.path.isdir(src_dir):
            print(f"  SKIP: {src_dir} not found")
            continue

        # Determine sub-directory name (e.g. ACHIEVEMENTS.STATS)
        sub_name = os.path.basename(src_dir)
        dst_dir = os.path.join(OUTPUT_ROOT, sub_name)
        os.makedirs(dst_dir, exist_ok=True)

        for fname in sorted(os.listdir(src_dir)):
            if not fname.lower().endswith('.png'):
                continue
            src_path = os.path.join(src_dir, fname)
            dst_path = os.path.join(dst_dir, fname)
            print(f"  Processing: {src_path} -> {dst_path}")
            process_image(src_path, dst_path)
            total += 1

    print(f"\nDone! Processed {total} images.")


if __name__ == '__main__':
    main()
