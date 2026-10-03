"""Read queued original publisher pages for editorial review, without publishing."""
import argparse
import hashlib
import importlib.util
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location('news_search', Path(__file__).with_name('news-search.py'))
news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(news)


IDENTITY_PATTERN = r'유승현|굿(?:웰|월)니스|GOOD\s?WELLNESS|Joshua(?:\s+\(Sung\)|\s+Sung(?:\s+Hyun)?)?\s+(?:H\.?\s*)?You|Sung\s+(?:\(Joshua\)\s+)?(?:Hyun|H\.?)\s*You|사회통합형.{0,40}(?:보행|로봇)|융합연구센터|SMART\s+(?:Lab|Institute)'

def identity_matches(text):
    return [text[max(0, match.start()-100):match.end()+180]
            for match in re.finditer(IDENTITY_PATTERN, text, re.I)]

def review(candidate):
    url = candidate['url']
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    cache = Path('.local/publisher-source-review') / (key + '.json')
    if cache.exists():
        result = json.loads(cache.read_text(encoding='utf-8'))
        if result.get('status') in ('identity-review-needed', 'no-identity-signal'):
            result['matches'] = identity_matches(result.get('body', ''))
            result['status'] = 'identity-review-needed' if result['matches'] else 'no-identity-signal'
            cache.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        return result
    result = dict(url=url, title=candidate['title'], checkedOn=date.today().isoformat())
    try:
        html, final = news.fetch(url)
        tree = news.Tree(html).root
        # This is a page-level screen. Related links and headers can also match;
        # a human must identify the article body and named institution.
        body = tree.first(tag='body') or tree
        text = body.text()
        matches = identity_matches(text)
        meta = {node.attrs.get('property', node.attrs.get('name', '')): node.attrs.get('content', '') for node in tree.all(tag='meta')}
        missing_body = not text.strip() or '요청하신 페이지를 찾을 수 없습니다' in text
        status = 'body-unavailable' if missing_body else ('identity-review-needed' if matches else 'no-identity-signal')
        result.update(finalUrl=final, body=text, bodyElement='publisher-page', matches=matches,
                      status=status,
                      meta={key: value for key, value in meta.items() if re.search('title|published|date|url|description', key, re.I)})
    except Exception as error:
        result.update(status='source-error', error=str(error))
    cache.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    time.sleep(0.75)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('src/data/news-discovery-review.json'))
    parser.add_argument('--output', type=Path, default=Path('artifacts/publisher-source-review.json'))
    parser.add_argument('--workers', type=int, default=3)
    args = parser.parse_args()
    queue = json.loads(args.input.read_text(encoding='utf-8'))['candidates']
    candidates = [row for row in queue if row['status'] == 'unreviewed'
                  and urlsplit(row['url']).hostname not in ('v.daum.net', 'news.google.com')]
    Path('.local/publisher-source-review').mkdir(parents=True, exist_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(review, candidate) for candidate in candidates]
        for future in as_completed(futures):
            results.append(future.result())
            if len(results) % 20 == 0:
                print(f'Read {len(results)} of {len(candidates)} publisher candidates.', flush=True)
    args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {}
    for row in results:
        counts[row['status']] = counts.get(row['status'], 0) + 1
    print(json.dumps(counts), flush=True)


if __name__ == '__main__':
    main()
