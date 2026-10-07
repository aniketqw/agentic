# Agentic course reader

The original `../index.html` stays unchanged. This React/Vite reader is published alongside it at **https://aniketqw.github.io/agentic/v2/**.

## Build and publish

```sh
cd reader
npm ci
npm run build
cd ..
git add reader v2 .gitignore
git commit -m "Update course reader"
git push origin main
```

GitHub Pages continues publishing the root of `main`. The checked-in `v2/` directory is the production build; no Pages configuration change is needed. Avoid deploying a replacement root build or switching the Pages publishing branch.

For development, run `npm run extract` followed by `npm run dev`. Vite uses the `/agentic/v2/` base path. After changing the original course, rerun the build to regenerate the reader's lesson files.

## Reader design

- `scripts/extract.py` preserves all 216 original sections, their teaching text, stable IDs, mathematical TeX, code, sources and disclosures.
- The homepage downloads a small manifest, rather than the whole course.
- Individual sections are fetched on navigation. Query-string lesson URLs support direct opening and refreshing on static GitHub Pages.
- Shared images and fonts are extracted from embedded data URLs and cached independently by the browser.
- Math assets are loaded only for lessons with formulas. Formulas near the viewport render in short batches; printing renders the current lesson completely.
- Full-text search downloads its separate index only on use and runs in a worker.
- Bookmarks, marked-read lessons and last lesson reuse `course-v3-progress`; theme reuses `theme`. Both versions share these settings when used in the same browser on the same origin.
- Copy/download code controls, lesson printing, source cross-links and previous/next navigation are available.

The source contains mathematical and research verification limits. These are preserved; this migration does not certify the course's factual claims or execute its Python examples. There is no whole-course print command in the new reader; use the original course for that.
