"""Publish transfer names, transfer years and recipient companies from a Yonsei export.

Usage: python scripts/import-technology-transfers.py export.xlsx
Requires openpyxl. Does not copy financial or participant fields.
"""
import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path

import openpyxl

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("workbook", type=Path)
args = parser.parse_args()
sheet = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True).active
sheet.reset_dimensions()
rows = list(sheet.iter_rows(values_only=True))
header_index = next(i for i, row in enumerate(rows) if "이전기술명" in row and "기술이전일자" in row)
headers = rows[header_index]
columns = {name: headers.index(name) for name in ["No", "이전기술명", "기술이전일자", "이전기업명"]}
records = []
for row_number, row in enumerate(rows[header_index + 1:], header_index + 2):
    if row[columns["No"]] is None:
        continue
    title = str(row[columns["이전기술명"]] or "").strip()
    company = str(row[columns["이전기업명"]] or "").strip()
    date = datetime.strptime(str(row[columns["기술이전일자"]]).strip(), "%Y.%m.%d")
    if not title or not company:
        raise ValueError(f"Missing public fields at row {row_number}")
    records.append((date, row_number, {"title": title, "year": date.year, "company": company}))
records.sort(key=lambda record: (-record[0].toordinal(), record[1]))
public = [record[2] for record in records]
audit = {
    "sourceFile": args.workbook.name,
    "sourceSha256": hashlib.sha256(args.workbook.read_bytes()).hexdigest(),
    "sheet": sheet.title,
    "headerRow": header_index + 1,
    "sourceRecordCount": len(public),
    "publishedCount": len(public),
    "publishedSourceRows": [record[1] for record in records],
    "publicColumns": {name: columns[name] + 1 for name in ["이전기술명", "기술이전일자", "이전기업명"]},
    "notes": "One entry per source row. Year is derived from technology-transfer date. Names are preserved as supplied. No financial amounts, participants, payroll/system identifiers, contract numbers or payment fields are copied.",
}
root = Path(__file__).resolve().parents[1]
for name, value in [("technology-transfers.json", public), ("technology-transfer-import.json", audit)]:
    (root / "src/data" / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Published {len(public)} technology transfers.")
