"""Read a Yonsei project export; publish only title, years and funding agency.

Usage: python scripts/import-grants.py /path/to/project-export.xlsx
Requires openpyxl. Original workbook remains unchanged.
"""
import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import openpyxl

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("workbook", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
sheet = workbook.active
# The supplied export reports A1 despite containing 108 rows.
sheet.reset_dimensions()
rows = list(sheet.iter_rows(values_only=True))
header_index = next(i for i, row in enumerate(rows) if "과제명" in row and "연구비지원기관" in row)
headers = rows[header_index]
columns = {name: headers.index(name) for name in ["No", "과제명", "지원구분", "연구시작년월", "연구종료년월", "연구비지원기관"]}
records, included_rows, excluded_rows = [], [], []
categories = Counter()
for row_number, row in enumerate(rows[header_index + 1:], header_index + 2):
    if not row or row[columns["No"]] is None:
        continue  # Second header row.
    category = str(row[columns["지원구분"]]).strip()
    categories[category] += 1
    if category == "교내":
        excluded_rows.append(row_number)
        continue
    title = str(row[columns["과제명"]] or "").strip()
    funder = str(row[columns["연구비지원기관"]] or "").strip()
    start = datetime.strptime(str(row[columns["연구시작년월"]]).strip(), "%Y.%m.%d")
    end = datetime.strptime(str(row[columns["연구종료년월"]]).strip(), "%Y.%m.%d")
    if not title or not funder or end < start:
        raise ValueError(f"Incomplete or invalid public fields at row {row_number}")
    records.append((start, row_number, {"title": title, "startYear": start.year, "endYear": end.year, "funder": funder}))
    included_rows.append(row_number)
records.sort(key=lambda item: (-item[0].toordinal(), item[1]))
public = [item[2] for item in records]
audit = {
    "sourceFile": args.workbook.name,
    "sourceSha256": hashlib.sha256(args.workbook.read_bytes()).hexdigest(),
    "sheet": sheet.title,
    "headerRow": header_index + 1,
    "sourceRecordCount": sum(categories.values()),
    "publishedCount": len(public),
    "excludedInternalCount": len(excluded_rows),
    "sourceCategories": dict(categories),
    "includedRows": included_rows,
    "excludedInternalRows": excluded_rows,
    "publicColumns": {key: columns[key] + 1 for key in ["과제명", "연구시작년월", "연구종료년월", "연구비지원기관"]},
    "notes": "One entry per non-internal source row, including annual stages, contracts and technology-transfer income. Years use project start/end dates, not funding-accounting year. Funding labels are preserved exactly; generic labels are not expanded to guessed agencies.",
}
for name, value in [("grants.json", public), ("grant-import.json", audit)]:
    (root / "src/data" / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Published {len(public)} records; excluded {len(excluded_rows)} internal records.")
