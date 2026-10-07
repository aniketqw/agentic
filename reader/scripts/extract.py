"""Split the original course without modifying it; standard library only."""
from html.parser import HTMLParser
from pathlib import Path
import base64, hashlib, json, re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'reader/public'
source = (ROOT / 'index.html').read_text()
for folder in ('content', 'assets'):
    (OUT / folder).mkdir(parents=True, exist_ok=True)
# Remove stale generated sections before each reproducible extraction.
for old in (OUT / 'content').glob('*.html'):
    old.unlink()

def externalize(text, css=False):
    def replace(match):
        mime, payload = match.group(1), match.group(2)
        raw = base64.b64decode(payload)
        ext = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'font/woff2': 'woff2', 'font/woff': 'woff'}.get(mime, 'bin')
        name = hashlib.sha256(raw).hexdigest()[:20] + '.' + ext
        (OUT / 'assets' / name).write_bytes(raw)
        return ('./' if css else 'assets/') + name
    return re.sub(r'data:([^;,]+);base64,([A-Za-z0-9+/=]+)', replace, text)

class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_data(self, data):
        self.parts.append(data)

def plain(html):
    p = Text(); p.feed(html)
    return ' '.join(' '.join(p.parts).split())

data = json.loads(re.search(r'<script[^>]*id="v3-course-data"[^>]*>(.*?)</script>', source, re.S)[1])
styles = re.findall(r'<style[^>]*>(.*?)</style>', source, re.S)
(OUT / 'assets/math.css').write_text(externalize(styles[0], css=True))
# Content styling only; the new reader supplies its own layout and controls.
(OUT / 'assets/course.css').write_text(styles[1] + '\n' + styles[2] + '\n' + styles[3])
scripts = re.findall(r'<script[^>]*>(.*?)</script>', source, re.S)
katex = next(script for script in scripts if script.startswith('!function'))
(OUT / 'assets/math.js').write_text(katex)

sections = re.findall(r'(<section\b[^>]*>.*?</section>)', source, re.S)
assert len(sections) == source.count('</section>'), 'Unexpected nested section structure'
meta = {x['id']: x for x in data['lessons']}
group_titles = {}
for section in sections:
    section_id = re.search(r'<section[^>]*?\sid="([^"]+)"', section)[1]
    heading = re.search(r'<h[1-6]\b[^>]*>(.*?)</h[1-6]>', section, re.S)
    if heading:
        group_titles[section_id] = plain(heading[1])
pages, anchors, search = [], {}, []
group = 'Introduction'
for section in sections:
    sid = re.search(r'<section[^>]*?\sid="([^"]+)"', section)[1]
    heading = re.search(r'<h[1-6]\b[^>]*>(.*?)</h[1-6]>', section, re.S)
    title = meta.get(sid, {}).get('title') or (plain(heading[1]) if heading else sid)
    if (sid.startswith('chunk-part-') or title.startswith('Appendix ')) and sid not in meta:
        group = title
    # Match the stable subheading IDs assigned by the original reader.
    number = [0]
    def heading_id(match):
        number[0] += 1
        tag = match[0]
        return tag if re.search(r'\bid=', tag) else tag[:-1] + f' id="v3-heading-{sid}-{number[0]}">'
    section = re.sub(r'<h[3-6]\b[^>]*>', heading_id, section)
    for anchor in re.findall(r'\sid="([^"]+)"', section):
        anchors.setdefault(anchor, sid)
    text = plain(section)
    content = externalize(section)
    (OUT / 'content' / f'{sid}.html').write_text(content)
    page_group = group_titles.get(meta.get(sid, {}).get('group')) or ('Supplementary lessons' if sid in meta and not sid.startswith('chunk-') else group if sid.startswith('chunk-') else 'Guides & verification')
    pages.append({'id': sid, 'title': title, 'group': page_group,
                  'core': sid in meta, 'bytes': len(content.encode()), 'words': len(text.split())})
    search.append({'id': sid, 'text': text.lower()})
# Structural titles belong in the contents, not in standalone reading pages.
redirects = {}
next_page = None
for page in reversed(pages):
    header = re.fullmatch(r'chunk-(?:part-\d+|app-(?:a|b|[abg]\d+))', page['id'])
    if header and next_page:
        redirects[page['id']] = next_page
        page['redirect'] = next_page
    else:
        next_page = page['id']
manifest = {'pages': pages, 'redirects': redirects, 'order': data['order'], 'source_sha256': hashlib.sha256(source.encode()).hexdigest()}
(OUT / 'anchors.json').write_text(json.dumps(anchors, separators=(',', ':')))
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
(OUT / 'search.json').write_text(json.dumps([entry for entry in search if entry['id'] not in redirects], ensure_ascii=False, separators=(',', ':')))
print(f'Preserved {len(pages)} sections and {len(anchors)} anchors; largest section {max(p["bytes"] for p in pages):,} bytes.')
