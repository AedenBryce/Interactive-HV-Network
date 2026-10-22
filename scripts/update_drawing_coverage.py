"""Record explicit area-review source tables without inferring reviewed topology."""

import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "drawing-review"


def source_table(review):
    """Only the first table is the review's declared source register."""
    rows = []
    started = False
    for line in review.read_text(encoding="utf-8-sig").splitlines():
        if line.startswith("|"):
            started = True
            rows.append(line)
        elif started:
            break
    return rows


def main():
    inventory = json.loads((REVIEW / "inventory.json").read_text(encoding="utf-8-sig"))
    drawings = inventory["drawings"]
    by_name = {Path(item["path"]).name: item for item in drawings}
    references = {name: [] for name in by_name}
    unmatched = []
    for review in sorted((REVIEW / "areas").glob("*-review.md")):
        for row in source_table(review):
            columns = row.split("|")
            if len(columns) < 4:
                continue
            match = re.search(r"([A-Za-z0-9][A-Za-z0-9._()% -]*\.pdf)", columns[2])
            if not match:
                continue
            name = unquote(match.group(1))
            record = {"review": review.relative_to(ROOT).as_posix(), "source_id": columns[1].strip(), "source_table_row": row}
            if name in references:
                references[name].append(record)
            else:
                unmatched.append({"filename": name, **record})
    seen = {}
    records = []
    for drawing in drawings:
        name = Path(drawing["path"]).name
        duplicate = seen.get(drawing["sha256"])
        seen.setdefault(drawing["sha256"], drawing["path"])
        reviews = references[name]
        disposition = "Source table recorded; see cited review for inspected scope and limitations" if reviews else "Awaiting visual classification and topology review"
        if duplicate:
            disposition = "Byte-identical duplicate; not counted as an independent topology review"
        records.append({"path": drawing["path"], "sha256": drawing["sha256"], "page_count": drawing["page_count"], "disposition": disposition, "duplicate_of": duplicate, "area_review_sources": reviews, "model_acceptance": "Unconfirmed"})
    output = {"method": "Explicit first source tables from area reviews; no inferred area allocation or topology acceptance", "source_count": len(records), "unique_sha256_count": len(seen), "files_with_explicit_review_source_row": sum(bool(record["area_review_sources"]) for record in records), "unmatched_source_rows": unmatched, "drawings": records}
    (REVIEW / "coverage.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    lines = ["# Drawing coverage", "", "Every supplied PDF has a disposition below. A source-table entry points to the recorded inspection scope; it does not approve the installed arrangement, revision precedence or model. Identical-file duplicates are recorded separately. Files awaiting classification remain unreviewed.", "", f"Files: {len(records)}. Unique SHA-256 values: {len(seen)}. Files named in explicit area-review source rows: {output['files_with_explicit_review_source_row']}.", "", "Regenerate with `scripts/update_drawing_coverage.py` after completing an area review. The script reads only the first source table; confirm its format before relying on the count. Full records and exact source-table rows are in `coverage.json`.", "", "| Supplied PDF | Disposition | Area review sources |", "| --- | --- | --- |"]
    for record in records:
        source_links = "; ".join(f"[{Path(item['review']).stem}: {item['source_id']}](../{item['review']})" for item in record["area_review_sources"]) or "No completed source-table entry"
        if record["duplicate_of"]:
            source_links += f"; duplicate of `{Path(record['duplicate_of']).name}`"
        lines.append(f"| `{Path(record['path']).name}` | {record['disposition']} | {source_links} |")
    (REVIEW / "coverage.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in output.items() if key != "drawings"}, indent=2))


if __name__ == "__main__":
    main()
