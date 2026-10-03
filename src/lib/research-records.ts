import grants from '../data/grants.json' with { type: 'json' };
import cvGrants from '../data/cv-grants.json' with { type: 'json' };
import patents from '../data/patents.json' with { type: 'json' };
import transfers from '../data/technology-transfers.json' with { type: 'json' };

export interface ResearchRecord {
  title: string;
  category: 'grants' | 'patents' | 'transfers';
  label: string;
  detail: string;
  years: number[];
  yearText: string;
  registrationNumber?: string;
}

export function normalizedRecordTitle(title: string, category: ResearchRecord['category']) {
  const normalized = title.normalize('NFKC').replace(/\s+/g, ' ').trim();
  // BK21 is an export prefix on later annual entries of the same named grant.
  return category === 'grants' ? normalized.replace(/^\[BK21\]\s*/i, '') : normalized;
}

function formatGrantYears(years: number[]) {
  const ranges: string[] = [];
  for (let index = 0; index < years.length;) {
    const start = years[index];
    let end = start;
    while (years[index + 1] === end + 1) end = years[++index];
    ranges.push(start === end ? String(start) : `${start}–${end}`);
    index++;
  }
  return ranges.join(', ');
}

export function getResearchRecords(): ResearchRecord[] {
  const sourceRecords: Omit<ResearchRecord, 'yearText'>[] = [
    ...[...grants, ...cvGrants].map(record => ({ title: record.title, category: 'grants' as const, label: 'Grant', detail: record.funder, years: Array.from({ length: record.endYear - record.startYear + 1 }, (_, index) => record.startYear + index) })),
    ...patents.map(record => ({ title: record.title, category: 'patents' as const, label: 'Patent', detail: '', years: [record.registrationYear], registrationNumber: record.registrationNumber })),
    ...transfers.map(record => ({ title: record.title, category: 'transfers' as const, label: 'Technology transfer', detail: record.company, years: [record.year] })),
  ];
  const groups = new Map<string, Omit<ResearchRecord, 'yearText'>>();
  for (const record of sourceRecords) {
    const key = record.category === 'patents'
      ? JSON.stringify([record.category, record.registrationNumber])
      : JSON.stringify([record.category, normalizedRecordTitle(record.title, record.category), record.detail]);
    const existing = groups.get(key);
    if (existing) existing.years.push(...record.years);
    else groups.set(key, { ...record, years: [...record.years] });
  }
  return [...groups.values()].map(record => {
    const years = [...new Set(record.years)].sort((a, b) => a - b);
    return { ...record, years, yearText: record.category === 'grants' ? formatGrantYears(years) : years.join(', ') };
  }).sort((a, b) => b.years.at(-1)! - a.years.at(-1)!);
}
