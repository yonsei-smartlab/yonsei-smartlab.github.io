import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const root = resolve('dist');
const expectedNav = ['Home', 'Research', 'People', 'Publications', 'Join Us / Contact'];
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
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) issues.push(`${pageName}: duplicate HTML IDs ${duplicateIds.join(', ')}`);
  if (/Harvard|Boston Children|Cohen Lab|bchcohenlab|SerpAPI|Jane Doe|John Roe/i.test(html)) issues.push(`${pageName}: borrowed template content remains`);
  const nav = html.match(/<ul[^>]*id="main-menu"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';
  const labels = [...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1].trim());
  if (JSON.stringify(labels) !== JSON.stringify(expectedNav)) issues.push(`${pageName}: incorrect navigation`);
  const pageRoute = '/' + relative(root, page).replaceAll('\\', '/').replace(/index\.html$/, '');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|tel:|data:)/.test(value)) {
      if (/^https?:/.test(value) && /src=/.test(match[0])) issues.push(`${pageName}: external asset ${value}`);
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
for (const route of ['index.html', 'research/index.html', 'people/index.html', 'publications/index.html', 'contact/index.html']) {
  if (!existsSync(join(root, route))) issues.push(`Missing page: ${route}`);
}
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else console.log('All pages have the five agreed tabs; internal links, local assets, and placeholder cleanup checks pass.');
