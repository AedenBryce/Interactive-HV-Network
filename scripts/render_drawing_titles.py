"""Render title-block crops for visual triage of PDFs with little extractable text."""

import io
import json
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tmp" / "pdfs" / "title-blocks"


def render_title(relative):
    path = ROOT / relative
    completed = subprocess.run(
        [shutil.which("pdftoppm"), "-f", "1", "-singlefile", "-scale-to", "3600", "-png", str(path)],
        capture_output=True,
        check=True,
    )
    with Image.open(io.BytesIO(completed.stdout)) as full:
        width, height = full.size
        crop = full.crop((int(width * 0.70), int(height * 0.84), width, height)).convert("RGB")
        crop.save(OUTPUT / (path.stem + ".png"))
    return path.name, crop


def main():
    inventory = json.loads((ROOT / "drawing-review" / "inventory.json").read_text(encoding="utf-8"))
    paths = inventory["summary"]["low_text_files"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as executor:
        rendered = list(executor.map(render_title, paths))
    font = ImageFont.truetype("arial.ttf", 22)
    for start in range(0, len(rendered), 12):
        batch = rendered[start:start + 12]
        canvas = Image.new("RGB", (2200, 6 * 450), "#d8dce0")
        draw = ImageDraw.Draw(canvas)
        for i, (name, crop) in enumerate(batch):
            x, y = (i % 2) * 1100, (i // 2) * 450
            draw.text((x + 10, y + 10), name, fill="black", font=font)
            crop.thumbnail((1080, 400))
            canvas.paste(crop, (x + 10, y + 45))
        canvas.save(OUTPUT / (f"sheet-{start // 12 + 1:02d}.png"))
    print(json.dumps({"rendered_title_blocks": len(rendered), "sheets": (len(rendered) + 11) // 12}))


if __name__ == "__main__":
    main()
