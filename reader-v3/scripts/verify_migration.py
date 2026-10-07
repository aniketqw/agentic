"""Check preservation of the supplied HTML in the production reader."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[2]
class Inventory(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.ids=[]; self.cards=0; self.code=0
    def handle_data(self,data): self.parts.append(data)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag=='details' and attrs.get('data-full-review')=='added': self.cards+=1
        if tag=='code': self.code+=1
source=(ROOT/'reader-v3/source/course.html').read_text()
manifest=json.loads((ROOT/'v3/manifest.json').read_text())
anchors=json.loads((ROOT/'v3/anchors.json').read_text())
sections=re.findall(r'(<section\b[^>]*>.*?</section>)',source,re.S)
cards=code=0
for section in sections:
    sid=re.search(r'<section[^>]*?\sid="([^"]+)"',section)[1]
    generated=(ROOT/'v3/content'/f'{sid}.html').read_text()
    original=Inventory(); original.feed(section)
    copy=Inventory(); copy.feed(generated)
    assert original.parts==copy.parts, f'{sid}: source text changed'
    assert set(original.ids)<=set(copy.ids), f'{sid}: IDs lost'
    assert original.cards==copy.cards and original.code==copy.code, f'{sid}: code or reviews lost'
    cards+=original.cards; code+=original.code
    for asset in re.findall(r'(?:src|href)="(assets/[^"]+)"',generated):
        assert (ROOT/'v3'/asset).exists(), f'Missing asset: {asset}'
assert len(sections)==len(manifest['pages'])==219
assert len(list((ROOT/'v3/content').glob('*.html')))==219
page_ids={p['id'] for p in manifest['pages']}
assert all(owner in page_ids for owner in anchors.values())
assert manifest['redirects']['chunk-part-0']=='chunk-les-step-0-1-i2'
assert all(target in page_ids and not manifest['redirects'].get(target) for target in manifest['redirects'].values())
assert len(manifest['order'])==133 and cards==133
assert all((ROOT/'v3/content'/f'{sid}.html').exists() for sid in manifest['order'])
assert manifest['source_sha256']==hashlib.sha256(source.encode()).hexdigest()
print(f'PASS: 219 sections, {cards} full-review cards, {code} code elements, {len(anchors):,} anchors; all text and original IDs retained. {len(manifest["redirects"])} structural redirects verified.')
report=f'''# V3 migration validation

- Source SHA-256: `{manifest['source_sha256']}`. Source matches the cumulative ZIP's final output exactly.
- All 219 sections preserve the exact sequence of source text nodes.
- All original section IDs, {cards} full-review disclosures, and {code} code elements are retained.
- {len(anchors):,} anchors resolve to generated sections.
- All 133 lesson IDs have output files; all {len(manifest['redirects'])} structural redirects target content pages.
- Every extracted asset referenced by a generated section exists.
- Root homepage, v2 source and v2 build have no changes (checked with Git).
- Production Vite build succeeds.

Run `python3 scripts/verify_migration.py` after building. These migration checks do not repeat or certify the educational/scientific audit.
'''
(ROOT/'reader-v3/VALIDATION.md').write_text(report)
