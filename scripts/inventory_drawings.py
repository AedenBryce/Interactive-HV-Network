"""Inventory source PDFs and extract text; this does not infer network topology."""

import hashlib
import json
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "drawings" / "Asset Drawing Repo"
OUTPUT = ROOT / "drawing-review"
TEXT = OUTPUT / "extracted-text"


def inspect_pdf(path):
    relative = path.relative_to(ROOT).as_posix()
    record = {
        "path": relative,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
    try:
        reader = PdfReader(path)
        record["page_count"] = len(reader.pages)
        record["pages"] = [
            {
                "page": i + 1,
                "width_points": float(page.mediabox.width),
                "height_points": float(page.mediabox.height),
                "rotation": page.rotation,
            }
            for i, page in enumerate(reader.pages)
        ]
        record["pdf_metadata"] = {
            str(key): str(value) for key, value in (reader.metadata or {}).items()
        }
        text_path = TEXT / (path.stem + ".txt")
        extracted = "\n\f\n".join(page.extract_text() or "" for page in reader.pages)
        text_path.write_text(extracted, encoding="utf-8")
        record["text_path"] = text_path.relative_to(ROOT).as_posix()
        record["text_characters"] = len(extracted.strip())
        record["text_lines"] = len(extracted.splitlines())
        record["extraction_method"] = "pypdf plain text; diagram connectivity requires visual review"
    except Exception as exc:
        record["error"] = str(exc)
    return record


def write_register(records):
    register = [
        "# Source drawing register",
        "",
        "Generated from the supplied folder. This is a file inventory, not approval of drawing revisions or topology.",
        "",
        "| Source PDF | Pages | Text characters | Text extraction |",
        "| --- | ---: | ---: | --- |",
    ]
    for record in records:
        name = Path(record["path"]).name
        source_link = "../" + record["path"].replace(" ", "%20")
        status = "Read error" if "error" in record else (
            "Little/no text; visual review required" if record["text_characters"] < 100 else "Text available; diagram review still required"
        )
        register.append(f"| [{name}]({source_link}) | {record.get('page_count', '?')} | {record.get('text_characters', '?')} | {status} |")
    (OUTPUT / "drawing-register.md").write_text("\n".join(register) + "\n", encoding="utf-8")


def main():
    TEXT.mkdir(parents=True, exist_ok=True)
    paths = sorted(SOURCE.rglob("*.pdf"))
    with ThreadPoolExecutor(max_workers=4) as executor:
        records = list(executor.map(inspect_pdf, paths))
    hashes = defaultdict(list)
    for record in records:
        hashes[record["sha256"]].append(record["path"])
    summary = {
        "source_directory": SOURCE.relative_to(ROOT).as_posix(),
        "pdf_count": len(records),
        "total_pages": sum(record.get("page_count", 0) for record in records),
        "total_bytes": sum(record["bytes"] for record in records),
        "errors": [record for record in records if "error" in record],
        "low_text_files": [record["path"] for record in records if record.get("text_characters", 0) < 100],
        "identical_file_groups": [group for group in hashes.values() if len(group) > 1],
        "review_status": "Inventory only; text extraction does not establish drawing completeness or network topology",
    }
    (OUTPUT / "inventory.json").write_text(
        json.dumps({"summary": summary, "drawings": records}, indent=2), encoding="utf-8"
    )
    write_register(records)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
