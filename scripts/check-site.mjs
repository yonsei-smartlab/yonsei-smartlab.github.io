import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { getResearchRecords, normalizedRecordTitle } from '../src/lib/research-records.ts';
import { getNewsStories } from '../src/lib/news-stories.ts';
import { isPublicationNotice } from '../src/lib/publication-policy.ts';

const root = resolve('dist');
const expectedNav = ['Home', 'Professor', 'Members', 'Research', 'Publications', 'Grants & IP', 'News', 'Contact'];
const expectedCenterNav = ['Home', 'About', 'Rehabilitation Robotics', 'Research & Education', 'News', 'Contact'];
const issues = [];
async function htmlFiles(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) files.push(...await htmlFiles(path));
    else if (item.name.endsWith('.html')) files.push(path);
  }
  return files;
}
for (const page of await htmlFiles(root)) {
  const html = await readFile(page, 'utf8');
  const pageName = relative(root, page);
  const redirect = /http-equiv="refresh"/i.test(html);
  const visibleText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
  if (/\bPI\b|Principal Investigator/.test(visibleText)) issues.push(`${pageName}: obsolete Professor terminology`);
  if (/@gmail\.com/i.test(html)) issues.push(`${pageName}: personal Gmail address`);
  if (/profile lists|profile listed|source-checked|scraped|imported from|Biography sources:|needs verification|metadata.*review/i.test(visibleText)) issues.push(`${pageName}: internal editorial commentary in public copy`);
  if (/(?:\+82[-\s]?10|010)[-\s]\d{3,4}[-\s]\d{4}/.test(visibleText)) issues.push(`${pageName}: private mobile number`);
  if (pageName === 'index.html' && /MIRAE/i.test(visibleText)) issues.push('Homepage must not mention MIRAE Campus');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) issues.push(`${pageName}: duplicate HTML IDs ${duplicateIds.join(', ')}`);
  if (/Harvard|Boston Children|Cohen Lab|bchcohenlab|SerpAPI|Jane Doe|John Roe/i.test(html)) issues.push(`${pageName}: borrowed template content remains`);
  const nav = html.match(/<nav[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const labels = [...nav.matchAll(/<a\b[^>]*\bdata-nav-primary\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1].trim().replaceAll('&amp;', '&'));
  const expectedPageNav = pageName.startsWith('goodwellness' + (process.platform === 'win32' ? '\\' : '/')) ? expectedCenterNav : expectedNav;
  if (!redirect && JSON.stringify(labels) !== JSON.stringify(expectedPageNav)) issues.push(`${pageName}: incorrect navigation`);
  const switcher = html.match(/<div[^>]*class="site-switcher"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  if (!redirect && (!switcher.includes('href="/"') || !switcher.includes('href="/goodwellness/"') || !switcher.includes('GOODWELLNESS Center'))) issues.push(`${pageName}: missing website switcher`);
  const pageRoute = '/' + relative(root, page).replaceAll('\\', '/').replace(/index\.html$/, '');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|tel:|data:)/.test(value)) {
      if (value.startsWith('tel:') && value !== (pageName.startsWith('goodwellness/') ? 'tel:+82-33-765-2861' : 'tel:+82-33-760-2476')) issues.push(`${pageName}: unapproved telephone link`);
      if (/^https?:/.test(value) && /src=/.test(match[0])) {
        const external = new URL(value);
        const mapMarker = pageName === join('contact', 'index.html') ? '37.283834375,127.89878544375' : pageName === join('goodwellness', 'contact', 'index.html') ? '37.29874878996,127.921667903625' : null;
        const approvedMap = !!mapMarker
          && external.origin === 'https://www.openstreetmap.org'
          && external.pathname === '/export/embed.html'
          && external.searchParams.get('marker') === mapMarker;
        if (!approvedMap) issues.push(`${pageName}: external asset ${value}`);
      }
      continue;
    }
    const url = new URL(value, `https://local.example${pageRoute}`);
    let target = join(root, decodeURIComponent(url.pathname));
    if (existsSync(target) && (await stat(target)).isDirectory()) target = join(target, 'index.html');
    if (!existsSync(target)) { issues.push(`${pageName}: missing local resource ${value}`); continue; }
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = target === page ? html : await readFile(target, 'utf8');
      const id = decodeURIComponent(url.hash.slice(1));
      if (!targetHtml.includes(`id="${id}"`)) issues.push(`${pageName}: missing anchor ${value}`);
    }
  }
}
for (const route of ['index.html', 'research/index.html', 'research/grants/index.html', 'research/patents/index.html', 'professor/index.html', 'members/index.html', 'publications/index.html', 'training/index.html', 'news/index.html', 'contact/index.html', 'goodwellness/index.html', 'goodwellness/about/index.html', 'goodwellness/robogym/index.html', 'goodwellness/research-education/index.html', 'goodwellness/contact/index.html']) {
  if (!existsSync(join(root, route))) issues.push(`Missing page: ${route}`);
}
const publicationHtml = await readFile(join(root, 'publications/index.html'), 'utf8');
const archiveHtml = await readFile(join(root, 'grants-ip/index.html'), 'utf8');
const archiveItems = [...archiveHtml.matchAll(/<li\b[^>]*data-record(?:=|\s|>)[\s\S]*?<\/li>/g)].map(match => match[0]);
const categoryItems = category => archiveItems.filter(item => item.includes(`data-category="${category}"`));
const decodeText = text => text.replaceAll('&quot;', '"').replaceAll('&#34;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
function checkRecords(records, category, titleKey, yearText, detailText) {
  const items = categoryItems(category);
  if (items.length !== records.length) issues.push(`${category}: incorrect rendered count`);
  records.forEach((record, index) => {
    const item = items[index] ?? '';
    const title = decodeText(item.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '');
    const year = item.match(/class="record-years">([^<]+)<\/span>/)?.[1];
    const detail = decodeText(item.match(/class="record-detail">([^<]+)<\/span>/)?.[1] ?? '');
    const registration = item.match(/class="record-registration">([^<]+)<\/span>/)?.[1] ?? '';
    if (title !== record[titleKey] || year !== yearText(record) || detail !== detailText(record) || registration !== (record.registrationNumber ?? '')) issues.push(`${category}: rendered fields differ from source data`);
  });
}
const grants = JSON.parse(await readFile('src/data/grants.json', 'utf8'));
const grantAudit = JSON.parse(await readFile('src/data/grant-import.json', 'utf8'));
if (grants.length !== grantAudit.publishedCount) issues.push('Grant count differs from the project export');
if (grantAudit.publishedCount + grantAudit.excludedInternalCount !== grantAudit.sourceRecordCount) issues.push('Grant source counts do not reconcile');
if (grantAudit.includedRows.length !== grants.length || grantAudit.excludedInternalRows.length !== grantAudit.excludedInternalCount || new Set([...grantAudit.includedRows, ...grantAudit.excludedInternalRows]).size !== grantAudit.sourceRecordCount) issues.push('Grant source rows do not reconcile');
for (const grant of grants) {
  if (Object.keys(grant).sort().join(',') !== 'endYear,funder,startYear,title' || !grant.title || !grant.funder || !Number.isInteger(grant.startYear) || !Number.isInteger(grant.endYear) || grant.startYear > grant.endYear) issues.push('Grant record contains unapproved or invalid fields');
}
const patents = JSON.parse(await readFile('src/data/patents.json', 'utf8'));
const patentAudit = JSON.parse(await readFile('src/data/patent-import.json', 'utf8'));
const registeredRows = patentAudit.publishedSourceRows.flat();
const allPatentRows = [...registeredRows, ...patentAudit.heldMissingRegistrationDateRows].sort((a, b) => a - b);
if (patents.length !== patentAudit.publishedCount || patentAudit.registeredSourceRowCount !== registeredRows.length || registeredRows.length - patents.length !== patentAudit.duplicateRegisteredRowCount || patentAudit.heldMissingRegistrationDateRows.length !== patentAudit.heldMissingRegistrationDateCount || allPatentRows.length !== patentAudit.sourceRecordCount || allPatentRows.some((row, index) => row !== index + 1)) issues.push('Patent source rows do not reconcile');
if (patentAudit.publishedSourceRows.length !== patents.length || patentAudit.publishedSourceRows.some(rows => !rows.length)) issues.push('Patent records lack source-row mappings');
patents.forEach((patent, index) => {
  if (Object.keys(patent).sort().join(',') !== 'registrationNumber,registrationYear,title' || !patent.title || !Number.isInteger(patent.registrationYear) || !/^\d{2}-\d{7}$/.test(patent.registrationNumber)) issues.push('Patent record contains unapproved or invalid fields');
  if (index && patent.registrationYear > patents[index - 1].registrationYear) issues.push('Patents are not newest registration first');
});
const transfers = JSON.parse(await readFile('src/data/technology-transfers.json', 'utf8'));
const transferAudit = JSON.parse(await readFile('src/data/technology-transfer-import.json', 'utf8'));
if (transfers.length !== transferAudit.publishedCount || transfers.length !== transferAudit.sourceRecordCount || transferAudit.publishedSourceRows.length !== transfers.length || new Set(transferAudit.publishedSourceRows).size !== transfers.length) issues.push('Technology-transfer source rows do not reconcile');
for (const transfer of transfers) {
  if (Object.keys(transfer).sort().join(',') !== 'company,title,year' || !transfer.title || !transfer.company || !Number.isInteger(transfer.year)) issues.push('Technology transfer contains unapproved fields');
}
const displayedRecords = getResearchRecords();
for (const category of ['grants', 'patents', 'transfers']) {
  checkRecords(displayedRecords.filter(record => record.category === category), category, 'title', record => record.yearText, record => record.detail);
}
if (archiveItems.length !== displayedRecords.length) issues.push('Combined archive count does not reconcile');
const recordKey = record => record.category === 'patents' ? JSON.stringify([record.category, record.registrationNumber]) : JSON.stringify([record.category, normalizedRecordTitle(record.title, record.category), record.detail]);
const displayedKeys = displayedRecords.map(recordKey);
if (new Set(displayedKeys).size !== displayedKeys.length) issues.push('Duplicate record identity in combined archive');
if (new Set(patents.map(patent => patent.registrationNumber)).size !== patents.length || categoryItems('patents').length !== patents.length) issues.push('Distinct patent registrations were duplicated or lost');
const sourceRecords = [
  ...grants.map(record => ({ title: record.title, category: 'grants', detail: record.funder, years: Array.from({ length: record.endYear - record.startYear + 1 }, (_, index) => record.startYear + index) })),
  ...patents.map(record => ({ title: record.title, category: 'patents', detail: '', years: [record.registrationYear], registrationNumber: record.registrationNumber })),
  ...transfers.map(record => ({ title: record.title, category: 'transfers', detail: record.company, years: [record.year] })),
];
for (const record of sourceRecords) {
  const matching = displayedRecords.find(displayed => recordKey(displayed) === recordKey(record));
  if (!matching || record.years.some(year => !matching.years.includes(year))) issues.push('Grouped archive lost a source record or year');
}
for (const record of displayedRecords) {
  const sourceYears = new Set(sourceRecords.filter(source => recordKey(source) === recordKey(record)).flatMap(source => source.years));
  if (record.years.some(year => !sourceYears.has(year))) issues.push('Grouped archive invented a year');
}
for (const route of ['research/grants/index.html', 'research/patents/index.html']) {
  const html = await readFile(join(root, route), 'utf8');
  if (!html.includes('/grants-ip/?category=')) issues.push(`${route}: missing category redirect`);
}
for (const route of ['research/index.html', 'training/index.html', 'research/walkbot/index.html']) {
  const html = await readFile(join(root, route), 'utf8');
  const subnav = html.match(/<nav[^>]*aria-label="Research navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const labels = [...subnav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
  if (labels.join(',') !== 'Overview,Training,Walkbot') issues.push(`${route}: incorrect Research navigation`);
}
const importSummary = JSON.parse(await readFile('src/data/publication-import.json', 'utf8'));
if ([...publicationHtml.matchAll(/data-publication(?:=|\s|>)/g)].length !== importSummary.publishedCount) issues.push('Rendered publication count differs from the reviewed Scholar snapshot');
const publicationItems = [...publicationHtml.matchAll(/<li\b[^>]*data-publication(?:=|\s|>)[\s\S]*?<\/li>/g)].map(match => match[0]);
for (const item of publicationItems) {
  const heading = item.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '';
  const title = decodeText(heading.replace(/<[^>]+>/g, ''));
  if (isPublicationNotice(title) || importSummary.excludedNotices?.some(notice => notice.title === title)) issues.push(`Publication notice is publicly displayed: ${title}`);
  const titleUrl = heading.match(/href="([^"]+)"/)?.[1];
  const doiUrl = item.match(/<a href="([^"]+)">DOI<\/a>/)?.[1];
  if (titleUrl && !titleUrl.startsWith('https://doi.org/')) issues.push(`Publication title does not link to a DOI: ${title}`);
  if (doiUrl && titleUrl !== doiUrl) issues.push(`Publication title does not use its DOI: ${title}`);
}
const newsHtml = await readFile(join(root, 'news/index.html'), 'utf8');
const newsAudit = JSON.parse(await readFile('src/data/news-import.json', 'utf8'));
const newsFiles = (await readdir('src/content/news')).filter(file => file.endsWith('.md'));
const newsRecords = [];
for (const file of newsFiles) {
  const content = await readFile(join('src/content/news', file), 'utf8');
  const fields = Object.fromEntries([...content.matchAll(/^(\w+): (.+)$/gm)].map(([, key, value]) => [key, JSON.parse(value)]));
  newsRecords.push(fields);
  const reviewed = newsAudit.publishedReports.find(report => report.file === `src/content/news/${file}`);
  if (!reviewed || reviewed.status !== 'published' || reviewed.url !== fields.url || reviewed.date !== fields.date) issues.push(`${file}: news review record does not match public content`);
  if (fields.image && (!fields.imageAlt || !fields.imageCredit || !fields.imageSource || !fields.imageWidth || !fields.imageHeight)) issues.push(`${file}: incomplete news image attribution`);
}
const newsStories = getNewsStories(newsFiles.map((file, index) => ({ id: file.replace(/\.md$/, ''), data: newsRecords[index] })));
if ([...newsHtml.matchAll(/data-news(?:=|\s|>)/g)].length !== newsStories.length || newsRecords.length !== newsAudit.publishedCount) issues.push('Rendered news count differs from the grouped archive');
const renderedReportIds = [...newsHtml.matchAll(/data-news-report="([^"]+)"/g)].map(match => match[1]);
if (JSON.stringify([...renderedReportIds].sort()) !== JSON.stringify(newsFiles.map(file => file.replace(/\.md$/, '')).sort())) issues.push('News grouping omitted or repeated original reports');
const centerNewsHtml = await readFile(join(root, 'goodwellness/news/index.html'), 'utf8');
const centerNewsStories = getNewsStories(newsFiles.map((file, index) => ({ id: file.replace(/\.md$/, ''), data: newsRecords[index] })), { goodwellnessOnly: true });
const expectedCenterIds = newsFiles.filter((_file, index) => newsRecords[index].goodwellness).map(file => file.replace(/\.md$/, '')).sort();
const centerReportIds = [...centerNewsHtml.matchAll(/data-news-report="([^"]+)"/g)].map(match => match[1]).sort();
if (!expectedCenterIds.length || JSON.stringify(centerReportIds) !== JSON.stringify(expectedCenterIds)) issues.push('Center News must contain all and only reviewed GOODWELLNESS reports');
if ([...centerNewsHtml.matchAll(/data-news(?:=|\s|>)/g)].length !== centerNewsStories.length) issues.push('Center news story count does not reconcile');
for (const report of newsAudit.publishedReports) {
  const index = newsFiles.indexOf(report.file.split('/').at(-1));
  if (!!report.goodwellness !== !!newsRecords[index]?.goodwellness) issues.push(`${report.file}: center classification does not match review record`);
}
const newsUrls = newsRecords.map(record => record.url);
if (new Set(newsUrls).size !== newsUrls.length) issues.push('Duplicate original report in News archive');
const newsDates = [...newsHtml.matchAll(/data-story-date="(\d{4}-\d{2}-\d{2})"/g)].map(match => match[1]);
if (newsDates.some((date, index) => index > 0 && date > newsDates[index - 1])) issues.push('News archive is not newest first');
for (const route of ['professor/index.html', 'publications/index.html', 'news/index.html', 'goodwellness/news/index.html', 'grants-ip/index.html']) {
  const html = await readFile(join(root, route), 'utf8');
  if (/\[(?:Add|Insert|Year|Title|Short|Professor|PI)\b/.test(html)) issues.push(`${route}: unfinished text in a completed section`);
}
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else console.log(`${displayedRecords.length} archive rows, ${patents.length} distinct patent registrations, no duplicate identities, all source years preserved, lab and center navigation, approved fields, public contact, Scholar count, ${newsRecords.length} news reports, links and assets pass.`);
