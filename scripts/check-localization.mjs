import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'parse5';
const attr = (n, k) => n.attrs?.find(a => a.name === k)?.value;
const text = n => n.nodeName === '#text' ? n.value : (n.childNodes ?? []).map(text).join('');
const all = n => [n, ...(n.childNodes ?? []).flatMap(all)];
const has = (n, cls) => (attr(n, 'class') ?? '').split(' ').includes(cls);
async function files(dir) { const result = []; for (const f of await readdir(dir, { withFileTypes: true })) { if (f.name === 'ko') continue; const p = join(dir, f.name); if (f.isDirectory()) result.push(...await files(p)); else if (f.name.endsWith('.html')) result.push(p); } return result; }
let pages = 0, papers = 0;
for (const file of await files('dist')) {
  const path = relative('dist', file);
  const route = '/' + path.replace(/index\.html$/, '');
  const en = all(parse(await readFile(file, 'utf8')));
  const ko = all(parse(await readFile(join('dist/ko', path), 'utf8')));
  assert.equal(attr(ko.find(n => n.tagName === 'html'), 'lang'), 'ko', path);
  const switchLinks = ko.filter(n => attr(n, 'data-language'));
  // Astro-generated redirect aliases do not render the shared header.
  if (switchLinks.length) {
    assert.equal(attr(switchLinks.find(n => attr(n, 'data-language') === 'en'), 'href'), route, path);
    assert.equal(attr(switchLinks.find(n => attr(n, 'data-language') === 'ko'), 'aria-current'), 'true', path);
    assert.ok(ko.some(n => has(n, 'language-icon') && n.tagName === 'svg'), path);
  }
  const originalPapers = en.filter(n => n.attrs?.some(a => a.name === 'data-publication'));
  const localizedPapers = ko.filter(n => n.attrs?.some(a => a.name === 'data-publication'));
  assert.equal(originalPapers.length, localizedPapers.length, path);
  originalPapers.forEach((paper, index) => {
    const fields = p => all(p).filter(n => n.tagName === 'h3' || has(n, 'pub-authors') || has(n, 'pub-venue')).map(n => text(n).trim());
    const doi = p => all(p).filter(n => attr(n, 'href')?.startsWith('https://doi.org/')).map(n => attr(n, 'href'));
    assert.deepEqual(fields(localizedPapers[index]), fields(paper), `Bibliographic metadata changed: ${path}, ${index}`);
    assert.deepEqual(doi(localizedPapers[index]), doi(paper), `DOI changed: ${path}, ${index}`);
    papers++;
  });
  // Identifier and year fields must remain byte-for-byte equivalent.
  const records = nodes => nodes.filter(n => has(n, 'record-registration') || has(n, 'record-years')).map(text);
  assert.deepEqual(records(ko), records(en), `Record identifiers/years changed: ${path}`);
  for (const n of ko.filter(n => n.tagName === 'a' && !attr(n, 'data-language'))) {
    const href = attr(n, 'href');
    if (href?.startsWith('/') && !href.startsWith('//') && !/^\/(?:images|fonts|_astro)\//.test(href) && !/\.(?:pdf|webp|png|jpe?g|svg)$/.test(href)) assert.ok(href.startsWith('/ko/'), `Korean navigation escaped language: ${path}: ${href}`);
  }
  const originalRecords = en.filter(n => n.attrs?.some(a => a.name === 'data-record'));
  const localizedRecords = ko.filter(n => n.attrs?.some(a => a.name === 'data-record'));
  const recordFields = records => records.map(n => all(n).filter(child => child.tagName === 'h3' || has(child, 'record-detail')).map(text));
  assert.deepEqual(recordFields(localizedRecords), recordFields(originalRecords), `Source record names/funders changed: ${path}`);
  pages++;
}
console.log(`${pages} Korean counterparts pass; ${papers} publication entries retain original titles, authors, venues and DOI links; record numbers and years preserved.`);
