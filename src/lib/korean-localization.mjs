import { parse, serialize } from 'parse5';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, dirname } from 'node:path';

const normalize = value => value.trim().replace(/\s+/g, ' ');
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
function setAttr(node, name, value) {
  const old = node.attrs?.find(item => item.name === name);
  if (old) old.value = value;
  else (node.attrs ??= []).push({ name, value });
}
function removeAttr(node, name) { node.attrs = (node.attrs ?? []).filter(item => item.name !== name); }
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
function replaceText(node, value) { node.childNodes = [{ nodeName: '#text', value, parentNode: node }]; }
function descendants(node, predicate) {
  return (node.childNodes ?? []).flatMap(child => [ ...(predicate(child) ? [child] : []), ...descendants(child, predicate)]);
}
const classes = node => (attr(node, 'class') ?? '').split(' ');
const hasClass = (node, value) => classes(node).includes(value);
const localPath = value => value.startsWith('/') && !value.startsWith('//');
const koreanPath = value => value.startsWith('/ko/') ? value : `/ko${value}`;
let dictionaryPromise;
async function dictionary() {
  dictionaryPromise ??= (async () => {
    const result = JSON.parse(await readFile(new URL('../data/korean-translations.json', import.meta.url), 'utf8'));
    for (const file of await readdir('src/content/news')) {
      if (!file.endsWith('.md')) continue;
      const source = await readFile(join('src/content/news', file), 'utf8');
      const fields = Object.fromEntries([...source.matchAll(/^(\w+): (.+)$/gm)].map(([, key, value]) => [key, JSON.parse(value)]));
      if (fields.originalLanguage !== 'en' && fields.kind !== 'lab-update') result[fields.title] = fields.originalTitle;
      if (fields.source.includes(' · ') && /[가-힣]/.test(fields.source)) result[fields.source] = fields.source.split(' · ').at(-1);
    }
    return result;
  })();
  return dictionaryPromise;
}
function translator(dict) {
  function translate(value) {
    const key = normalize(value);
    let translated = dict[key];
    if (!translated && key.includes(' | ')) translated = key.split(' | ').map(part => dict[part] ?? part).join(' | ');
    if (!translated && /^View all \d+ reports$/.test(key)) translated = `보도 ${key.match(/\d+/)[0]}건 모두 보기`;
    if (!translated && /^Open photograph: /.test(key)) translated = `사진 확대: ${translate(key.slice(17))}`;
    if (!translated && key.includes(' + ')) {
      const [publisher, suffix] = key.split(' + ');
      if (/^\d+ more reports?$/.test(suffix)) translated = `${translate(publisher)} 외 ${suffix.match(/\d+/)[0]}건`;
    }
    if (!translated && key.startsWith('· ')) translated = `· ${translate(key.slice(2))}`;
    if (!translated && key.endsWith(' ·')) translated = `${translate(key.slice(0, -2))} ·`;
    if (!translated && key.startsWith('Updated ')) translated = `${translate(key.slice(8).replace(/ ·$/, ''))} 기준`;
    if (!translated && /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(key)) {
      const date = new Date(key + ' UTC');
      if (!Number.isNaN(date.valueOf())) translated = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
    }
    if (!translated && /^Redirecting to: /.test(key)) translated = `이동 중: ${koreanPath(key.slice(16))}`;
    if (!translated && key === 'Redirecting from') translated = '이전 주소';
    if (!translated) return value;
    return (value.match(/^\s*/)?.[0] ?? '') + translated + (value.match(/\s*$/)?.[0] ?? '');
  }
  return translate;
}
export async function localizeHtml(html, pathname) {
  const dict = await dictionary();
  const t = translator(dict);
  const doc = parse(html);
  const nodes = descendants(doc, () => true);
  const root = nodes.find(node => node.tagName === 'html');
  setAttr(root, 'lang', 'ko');
  const protectedNode = node => {
    if (['script', 'style'].includes(node.tagName)) return true;
    if (node.tagName === 'h3' && node.parentNode?.attrs?.some(item => item.name === 'data-publication')) return true;
    if ((hasClass(node, 'pub-authors') || hasClass(node, 'pub-venue')) && node.parentNode?.attrs?.some(item => item.name === 'data-publication')) return true;
    if (hasClass(node, 'record-detail') || hasClass(node, 'record-registration') || hasClass(node, 'record-years')) return true;
    if (hasClass(node, 'directory-person') && node.tagName === 'div') return false;
    if (node.tagName === 'h3' && hasClass(node.parentNode ?? {}, 'directory-person')) return true;
    if (hasClass(node, 'news-original')) return true;
    if (node.tagName === 'span' && hasClass(node.parentNode ?? {}, 'postal-address') && !attr(node, 'lang') && node.parentNode.childNodes.some(child => attr(child, 'lang') === 'ko')) return true;
    return false;
  };
  function visit(node, protectedAncestor = false) {
    const protectedHere = protectedAncestor || protectedNode(node);
    if (protectedHere && node.tagName && !['script', 'style'].includes(node.tagName) && /[A-Za-z]/.test(text(node)) && !/[가-힣]/.test(text(node))) setAttr(node, 'lang', 'en');
    if (node.nodeName === '#text' && !protectedHere) node.value = pathname.startsWith('/goodwellness/') && normalize(node.value) === 'Overview' ? '센터 개요' : t(node.value);
    if (!protectedHere && node.tagName === 'p' && dict[normalize(text(node))] && node.childNodes?.some(child => child.tagName === 'strong') && !descendants(node, child => child.tagName === 'a').length) replaceText(node, dict[normalize(text(node))]);
    for (const item of node.attrs ?? []) {
      if (['aria-label', 'alt', 'title', 'placeholder'].includes(item.name)) item.value = t(item.value);
      // Preserve record values and identifiers; Korean search additionally covers translated summaries.
      if (item.name === 'data-search' && (node.attrs?.some(a => a.name === 'data-news') || node.attrs?.some(a => a.name === 'data-story-id'))) {
        for (const [english, korean] of Object.entries(dict)) if (item.value.includes(english.toLowerCase())) item.value += ' ' + korean.toLowerCase();
      }
    }
    if (node.tagName === 'a' && !attr(node, 'data-language')) {
      const href = attr(node, 'href');
      if (href && localPath(href) && (href === '/' || !/^\/(?:images|fonts|_astro)\//.test(href)) && !/\.(?:pdf|webp|png|jpe?g|svg)$/.test(href)) setAttr(node, 'href', koreanPath(href));
      if (href?.startsWith('https://yonsei-smartlab.github.io/')) setAttr(node, 'href', href.replace('https://yonsei-smartlab.github.io/', 'https://yonsei-smartlab.github.io/ko/'));
    }
    if (node.tagName === 'meta' && attr(node, 'http-equiv')?.toLowerCase() === 'refresh') setAttr(node, 'content', attr(node, 'content').replace(/(url=)(\/[^; ]*)/i, (_, prefix, path) => prefix + koreanPath(path)));
    if (node.tagName === 'meta' && ['description', 'og:description', 'og:title'].includes(attr(node, 'name') ?? attr(node, 'property'))) {
      let content = attr(node, 'content');
      content = t(content);
      for (const [english, korean] of Object.entries(dict).sort((a, b) => b[0].length - a[0].length)) if (english.length > 30) content = content.replaceAll(english, korean);
      setAttr(node, 'content', content);
    }
    if ((node.tagName === 'link' && attr(node, 'rel') === 'canonical') || (node.tagName === 'meta' && attr(node, 'property') === 'og:url')) {
      const key = node.tagName === 'link' ? 'href' : 'content';
      setAttr(node, key, `https://yonsei-smartlab.github.io${koreanPath(pathname)}`);
    }
    if (node.tagName === 'iframe' && attr(node, 'src')?.startsWith('https://www.google.com/maps?')) {
      const url = new URL(attr(node, 'src')); url.searchParams.set('hl', 'ko'); setAttr(node, 'src', url.href);
    }
    for (const child of node.childNodes ?? []) visit(child, protectedHere);
  }
  visit(doc);
  for (const link of nodes.filter(node => attr(node, 'data-language'))) {
    const lang = attr(link, 'data-language');
    setAttr(link, 'href', lang === 'en' ? pathname : koreanPath(pathname));
    if (lang === 'ko') setAttr(link, 'aria-current', 'true'); else removeAttr(link, 'aria-current');
  }
  // Original Korean headlines belong in the title; avoid repeating them below the translated title.
  for (const node of nodes.filter(node => hasClass(node, 'news-original'))) {
    const container = node.parentNode;
    const heading = (container.childNodes ?? []).find(child => ['h1', 'h2'].includes(child.tagName)) ?? nodes.find(child => child.tagName === 'h1');
    if (heading && normalize(text(heading)) === normalize(text(node))) container.childNodes = container.childNodes.filter(child => child !== node);
  }
  // On Contact, place the supplied Korean address before its English counterpart.
  for (const node of nodes.filter(node => hasClass(node, 'postal-address'))) {
    const korean = (node.childNodes ?? []).filter(child => attr(child, 'lang') === 'ko');
    if (korean.length) {
      for (const child of korean) removeAttr(child, 'class');
      for (const child of node.childNodes.filter(child => child.tagName && !korean.includes(child))) setAttr(child, 'class', 'secondary-language');
      node.childNodes = [...korean, ...node.childNodes.filter(child => !korean.includes(child))];
    }
  }
  for (const book of nodes.filter(node => node.attrs?.some(item => item.name === 'data-book'))) {
    const heading = book.childNodes.find(child => child.tagName === 'h3');
    const original = book.childNodes.find(child => hasClass(child, 'secondary-language'));
    if (heading && original) { const english = text(heading); replaceText(heading, text(original)); replaceText(original, english); setAttr(original, 'lang', 'en'); }
  }
  return serialize(doc);
}
async function htmlFiles(directory) {
  const result = [];
  for (const file of await readdir(directory, { withFileTypes: true })) {
    if (file.name === 'ko') continue;
    const path = join(directory, file.name);
    if (file.isDirectory()) result.push(...await htmlFiles(path));
    else if (file.name.endsWith('.html')) result.push(path);
  }
  return result;
}
export default function koreanLocalization() {
  return {
    name: 'smartlab-korean-pages',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const pages = await htmlFiles(root);
        for (const page of pages) {
          const path = relative(root, page).replaceAll('\\', '/');
          const route = '/' + path.replace(/index\.html$/, '');
          const target = join(root, 'ko', path);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, await localizeHtml(await readFile(page, 'utf8'), route));
        }
        const sitemapPath = join(root, 'sitemap-0.xml');
        const xml = await readFile(sitemapPath, 'utf8');
        const entries = [...xml.matchAll(/<loc>(https:\/\/yonsei-smartlab\.github\.io[^<]*)<\/loc>/g)].map(([, url]) => `<url><loc>${url.replace('https://yonsei-smartlab.github.io/', 'https://yonsei-smartlab.github.io/ko/')}</loc></url>`).join('');
        await writeFile(sitemapPath, xml.replace('</urlset>', entries + '</urlset>'));
        logger.info(`Generated ${pages.length} Korean pages from reviewed copy; original bibliography metadata preserved.`);
      },
      'astro:server:setup': ({ server }) => {
        server.watcher.on('change', path => {
          if (path.endsWith('korean-translations.json') || path.includes('/src/content/news/')) dictionaryPromise = undefined;
        });
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'http://localhost');
          if (!url.pathname.startsWith('/ko/')) return next();
          try {
            const path = url.pathname.slice(3) || '/';
            const address = server.httpServer?.address();
            const port = typeof address === 'object' && address ? address.port : 4321;
            const response = await fetch(`http://127.0.0.1:${port}${path}${url.search}`);
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(await localizeHtml(await response.text(), path));
          } catch (error) { next(error); }
        });
      },
    },
  };
}
