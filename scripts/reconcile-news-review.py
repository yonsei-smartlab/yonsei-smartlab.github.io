"""Combine saved discovery snapshots into an editorial queue, without publishing.

Only exact reviewed URLs, explicit aliases and recorded exclusions resolve a
candidate. A title or keyword match never approves an article for publication.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def normalized(url):
    parsed = urlsplit(url)
    host = (parsed.hostname or '').lower().removeprefix('www.')
    if parsed.port and parsed.port not in (80, 443):
        host += ':' + str(parsed.port)
    tracking = {'ref', 'sid', 'sc', 'input', 'from', 'utm_source', 'utm_medium', 'utm_campaign'}
    query = [(key, value) for key, value in parse_qsl(parsed.query) if key not in tracking]
    return urlunsplit(('https', host, parsed.path, urlencode(sorted(query)), ''))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshots', nargs='+', type=Path)
    parser.add_argument('--output', type=Path, default=Path('src/data/news-discovery-review.json'))
    parser.add_argument('--source-review', type=Path, action='append', default=[],
                        help='Saved body screening results; these never approve publication.')
    args = parser.parse_args()
    audit = json.loads(Path('src/data/news-import.json').read_text(encoding='utf-8'))
    published = {normalized(row['url']): row for row in audit['publishedReports']}
    aliases = {normalized(row['url']): row['canonical'] for row in audit.get('portalAliases', [])}
    aliases.update({normalized(row['url']): row['canonical'] for row in audit.get('duplicateReports', [])})
    exclusions = {normalized(row['url']): row for row in audit.get('excludedExamples', [])}
    exclusions.update({normalized(row['url']): row for row in audit.get('editorialExclusions', [])})
    # Preserve explicit original-source decisions made in supplementary audits.
    # Screening signals alone never resolve a candidate.
    for review_file, rows_key in [
        ('news-walkbot-source-fact-check.json', 'records'),
        ('news-held-source-review.json', 'records'),
        ('news-daum-source-fact-check.json', 'records'),
        ('walkbot-press-review.json', 'candidates'),
    ]:
        review_path = Path('src/data') / review_file
        if not review_path.exists():
            continue
        for row in json.loads(review_path.read_text(encoding='utf-8')).get(rows_key, []):
            if row.get('status') != 'excluded':
                continue
            decision = dict(row, reason=row.get('reason') or row.get('decisionReason')
                            or row.get('reviewNote') or row.get('evidence'))
            for url in {row['url'], row.get('finalUrl', row['url'])}:
                exclusions[normalized(url)] = decision
    unavailable = {normalized(row['url']): row for row in audit.get('unavailableSources', [])}
    held = {normalized(row['url']): row for row in audit.get('heldForReview', [])}
    candidates, coverage = {}, []
    for path in args.snapshots:
        data = json.loads(path.read_text(encoding='utf-8'))
        coverage.extend(data.get('coverage', []))
        for row in data.get('candidates', []):
            key = normalized(row['url'])
            if key not in candidates:
                candidates[key] = {key: row.get(key, '') for key in ('url', 'title', 'source')}
                candidates[key]['discoveredBy'] = []
            for discovery in row.get('discoveredBy', []):
                if discovery not in candidates[key]['discoveredBy']:
                    candidates[key]['discoveredBy'].append(discovery)
    for key, row in candidates.items():
        if key in published:
            row.update(status='published', publicFile=published[key]['file'])
        elif key in aliases:
            row.update(status='duplicate', canonical=aliases[key])
        elif key in exclusions:
            row.update(status='excluded', reason=exclusions[key]['reason'])
        elif key in unavailable:
            row.update(status='unavailable', reason=unavailable[key]['evidence'])
        elif key in held:
            row.update(status='held', reason=held[key]['reason'])
        else:
            row.update(status='unreviewed')
    for source_review_path in args.source_review:
        for result in json.loads(source_review_path.read_text(encoding='utf-8')):
            row = candidates.get(normalized(result['url']))
            if not row:
                continue
            status = result['status']
            # Keep article bodies in the ignored review cache. Identity patterns
            # only prioritise manual review; they do not resolve candidates.
            row['sourceScreen'] = dict(status=status, checkedOn=result['checkedOn'],
                                       bodyElement=result.get('bodyElement'),
                                       matchCount=len(result.get('matches', [])))
    # Refresh batches can repeat cached URLs. Count each candidate's retained
    # screen once, rather than counting duplicate input records.
    source_screen_counts = {}
    for row in candidates.values():
        if 'sourceScreen' in row:
            status = row['sourceScreen']['status']
            source_screen_counts[status] = source_screen_counts.get(status, 0) + 1
    # Older discovery snapshots called repeating legacy Naver pages exhausted.
    # Correct that label while preserving each request's observed row counts.
    for item in coverage:
        if item['engine'] == 'naver' and any(page.get('rows', 0) > 0 and page.get('newRows') == 0 for page in item.get('pages', [])):
            item.update(exhausted=False, stopReason='BrowserScrollingRequired')
    counts = {}
    for row in candidates.values():
        counts[row['status']] = counts.get(row['status'], 0) + 1
    result = dict(reviewedOn=audit['reviewedOn'], complete=False,
                  note='Editorial queue only. Search results do not establish identity or approve public content.',
                  candidateCount=len(candidates), statusCounts=counts,
                  sourceScreenCounts=source_screen_counts,
                  coverage=coverage, candidates=list(candidates.values()))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(candidateCount=len(candidates), statusCounts=counts)))


if __name__ == '__main__':
    main()
