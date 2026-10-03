"""Read saved Daum candidates for editorial review; never publish automatically."""
import argparse
import hashlib
import json
import re
import time
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlsplit

import importlib.util
spec = importlib.util.spec_from_file_location('news_search', Path(__file__).with_name('news-search.py'))
news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(news)


def review(candidate):
    url = candidate['url']
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    path = Path('.local/daum-source-review') / (key + '.json')
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    result = dict(url=url, title=candidate['title'], checkedOn=date.today().isoformat())
    try:
        source, final = news.fetch(url)
        tree = news.Tree(source).root
        body = tree.first(cls='article_view')
        if not body:
            result.update(status='body-unavailable', finalUrl=final)
        else:
            text = body.text()
            # These are signals to inspect, not evidence to publish an article.
            pattern = r'유승현|굿웰니스|GOOD\s?WELLNESS|Joshua(?:\s+\(Sung\))?\s+(?:H\.?\s*)?You|Sung\s+(?:\(Joshua\)\s+)?(?:Hyun|H\.?)\s*You|장애(?:인|아동).*?체력증진|(?:미라클|MIRACLE).{0,60}(?:보행|로봇)|(?:보행|로봇).{0,60}(?:미라클|MIRACLE)'
            matches = [text[max(0, match.start()-140):match.end()+240] for match in re.finditer(pattern, text, re.I)]
            result.update(finalUrl=final, body=text, status='identity-review-needed' if matches else 'no-identity-signal', matches=matches,
                          bodyElement='div.article_view',
                          originalLinks=[node.attrs['href'] for node in tree.all(tag='a', attr='href') if '기사원문' in node.text() or '원문보기' in node.text()])
    except Exception as error:
        result.update(status='source-error', error=str(error))
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    time.sleep(0.75)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('src/data/news-discovery-review.json'))
    parser.add_argument('--output', type=Path, default=Path('artifacts/daum-source-review.json'))
    parser.add_argument('--workers', type=int, default=3)
    args = parser.parse_args()
    candidates = [row for row in json.loads(args.input.read_text(encoding='utf-8'))['candidates']
                  if row['status'] == 'unreviewed' and urlsplit(row['url']).hostname == 'v.daum.net']
    Path('.local/daum-source-review').mkdir(parents=True, exist_ok=True)
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(review, candidate) for candidate in candidates]
        for future in as_completed(futures):
            results.append(future.result())
            if len(results) % 50 == 0:
                print(f'Read {len(results)} of {len(candidates)} Daum candidates.', flush=True)
    args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {}
    for row in results:
        counts[row['status']] = counts.get(row['status'], 0) + 1
    print(json.dumps(counts), flush=True)


if __name__ == '__main__':
    main()
