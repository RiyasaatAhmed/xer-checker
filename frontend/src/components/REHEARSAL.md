# Rehearsal: HeroDemo

The Stageshow hand-over note for `HeroDemo.tsx`, the demo on the empty upload screen.

**Gold example copied:** `upload`. Kept its drag image, its upload row with a progress bar settling into a result, and its corner bleed. Changed the story's end: the 3 DCMA checks arrive with their figures and limits instead of a file size.

**What changed from the gold:**

| Change | Why |
|---|---|
| The file is carried in from past the left edge, already held | The gold's desktop column broke the one-gutter rule, and its own film shows that framing line. The motion rules prefer a file from outside to enter already held |
| Words on the left of each row, bars to the right | The window runs off the right edge: bars may bleed, words may not |
| The drop area stays at a fixed size; the file's row opens under it | A dashed edge that changes size makes its dashes crawl |
| CritPath's look: cream surfaces, navy ink, orange accent, square corners | The app's own tokens (`theme.css`), mapped to the kit's |
| A compact design with shorter rows | At 358 wide the window must stay wider than tall, with all 3 checks whole |

**The film:** `node scripts/film.mjs <page> --gate`, at the shown width and at 390. Both end `rehearsal passed`.

**Candidates left, judged:**

| Line | Judgement |
|---|---|
| `near-empty frames` around 8 s | Intended: it's the opening frame, the empty app waiting for the next file |
| `half-pixel glyph` in the badge | The badge's width comes from its text (121px). A fixed width made it lopsided, so it stays |
| `appears with no entrance` on a `Count` | The gold's film shows the same line; the row around it fades in with its `Collapse` |

**Not checked:** dark mode (the demo keeps its light look on purpose, as a product shot), and the fresh-eye review in `references/review.md`.
