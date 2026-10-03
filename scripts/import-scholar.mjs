// Import a complete, public Scholar profile snapshot collected through the browser.
// No credentials, abstracts, metrics, paid scraping service, or live-site requests.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { isPublicationNotice } from '../src/lib/publication-policy.ts';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-scholar.mjs path/to/scholar-publications.json');
const snapshot = JSON.parse(await readFile(input, 'utf8'));
const profileId = 'C-fe4ZMAAAAJ';
if (new URL(snapshot.profile).searchParams.get('user') !== profileId || snapshot.exhausted !== true) {
  throw new Error('A complete snapshot of the approved Scholar profile is required.');
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.importedOn)) throw new Error('Missing import date');
const sourceIds = new Set();
const preserved = { IWHjjKOFINEC: 'publication-1', LkGwnXOMwfcC: 'publication-2', yD5IFk8b50cC: 'publication-3' };
// Review flags follow the observed author lists; they do not remove source entries.
const authorshipReview = new Set(['VL0QpB8kHFEC', 'eMMeJKvmdy0C', 'BUYA1_V_uYcC']);
const malformedAuthors = new Set(['xtRiw3GOFMkC', 'HDshCWvjkbEC', '_B80troHkn4C']);
const incompleteTitle = new Set(['Y5dfb0dijaUC']);
const quote = value => JSON.stringify(value);
const entries = snapshot.records.map((record, index) => {
  const source = new URL(record.url);
  const id = source.searchParams.get('citation_for_view')?.split(':')[1];
  if (source.hostname !== 'scholar.google.com' || source.searchParams.get('user') !== profileId || !/^[\w-]+$/.test(id ?? '') || sourceIds.has(id)) {
    throw new Error(`Invalid or duplicate Scholar source at record ${index + 1}`);
  }
  sourceIds.add(id);
  const fields = record.detail?.fields ?? {};
  const title = record.detail?.title || record.title;
  const authorText = malformedAuthors.has(id) ? record.authorsText : fields.Authors || record.authorsText || '';
  const authorListIncomplete = /\.\.\.|…/.test(authorText);
  const authors = authorText.split(/[,，]/).map(author => author.trim()).filter(author => author && !/^\.{3}$|^…$/.test(author));
  if (!title || !authors.length || /\.\.\.|…/.test(title)) throw new Error(`Incomplete title or authors for ${id}`);
  const year = /^\d{4}$/.test(record.year) ? Number(record.year) : undefined;
  const venue = fields.Journal || fields.Conference || fields.Book;
  const journal = venue
    ? `${venue}${fields.Volume ? ` ${fields.Volume}` : ''}${fields.Issue ? `(${fields.Issue})` : ''}${fields.Pages ? `, ${fields.Pages}` : ''}`
    : record.journal || '';
  const date = fields['Publication date'];
  const dateParts = date?.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  const fullDate = dateParts ? `${dateParts[1]}-${dateParts[2].padStart(2, '0')}-${dateParts[3].padStart(2, '0')}` : undefined;
  const forthcoming = !!fullDate && fullDate > snapshot.importedOn;
  const notes = [];
  if (authorshipReview.has(id)) notes.push('Authorship needs verification: the Scholar author list does not identify Professor You.');
  if (malformedAuthors.has(id)) notes.push('The author metadata on Scholar needs review.');
  if (incompleteTitle.has(id)) notes.push('The title on Scholar appears incomplete.');
  if (!journal) notes.push('Venue not listed on Scholar.');
  if (!year) notes.push('Year not listed on Scholar.');
  const areas = [];
  if (/neuromodulat|brain.modulat|transcranial|rtms|tdcs|corticomotor|h.reflex/i.test(title)) areas.push('area-1');
  if (/robot|walkbot|walkrite|healerbot|orthosis|prosthetic|orthotic/i.test(title)) areas.push('area-2');
  if (/sport|core stabili|neuromuscular stabili|muscle imbalance|propriocept|sensorimotor/i.test(title)) areas.push('area-3');
  if (/virtual reality|\bvr\b/i.test(title)) areas.push('area-1');
  let articleUrl = record.detail?.articleUrl;
  if (articleUrl && !/^https?:\/\//.test(articleUrl)) articleUrl = undefined;
  return { id, title, authors, journal, year, order: index + 10, publicationDate: date, forthcoming,
    url: articleUrl || record.url, scholarUrl: record.url, scholarId: id, importedOn: snapshot.importedOn,
    metadataNote: notes.length ? notes.join(' ') : undefined,
    reviewRequired: authorshipReview.has(id) || incompleteTitle.has(id), authorListIncomplete,
    areas, featured: false, placeholder: false };
});
for (const id of Object.keys(preserved)) if (!sourceIds.has(id)) throw new Error(`Featured source ${id} missing; review the snapshot before importing.`);
await mkdir('src/content/publications', { recursive: true });
for (const entry of entries) {
  const path = `src/content/publications/${preserved[entry.id] || `scholar-${entry.id}`}.md`;
  if (preserved[entry.id]) {
    const current = await readFile(path, 'utf8');
    // Preserve publisher-checked DOI, authors and featured selection.
    const clean = current.replace(/^(scholarId|scholarUrl|importedOn):.*\r?\n/gm, '');
    const additions = `scholarId: ${quote(entry.scholarId)}\nscholarUrl: ${quote(entry.scholarUrl)}\nimportedOn: ${quote(entry.importedOn)}\n`;
    await writeFile(path, clean.replace(/\r?\n---\s*$/, `\n${additions}---\n`));
  } else {
    const fields = Object.entries(entry).filter(([key, value]) => key !== 'id' && value !== undefined);
    await writeFile(path, `---\n${fields.map(([key, value]) => `${key}: ${quote(value)}`).join('\n')}\n---\n`);
  }
}
await writeFile('src/data/publication-import.json', JSON.stringify({
  profile: snapshot.profile, importedOn: snapshot.importedOn, count: entries.length,
  publishedCount: entries.filter(entry => !entry.reviewRequired && !isPublicationNotice(entry.title, entry.scholarId)).length,
  excludedNotices: entries.filter(entry => isPublicationNotice(entry.title, entry.scholarId)).map(entry => ({ id: entry.scholarId, title: entry.title })),
  heldForReview: entries.filter(entry => entry.reviewRequired).map(entry => ({ id: entry.scholarId, title: entry.title, note: entry.metadataNote })),
  profileFullyLoaded: true, expandedRecords: snapshot.records.filter(record => record.detail).length,
  authorshipReviewCount: authorshipReview.size, areaTagging: 'Conservative title keywords; untagged records remain unclassified.'
}, null, 2) + '\n');
console.log(`Imported ${entries.length} Scholar records; ${entries.filter(entry => !entry.reviewRequired && !isPublicationNotice(entry.title, entry.scholarId)).length} ready for display; ${entries.filter(entry => entry.reviewRequired).length} held for review.`);
