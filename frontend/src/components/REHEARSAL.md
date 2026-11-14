# Rehearsal: HeroDemo

The Stageshow hand-over note for `HeroDemo.tsx`, the demo on the empty upload screen.

**Gold example copied:** `upload`. Kept its drag image, its upload row with a progress bar settling into a result, and its corner bleed. Changed the story's end: the 5 headline DCMA checks arrive with their figures and limits instead of a file size.

**What changed from the gold:**

| Change | Why |
|---|---|
| The file is carried in from past the left edge, already held | The gold's desktop column broke the one-gutter rule, and its own film shows that framing line. The motion rules prefer a file from outside to enter already held |
| Words on the left of each row, bars to the right | The window runs off the right edge: bars may bleed, words may not |
| The drop area stays at a fixed size; the file's row opens under it | A dashed edge that changes size makes its dashes crawl |
| The app's look: black and zinc, a near-white accent, the softened red, Inter | The app's own tokens (`theme.css`), mapped to the kit's in `hero-demo.css`. Restyled to match the app's dark look; only colors, the font and one label changed |
| Shorter rows, and a taller stage: 680 × 440 wide, 358 × 340 compact | All 5 checks stay whole above the bottom edge. Only the placeholder rows bleed. At 358 wide the window stays wider than tall |
| The drag image carries `data-crop` | It enters from past the left edge, so the edge cuts it on the way in. The script moves it, not a CSS animation, so the film can't tell it's in flight. Without `data-crop`, any frame sampled during its entry fails the gate |

**The film:** `node scripts/film.mjs <page> --gate`, at the shown width and at 390. Both end `rehearsal passed`.

**To film it:** the page shows the demo only when the upload list is empty. Point `npm run dev` at an API that answers `[]` (`API_URL=...`). Without one, the failed `/api/uploads` call makes the scan incomplete.

**Candidates left, judged:**

| Line | Judgement |
|---|---|
| `near-empty frames` around 8 s | Intended: it's the opening frame, the empty app waiting for the next file |
| `half-pixel glyph` in the badge | The badge's width comes from its text (119px). A fixed width made it lopsided, so it stays |
| `touching` between the figure and its `Count` | The `%` belongs to the number, as in "15.0%". A gap would split one value in two |
| `appears with no entrance` on a `Count` | The gold's film shows the same line; the row around it fades in with its `Collapse` |

**Not checked:** a light-theme version (the demo is dark only, like the app's default), and the fresh-eye review in `references/review.md`. After the change to 5 checks (15 Nov 2026), the gate ran twice at 1280 and twice at 390 wide. All 4 runs ended `rehearsal passed`.
