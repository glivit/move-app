#!/usr/bin/env python3
"""
Generate PNG icons from SVG
Requires: pip install cairosvg pillow
"""

import os
import sys
from pathlib import Path

def generate_icons():
    try:
        from cairosvg import svg2png
        from PIL import Image
        import io
    except ImportError:
        print("Error: cairosvg and pillow are required")
        print("Install with: pip install cairosvg pillow")
        sys.exit(1)

    script_dir = Path(__file__).parent
    public_dir = script_dir.parent / 'public'

    sizes = [192, 512]

    for size in sizes:
        svg_file = public_dir / f'icon-{size}x{size}.svg'
        png_file = public_dir / f'icon-{size}x{size}.png'

        if not svg_file.exists():
            print(f"SVG file not found: {svg_file}")
            continue

        try:
            # Convert SVG to PNG
            svg2png(
                url=str(svg_file),
                write_to=str(png_file),
                output_width=size,
                output_height=size
            )
            print(f"Generated: {png_file}")
        except Exception as e:
            print(f"Error generating {size}x{size} icon: {e}")

    print("Icon generation complete!")

if __name__ == '__main__':
    generate_icons()
