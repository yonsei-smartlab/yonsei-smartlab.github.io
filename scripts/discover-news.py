"""Collect free Google News RSS candidates; never publish unchecked name matches."""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

queries = ['"유승현" "연세"', '"유승현" "물리치료"', '"유승현" "로봇"', '"Joshua You" "Yonsei"']
candidates = {}
failures = []
for query in queries:
    url = 'https://news.google.com/rss/search?' + urlencode({'q': query, 'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'})
    try:
        request = Request(url, headers={'User-Agent': 'SMART-Lab-News-Review/1.0'})
        with urlopen(request, timeout=30) as response:
            feed = ET.fromstring(response.read())
        for item in feed.findall('./channel/item'):
            link = item.findtext('link', '')
            if not link.startswith('https://'):
                continue
            candidate = candidates.setdefault(link, {
                'title': item.findtext('title', ''), 'url': link,
                'published': item.findtext('pubDate', ''),
                'source': item.findtext('source', ''), 'queries': [],
                'status': 'Needs source and Yonsei affiliation verification',
            })
            candidate['queries'].append(query)
    except (OSError, ET.ParseError) as error:
        failures.append({'query': query, 'error': str(error)})

output = Path('artifacts/news-candidates.json')
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps({
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'candidates': list(candidates.values()), 'failures': failures,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(candidates)} candidates saved to {output}; {len(failures)} feed failures. No website content changed.')
