# V3 migration validation

- Source SHA-256: `37f1a6e05f8de9bb2b8665300770fcbfbfad4c68cccc0cd03944345da7e2597e`. Source matches the cumulative ZIP's final output exactly.
- All 219 sections preserve the exact sequence of source text nodes.
- All original section IDs, 133 full-review disclosures, and 1714 code elements are retained.
- 10,750 anchors resolve to generated sections.
- All 133 lesson IDs have output files; all 31 structural redirects target content pages.
- Every extracted asset referenced by a generated section exists.
- Root homepage, v2 source and v2 build have no changes (checked with Git).
- Production Vite build succeeds.

Run `python3 scripts/verify_migration.py` after building. These migration checks do not repeat or certify the educational/scientific audit.

## Browser checks

- Updated review card opens and displays its new content.
- Direct links to review disclosures open the disclosure automatically (fixed in v3).
- Sidebar close/reopen checked at desktop and iPad portrait dimensions.
- Search returns updated course text.
- Title-only part links redirect to the first lesson; direct refresh loads that lesson.
- Shared v2 bookmarks/progress remain visible.
- No console errors in the sampled navigation checks.
- All 19 embedded download links retain exact source bytes and filenames. The browser download automation stalled; download preservation was checked directly instead.
- Physical-device timing and an actual print preview were not measured.
