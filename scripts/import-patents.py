"""Extract patent titles, registration years and numbers from saved Yonsei grid pages.

Usage: python scripts/import-patents.py page1.html page2.html
Uses Python's standard library. Source files remain outside the repository.
"""
import argparse
import hashlib
import json
import re
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path


class PatentGrid(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_row = False
        self.in_cell = False
        self.rows = []
        self.row = []
        self.text = ""

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        classes = attributes.get("class", "").split()
        if tag == "tr" and any(name in classes for name in ("ev_dhx_terrace", "odd_dhx_terrace")):
            self.in_row = True
            self.row = []
        if self.in_row and tag == "td":
            self.in_cell = True
            self.text = ""

    def handle_data(self, data):
        if self.in_cell:
            self.text += data

    def handle_endtag(self, tag):
        if tag == "td" and self.in_cell:
            self.row.append(self.text.strip())
            self.in_cell = False
        if tag == "tr" and self.in_row:
            self.rows.append(self.row)
            self.in_row = False


def import_pages(paths):
    source_rows, sources, source_total = {}, [], None
    for path in paths:
        content = path.read_text(encoding="utf-8")
        if "지식재산권명" not in content or "등록일자" not in content:
            raise ValueError(f"Not a saved patent-list page: {path.name}")
        pager = re.search(r"Records from (\d+) to (\d+) of (\d+)", content)
        if not pager:
            raise ValueError(f"Missing record range: {path.name}")
        first, last, total = map(int, pager.groups())
        if source_total is not None and source_total != total:
            raise ValueError("Pages disagree about the total record count")
        source_total = total
        grid = PatentGrid()
        grid.feed(content)
        numbers = []
        for row in grid.rows:
            # Saved grid: No, hidden system fields, type, country, title,
            # application number/date, registration number/date, review fields.
            if len(row) != 15:
                raise ValueError("Unexpected patent grid columns")
            number = int(row[0])
            if number in source_rows:
                raise ValueError(f"Overlapping source row {number}")
            source_rows[number] = row
            numbers.append(number)
        if sorted(numbers) != list(range(first, last + 1)):
            raise ValueError(f"Saved rows do not match the pager: {path.name}")
        sources.append({"file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "firstRow": first, "lastRow": last, "recordCount": len(numbers)})
    if sorted(source_rows) != list(range(1, (source_total or 0) + 1)):
        raise ValueError("The supplied pages do not cover the complete patent list")

    # Some older registrations occur both with and without their type prefix.
    # Resolve a bare number only against one full number in the supplied export,
    # with matching title, registration date and application details.
    full_numbers = {}
    for row in source_rows.values():
        if row[10] and re.fullmatch(r"\d{2}-\d{7}(?:-00-00)?", row[9]):
            full_numbers.setdefault((row[5], row[9][3:10]), []).append(row)
    normalized_numbers, normalized_rows = {}, []
    for number, row in source_rows.items():
        if not row[10]:
            continue
        registration_number = row[9]
        if re.fullmatch(r"\d{7}", registration_number):
            candidates = full_numbers.get((row[5], registration_number), [])
            identities = {candidate[9].removesuffix("-00-00") for candidate in candidates}
            if len(identities) != 1 or not any(all(candidate[index] == row[index] for index in (6, 7, 8, 10)) for candidate in candidates):
                raise ValueError(f"Bare registration number needs review at row {number}")
            registration_number = identities.pop()
        else:
            registration_number = registration_number.removesuffix("-00-00")
        if not re.fullmatch(r"\d{2}-\d{7}", registration_number):
            raise ValueError(f"Unrecognized registration number at row {number}")
        normalized_numbers[number] = registration_number
        if registration_number != row[9]:
            normalized_rows.append({"row": number, "sourceNumber": row[9], "registrationNumber": registration_number})

    registered, held = {}, []
    for number, row in sorted(source_rows.items()):
        title, registration_number, registration_date = row[6], row[9], row[10]
        if not title:
            raise ValueError(f"Missing title at row {number}")
        if not registration_date:
            held.append(number)
            continue
        date = datetime.strptime(registration_date, "%Y-%m-%d")
        if not registration_number:
            raise ValueError(f"Registration date without number at row {number}")
        registration_number = normalized_numbers[number]
        # Match actual registrations, not titles or years.
        key = (row[5], registration_number)
        if key in registered:
            record = registered[key]
            if record["title"] != title or record["date"] != date:
                raise ValueError(f"Conflicting duplicate at row {number}")
            record["rows"].append(number)
        else:
            registered[key] = {"title": title, "date": date, "registrationNumber": registration_number, "rows": [number]}
    records = sorted(registered.values(), key=lambda record: (-record["date"].toordinal(), record["rows"][0]))
    public = [{"title": record["title"], "registrationYear": record["date"].year, "registrationNumber": record["registrationNumber"]} for record in records]
    registered_row_count = sum(len(record["rows"]) for record in records)
    audit = {
        "sources": sources,
        "sourceRecordCount": source_total,
        "registeredSourceRowCount": registered_row_count,
        "publishedCount": len(public),
        "duplicateRegisteredRowCount": registered_row_count - len(public),
        "heldMissingRegistrationDateCount": len(held),
        "publishedSourceRows": [record["rows"] for record in records],
        "heldMissingRegistrationDateRows": held,
        "normalizedRegistrationRows": normalized_rows,
        "publicFields": ["title", "registrationYear", "registrationNumber"],
        "notes": "Registered patents only. Year comes from registration date, not application date. Bare numbers are resolved only to an unambiguous full number in the same-country source with matching title, registration date and application details; trailing -00-00 is normalized. Duplicate country/registration-number records are consolidated; distinct numbers with the same title/year remain separate. The user approved public registration numbers. Country remains internal to reconciliation. Rows with no registration date are held out, without assuming their legal status.",
    }
    return public, audit


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pages", nargs="+", type=Path)
    args = parser.parse_args()
    public, audit = import_pages(args.pages)
    root = Path(__file__).resolve().parents[1]
    for name, value in [("patents.json", public), ("patent-import.json", audit)]:
        (root / "src/data" / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{audit['sourceRecordCount']} source rows: {len(public)} unique registered patents, {audit['duplicateRegisteredRowCount']} duplicate rows, {audit['heldMissingRegistrationDateCount']} without registration dates.")
