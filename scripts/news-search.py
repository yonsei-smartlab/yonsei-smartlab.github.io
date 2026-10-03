"""Public Google News, Naver News and Daum News discovery, with saved coverage evidence.

Candidates require source verification before publication. No keys or paid services.
"""
import argparse
import hashlib
import html
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')
QUERIES = [
    '유승현 연세', '유승현 물리치료', '유승현 재활', '유승현 워크봇',
    '연세굿웰니스', '굿웰니스센터', '굿웰니스',
    'SMART 유승현', 'SMART Institute Yonsei', 'Joshua You Yonsei',
    'Joshua Sung You', '유승현 승마', '유승현 뇌조절',
]
VOID = {'img', 'meta', 'link', 'br', 'input', 'hr', 'source', 'area', 'embed', 'wbr', 'base'}

class Element:
    def __init__(self, tag='', attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []
    def all(self, tag=None, cls=None, attr=None):
        for child in self.children:
            if not isinstance(child, Element):
                continue
            if (not tag or child.tag == tag) and (not cls or cls in child.attrs.get('class', '').split()) and (not attr or attr in child.attrs):
                yield child
            yield from child.all(tag, cls, attr)
    def first(self, **kwargs):
        return next(self.all(**kwargs), None)
    def text(self):
        if self.tag in {'script', 'style', 'noscript'}:
            return ''
        return re.sub(r'\s+', ' ', ' '.join(child.text() if isinstance(child, Element) else child for child in self.children)).strip()

class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Element('document')
        self.stack = [self.root]
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)
    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break
    def handle_data(self, data):
        self.stack[-1].children.append(data)

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', value or ''))).strip()

def fetch(url):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; SMARTLabNewsReview/1.0)'})
    with urlopen(req, timeout=30) as response:
        raw = response.read()
        declared = re.search(rb'<meta\b[^>]*charset\s*=\s*["\x27]?\s*([\w-]+)', raw[:8192], re.I)
        charset = response.headers.get_content_charset() or (declared.group(1).decode('ascii') if declared else 'utf-8')
        return raw.decode(charset, errors='replace'), response.url

def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

def naver(source):
    result = []
    decoder = json.JSONDecoder()
    for match in re.finditer(r'\{"appElementAttrs"', source):
        try:
            data, _ = decoder.raw_decode(source[match.start():])
        except ValueError:
            continue
        for node in walk(data):
            if node.get('templateId') != 'newsItem':
                continue
            props = node.get('props', {})
            # Naver nests additional publishers in the primary report's cluster.
            for item in [props, *props.get('subInfoCluster', [])]:
                publisher = item.get('sourceProfile', {})
                result.append({
                    'title': clean(item.get('title')), 'url': item.get('titleHref'),
                    'snippet': clean(item.get('content')), 'source': clean(publisher.get('title')),
                    'published': ' '.join(value.get('text', '') for value in publisher.get('subTexts', [])),
                    'thumbnail': item.get('imageSrc'),
                })
    return result

def daum(source):
    tree = Tree(source).root
    result = []
    for node in tree.all(tag='li', attr='data-docid'):
        title = node.first(cls='item-title')
        anchor = title.first(tag='a') if title else None
        if not anchor:
            continue
        writer = node.first(cls='item-writer')
        snippet = node.first(cls='conts-desc')
        date = node.first(cls='gem-subinfo')
        thumb = node.first(cls='item-thumb')
        image = thumb.first(tag='img') if thumb else None
        result.append({
            'title': anchor.text(), 'url': anchor.attrs.get('href'),
            'snippet': snippet.text() if snippet else '', 'source': writer.text() if writer else '',
            'published': date.text() if date else '',
            'thumbnail': image.attrs.get('data-original-src') if image else None,
        })
    return result

def google(source):
    root = ET.fromstring(source)
    return [{'title': item.findtext('title', ''), 'url': item.findtext('link', ''),
             'source': item.findtext('source', ''), 'published': item.findtext('pubDate', ''),
             'snippet': clean(item.findtext('description', ''))} for item in root.findall('./channel/item')]

