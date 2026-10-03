import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { getResearchRecords, normalizedRecordTitle } from '../src/lib/research-records.ts';
import { getNewsStories } from '../src/lib/news-stories.ts';
import { isPublicationNotice } from '../src/lib/publication-policy.ts';

const root = resolve('dist');
const expectedNav = ['Home', 'Professor', 'Members', 'Research', 'Publications', 'Grants & IP', 'News', 'Contact'];
const expectedCenterNav = ['Home', 'About', 'Rehabilitation robotics', 'Research and education', 'News', 'Contact'];
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
        const mapMarker = pageName === join('contact', 'index.html') ? '37.283834375,127.89878544375' : pageName === join('goodwellness', 'contact', 'index.html') ? '37.2988796,127.9205521' : null;
        const approvedMap = !!mapMarker
          && external.origin === 'https://www.google.com'
          && external.pathname === '/maps'
          && external.searchParams.get('q') === mapMarker
          && external.searchParams.get('output') === 'embed'
          && !external.searchParams.has('key');
        const approvedBroadcast = pageName === join('news', 'ktv-stroke', 'index.html')
          && external.origin === 'https://www.youtube-nocookie.com'
          && external.pathname === '/embed/z3J7y6uwhqw'
          && !external.search;
        if (!approvedMap && !approvedBroadcast) issues.push(`${pageName}: external asset ${value}`);
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
for (const route of ['index.html', 'research/index.html', 'research/grants/index.html', 'research/patents/index.html', 'professor/index.html', 'people/index.html', 'publications/index.html', 'training/index.html', 'news/index.html', 'contact/index.html', 'goodwellness/index.html', 'goodwellness/about/index.html', 'goodwellness/robogym/index.html', 'goodwellness/research-education/index.html', 'goodwellness/contact/index.html']) {
  if (!existsSync(join(root, route))) issues.push(`Missing page: ${route}`);
}
for (const route of ['people/index.html', 'people/alumni/index.html', 'people/international-collaborators/index.html']) {
  const peopleHtml = await readFile(join(root, route), 'utf8');
  for (const href of ['/people/', '/people/alumni/', '/people/international-collaborators/']) {
    if (!peopleHtml.includes(`href="${href}"`)) issues.push(`People subsection link missing in ${route}: ${href}`);
  }
  if (!/<nav[^>]*aria-label="Members navigation"[^>]*>[\s\S]*?aria-current="page"[\s\S]*?<\/nav>/.test(peopleHtml)) issues.push(`People active subsection missing: ${route}`);
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
const cvGrants = JSON.parse(await readFile('src/data/cv-grants.json', 'utf8'));
const grantAudit = JSON.parse(await readFile('src/data/grant-import.json', 'utf8'));
if (grants.length !== grantAudit.publishedCount) issues.push('Grant count differs from the project export');
if (grantAudit.publishedCount + grantAudit.excludedInternalCount !== grantAudit.sourceRecordCount) issues.push('Grant source counts do not reconcile');
if (grantAudit.includedRows.length !== grants.length || grantAudit.excludedInternalRows.length !== grantAudit.excludedInternalCount || new Set([...grantAudit.includedRows, ...grantAudit.excludedInternalRows]).size !== grantAudit.sourceRecordCount) issues.push('Grant source rows do not reconcile');
for (const grant of [...grants, ...cvGrants]) {
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
  ...[...grants, ...cvGrants].map(record => ({ title: record.title, category: 'grants', detail: record.funder, years: Array.from({ length: record.endYear - record.startYear + 1 }, (_, index) => record.startYear + index) })),
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
for (const route of ['research/index.html', 'training/index.html']) {
  const html = await readFile(join(root, route), 'utf8');
  const subnav = html.match(/<nav[^>]*aria-label="Research navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const labels = [...subnav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
  if (labels.join(',') !== 'Overview,Training') issues.push(`${route}: incorrect Research navigation`);
}
for (const route of ['research/walkbot/index.html', 'research/affiliations/index.html']) {
  const html = await readFile(join(root, route), 'utf8');
  if (!html.includes('/research/#area-2')) issues.push(`${route}: missing robotics overview redirect`);
}
const cvPublicationImport = JSON.parse(await readFile('src/data/cv-publication-import.json', 'utf8'));
const importSummary = JSON.parse(await readFile('src/data/publication-import.json', 'utf8'));
if ([...publicationHtml.matchAll(/data-publication(?:=|\s|>)/g)].length !== importSummary.publishedCount + cvPublicationImport.publishedCount) issues.push('Rendered publication count differs from the reviewed Scholar snapshot');
const books = JSON.parse(await readFile('src/data/books.json', 'utf8'));
const booksHtml = await readFile(join(root, 'publications/books/index.html'), 'utf8');
if ([...booksHtml.matchAll(/data-book(?:=|\s|>)/g)].length !== books.length) issues.push('Books and translations do not reconcile');
if (/data-book(?:=|\s|>)/.test(publicationHtml) || /data-publication(?:=|\s|>)/.test(booksHtml)) issues.push('Publications and books must use separate pages');
for (const [html, route] of [[publicationHtml, '/publications/'], [booksHtml, '/publications/books/']]) {
  const subnav = html.match(/<nav[^>]*aria-label="Publications navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const labels = [...subnav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
  if (labels.join(',') !== 'Publications,Books and translations') issues.push(`${route}: incorrect Publications navigation`);
  if (!subnav.includes(`href="${route}" aria-current="page"`)) issues.push(`${route}: missing active subpage`);
}
for (const record of cvPublicationImport.records) {
  if (!publicationHtml.includes(record.title.replaceAll('&', '&amp;')) || !publicationHtml.includes(`https://doi.org/${record.doi}`)) issues.push(`CV publication missing title or verified DOI: ${record.id}`);
}
const publicationItems = [...publicationHtml.matchAll(/<li\b[^>]*data-publication(?:=|\s|>)[\s\S]*?<\/li>/g)].map(match => match[0]);
const publicationReview = JSON.parse(await readFile('src/data/publication-review.json', 'utf8'));
for (const record of [...publicationReview.excludedRecords, ...publicationReview.heldRecords]) {
  if (publicationItems.some(item => item.includes(`:${record.scholarId}`))) issues.push(`Withheld publication appeared in public bibliography: ${record.scholarId}`);
}
for (const correction of publicationReview.metadataCorrections) {
  const item = publicationItems.find(item => item.includes(`:${correction.scholarId}`));
  if (!item?.includes(correction.title.replaceAll('&', '&amp;'))) issues.push(`Publication correction missing: ${correction.scholarId}`);
}
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
const roboticsNewsReview = JSON.parse(await readFile('src/data/news-robotics-scope-review.json', 'utf8'));
for (const report of roboticsNewsReview.reports) {
  const publicPath = `src/content/news/${report.id}.md`;
  if (report.decision === 'excluded') {
    if (existsSync(publicPath) || newsHtml.includes(`data-news-report="${report.id}"`)) issues.push(`Excluded product news still public: ${report.id}`);
    if (!existsSync(`src/data/news-source-archive/${report.id}.md`)) issues.push(`Excluded source record missing: ${report.id}`);
  } else if (!report.professorNamedInSource || !existsSync(publicPath)) issues.push(`Retained robotics news lacks reviewed Professor identity: ${report.id}`);
}
const newsAudit = JSON.parse(await readFile('src/data/news-import.json', 'utf8'));
const newsFiles = (await readdir('src/content/news')).filter(file => file.endsWith('.md'));
for (const report of newsAudit.editorialExclusions ?? []) {
  const filename = report.file.split('/').at(-1);
  if (!existsSync(report.file)) issues.push(`Excluded news source missing: ${filename}`);
  if (newsFiles.includes(filename) || newsHtml.includes(`data-news-report="${filename.replace(/\.md$/, '')}"`)) issues.push(`Editorially excluded news still public: ${filename}`);
}
const newsIdentityReview = JSON.parse(await readFile('src/data/news-publication-identity-check.json', 'utf8'));
const permittedNewsRelations = new Set(['professor-named-in-original', 'goodwellness-center', 'professor-historical-appointment', 'professor-research-center', 'goodwellness-historical-facility']);
if (JSON.stringify(newsIdentityReview.records.map(record => record.file.split('/').at(-1)).sort()) !== JSON.stringify([...newsFiles].sort())) issues.push('Public news and identity review records differ');
for (const report of newsIdentityReview.records) {
  if (!permittedNewsRelations.has(report.relation)) issues.push(`News lacks a reviewed Professor, project or center connection: ${report.file}`);
  if (['professor-research-center', 'goodwellness-historical-facility'].includes(report.relation) && (!report.scopeBasis || !report.supportingIdentitySources?.length || report.supportingIdentitySources.some(url => !/^https?:\/\//.test(url)))) issues.push(`Related project or historical center news lacks corroborating sources: ${report.file}`);
}
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
const newsFeatures = JSON.parse(await readFile('src/data/news-features.json', 'utf8'));
for (const [slug, feature] of Object.entries(newsFeatures)) {
  const featurePath = join(root, 'news', slug, 'index.html');
  if (!existsSync(featurePath) || !newsHtml.includes(`href="/news/${slug}/"`)) {
    issues.push(`News feature missing from archive: ${slug}`);
    continue;
  }
  const featureHtml = await readFile(featurePath, 'utf8');
  if (!newsFiles.includes(`${feature.id}.md`)) issues.push(`News feature lacks source record: ${slug}`);
  if (feature.gallery && (feature.gallery.some(photo => !featureHtml.includes(`src="${photo.src}"`)) || new Set(feature.gallery.map(photo => photo.src)).size !== feature.gallery.length)) issues.push(`Photo story omitted or repeated photographs: ${slug}`);
  if (feature.youtubeId && !featureHtml.includes(`https://www.youtube-nocookie.com/embed/${feature.youtubeId}`)) issues.push(`Broadcast feature lacks approved player: ${slug}`);
}
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
const newsDates = [...newsHtml.matchAll(/data-story-date="(\d{4}(?:-\d{2}-\d{2})?)"/g)].map(match => match[1]);
if (newsDates.some((date, index) => index > 0 && date > newsDates[index - 1])) issues.push('News archive is not newest first');
for (const route of ['professor/index.html', 'publications/index.html', 'news/index.html', 'goodwellness/news/index.html', 'grants-ip/index.html']) {
  const html = await readFile(join(root, route), 'utf8');
  if (/\[(?:Add|Insert|Year|Title|Short|Professor|PI)\b/.test(html)) issues.push(`${route}: unfinished text in a completed section`);
}
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else console.log(`${displayedRecords.length} archive rows, ${patents.length} distinct patent registrations, no duplicate identities, all source years preserved, lab and center navigation, approved fields, public contact, Scholar count, ${newsRecords.length} news reports, links and assets pass.`);
