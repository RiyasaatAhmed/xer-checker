# The AI summary

[Back to the README](../README.md)

How Gemini writes the words while code owns every number. Also its setup.

A few one-sentence points per file. **Code owns every number; the AI only chooses the words.**

**How it works:**

1. [`facts.py`](../backend/xer_checker/facts.py) computes named facts, like `"missing_links": "20"` or `"missing_links_vs_limit": "over DCMA's 5% limit"`. Code decides pass or flag, not the AI.
2. Gemini replies in a fixed JSON shape, up to 4 points. It writes placeholders instead of numbers: `{"about": "missing_links", "text": "{missing_links} activities ({missing_links_pct}) have no link before or after them"}`. Its instructions are in [`prompt.md`](../backend/xer_checker/summary/prompt.md).
3. [`rules.py`](../backend/xer_checker/summary/rules.py) checks each point against the rules below.
4. Code fills in the real values.

**A point is rejected when it:**

| Rule | What it stops |
|---|---|
| has a digit | a typed number, like "21" when the fact says 20 |
| spells a number or an amount (twenty, half, most, none ...) | a number in words, or "most" for 46.6% |
| has a % sign | `{missing_links}%`, which would turn a count of 20 into a made-up 20% |
| points at a fact that doesn't exist | an invented figure, like `{critical_path_days}` |
| doesn't point at any fact | a claim with nothing behind it, like "the schedule is healthy" |
| writes a fact's name without braces | "missing_links reached 25.0%" showing up in the summary |
| uses a fact from another check | the high-float count in a sentence about negative float |
| holds two sentences, a semicolon, or more than 25 words | a paragraph instead of one point with one idea |
| says "limit" or "threshold" itself | "exceed the float limit": over or within comes only from the facts |
| uses filler like "additionally", "overall", "notably" | text that sounds machine-written |

**The whole reply is rejected** if a check over its limit has no point. So the AI can't leave out a flag.

**When a reply fails:**

| What happens | What the checker does |
|---|---|
| A point breaks a rule | Asks once more, with the reasons |
| The second try fails too, or the call fails | Code writes the summary from the same facts, and the chart says so |
| Gemini answers "busy" (429 or 5xx) | Tries the call up to 3 times |

**Measured** on 30 real calls: every reply passed every rule on the first try. Each file got about 3 points, of 15 words each.

- **What Gemini sees:** only the facts. Never activity names or file text.
- **What the rules can't catch:** a wrong *word*. A person should still read a summary before it reaches a client.

**Setup (optional).** Without a key, code writes the summary. To use Gemini, copy the example settings at the repo root, then put your key from [Google AI Studio](https://aistudio.google.com/apikey) in `.env`:

```
cp .env.example .env
```

`.env` is gitignored. Docker Compose reads it too.

| Setting | What it does | In `.env.example` |
|---|---|---|
| `GEMINI_API_KEY` | Turns the AI on; empty turns it off | `<YOUR_API_KEY>` |
| `GEMINI_MODEL` | The model that writes the summaries; required with a key | `gemini-3.5-flash-lite` |
| `GEMINI_THINKING_LEVEL` | `minimal`, `low`, `medium` or `high`; empty for the model's default | `minimal` |

- **A small model is enough:** on the same request, `gemini-3.5-flash-lite` took 1.8 seconds and `gemini-3.8-flash` took 113.
- **A bad setting never stops the checker.** Code writes the summary and names the setting to fix.