def search_query(engine, query, max_pages, delay=1.5, google_locale='ko'):
    candidates, seen, pages = [], set(), []
    for page in range(1, max_pages + 1):
        if engine == 'google':
            locale = {'hl': 'en-US', 'gl': 'US', 'ceid': 'US:en'} if google_locale == 'en' else {'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'}
            url = 'https://news.google.com/rss/search?' + urlencode({'q': query, **locale})
        elif engine == 'naver':
            url = 'https://search.naver.com/search.naver?' + urlencode({'where': 'news', 'query': query, 'start': (page-1)*10+1, 'sort': 0})
        else:
            url = 'https://search.daum.net/search?' + urlencode({'w': 'news', 'q': query, 'p': page, 'sort': 'accuracy', 'cluster': 'n'})
        try:
            time.sleep(delay)
            source, final_url = fetch(url)
            records = {'google': google, 'naver': naver, 'daum': daum}[engine](source)
        except Exception as error:
            return candidates, {'engine': engine, 'query': query, 'pages': pages, 'exhausted': False, 'error': str(error)}
        key = hashlib.sha256(f'{engine}:{query}:{page}:{google_locale}'.encode()).hexdigest()[:16]
        cache = Path('.local/news-search-snapshots')
        cache.mkdir(parents=True, exist_ok=True)
        (cache / f'{engine}-{key}.html').write_text(source, encoding='utf-8')
        fresh = [record for record in records if record.get('url') and record['url'] not in seen]
        pages.append({'page': page, 'url': url, 'finalUrl': final_url, 'rows': len(records), 'newRows': len(fresh), 'snapshot': f'{engine}-{key}.html'})
        for record in fresh:
            seen.add(record['url'])
            record['discoveredBy'] = [{'engine': engine, 'query': query, 'searchUrl': url}]
            candidates.append(record)
        if engine == 'google':
            return candidates, {'engine': engine, 'query': query, 'pages': pages, 'exhausted': len(records) < 100, 'rssLimitReached': len(records) >= 100}
        if not fresh:
            # Modern Naver loads more reports while scrolling; its legacy start
            # parameter can repeat page one. A repeat does not prove exhaustion.
            return candidates, {'engine': engine, 'query': query, 'pages': pages,
                                'exhausted': engine != 'naver',
                                'stopReason': 'Browser scrolling required' if engine == 'naver' else 'No new public result links'}
    return candidates, {'engine': engine, 'query': query, 'pages': pages, 'exhausted': False, 'pageLimitReached': True}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--engine', choices=['google', 'naver', 'daum', 'all'], default='all')
    parser.add_argument('--query', action='append')
    parser.add_argument('--max-pages', type=int, default=30)
    parser.add_argument('--workers', type=int, default=1)
    parser.add_argument('--delay', type=float, default=1.5)
    parser.add_argument('--google-locale', choices=['ko', 'en'], default='ko')
    parser.add_argument('--output', default='artifacts/news-discovery.json')
    args = parser.parse_args()
    engines = ['google', 'naver', 'daum'] if args.engine == 'all' else [args.engine]
    queries = args.query or QUERIES
    candidates, coverage = {}, []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        tasks = {pool.submit(search_query, engine, query, args.max_pages, args.delay, args.google_locale): (engine, query) for engine in engines for query in queries}
        for task in as_completed(tasks):
            rows, audit = task.result()
            coverage.append(audit)
            for row in rows:
                url = row['url'].replace('http://v.daum.net/', 'https://v.daum.net/')
                row['url'] = url
                if url in candidates:
                    candidates[url]['discoveredBy'].extend(row['discoveredBy'])
                else:
                    candidates[url] = row
            print(f"{audit['engine']}: {audit['query']} — {len(rows)} results, {len(audit['pages'])} pages, exhausted={audit['exhausted']}", flush=True)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'checkedAt': datetime.now(timezone.utc).isoformat(), 'coverage': coverage,
                                 'candidates': list(candidates.values())}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'{len(candidates)} distinct candidate links saved to {output}. No website content changed.', flush=True)

if __name__ == '__main__':
    main()
