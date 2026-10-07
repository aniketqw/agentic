# Agentic course reader v3

The original `../index.html` and `../v2/` stays unchanged. This React/Vite reader is published alongside it at **https://aniketqw.github.io/agentic/v3/**.

## Build and publish

```sh
cd reader-v3
npm ci
npm run build
cd ..
git add reader-v3 v3 .gitignore
git commit -m "Update course reader"
git push origin main
```

GitHub Pages continues publishing the root of `main`. The checked-in `v3/` directory is the production build; no Pages configuration change is needed. Avoid deploying a replacement root build or switching the Pages publishing branch.

For development, run `npm run extract` followed by `npm run dev`. Vite uses the `/agentic/v3/` base path. The frozen input is `source/course.html`, copied from the supplied `Consolidated_Course_v3-2.html`. After updating that input, rerun the build to regenerate the reader's lesson files.

## Reader design

- `scripts/extract.py` preserves all 219 updated sections, their teaching text, stable IDs, mathematical TeX, code, sources and disclosures.
- The homepage downloads a small manifest, rather than the whole course.
- Individual sections are fetched on navigation. Query-string lesson URLs support direct opening and refreshing on static GitHub Pages.
- Shared images and fonts are extracted from embedded data URLs and cached independently by the browser.
- Math assets are loaded only for lessons with formulas. Formulas near the viewport render in short batches; printing renders the current lesson completely.
- Full-text search downloads its separate index only on use and runs in a worker.
- Bookmarks, marked-read lessons and last lesson reuse `course-v3-progress`; theme reuses `theme`. Both versions share these settings when used in the same browser on the same origin.
- Copy/download code controls, lesson printing, source cross-links and previous/next navigation are available.
- Contents can be closed and reopened on phones, tablets and desktops. Desktop visibility is remembered in this browser.
- Title-only part and appendix headings appear as group labels, not as reading pages. Older links to them open the first following lesson; the original section files remain preserved.

The source contains mathematical and research verification limits. These are preserved; this migration does not certify the course's factual claims or execute its Python examples. There is no whole-course print command in the new reader; use the original course for that.

## Content provenance and validation

The HTML input matches `full_run/output.html` in the supplied cumulative ZIP byte-for-byte. Its SHA-256 is `37f1a6e05f8de9bb2b8665300770fcbfbfad4c68cccc0cd03944345da7e2597e`. The supplied audit progress report is retained beside the input. The ZIP was inspected as supporting context; its audit programs were not executed as part of this website migration.

The reader preserves all 219 source sections, 133 full-review cards, correction notes, source links and embedded examples. It shares browser progress and theme settings with v2. Existing read marks may refer to an earlier edition; the updated review material remains available to reread.

See `VALIDATION.md` for migration checks. The course’s own scientific verification limits remain intact.
