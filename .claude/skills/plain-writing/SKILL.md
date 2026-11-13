---
name: plain-writing
description: The writing rules for this repo. Use before writing or changing any text here, even one line. Text means the README, any .md file, docstrings, comments, error and CLI messages, test names, commits, PR descriptions and the AI prompt. Picks the shape, applies the rules, then checks the text with the clarity skill.
---

# Plain writing

Readers scan. They read the headings, the first words of each line, and the tables. Write for that reader.

Follow the 6 steps in order.

## 1. Know the reader

| Ask | Answer for this repo |
|---|---|
| Who reads it? | **README and .md:** a busy reader who may not code. **Code text:** the next engineer. |
| What do they need first? | The result or the decision. Put it in the first line. |

## 2. Pick the shape

| If the text has... | Use |
|---|---|
| 2 or more ideas in one paragraph | One point per idea |
| Numbers for 2 or more things | A table |
| "when A, B or C" | A list of the conditions |
| Steps in order | A numbered list, one action per step |
| An outcome that depends on a condition | **Pass:** / **Fail:** labels, or an If / Then table |
| A process of 4 or more steps | A Mermaid diagram |
| Detail only an engineer needs | A `<details><summary>` block |
| One thing the reader must not miss | One `> [!NOTE]` or `> [!IMPORTANT]` callout, at most one per section |

A short paragraph is fine when it holds one idea.

## 3. Apply the rules

| Rule | How to test it |
|---|---|
| **Answer first** | The first line of each section gives the result or the decision. |
| **One idea per sentence** | No "and" or "which" joining two claims. |
| **Short sentences** | Aim for 15 to 20 words. Never more than 25. |
| **Key word first** | Each point and heading starts with the word a scanner looks for. Use a bold label, then a colon. |
| **Simple words** | "use", not "utilize". Explain a term once, in the same line, or cut it. |
| **One name per thing** | Pick one word and keep it. "Finished" everywhere, not also "completed". |
| **Say who acts** | "The checker skips finished work", not "Finished work is skipped". |
| **Numbers with context** | "20 of 133 (15.0%)". Write numbers in digits. |
| **Say it once** | Link to the section that explains it. Don't repeat it. |
| **No em-dashes** | Use a comma or a period. |
| **No list inside a list** | Use a table instead. |

## 4. Fit the kind of text

| Text | Rules |
|---|---|
| **README and .md** | All of step 3. Each heading says what its section answers. |
| **Code comment** | One line. Name the step, or say why, or what a value means. Don't restate the code. Match the comments around it. |
| **Constant comment** | The meaning and the unit: `# give up after 30 seconds`. |
| **Docstring** | One line: what the function returns or does. |
| **Error or CLI message** | What is wrong, where (file and line), and what to do next. |
| **Test name** | The behavior as a phrase: `test_only_unfinished_work_is_checked`. |
| **Commit message** | One line, under 72 characters, in the `type: what changed` form that `git log` uses. |
| **AI prompt** (`backend/xer_checker/summary/prompt.md`) | All of step 3. It changes what Gemini writes, so run the tests after. |

## 5. Check it

**Markdown, or any text of 2 or more sentences:**

1. Run the `clarity` skill in rewrite mode on the new or changed text only. Tell it: register "guide" or "reference", and this file holds the house rules.
2. Run the sentence-length check (it lists every sentence over 25 words):
   ```
   python3 .claude/skills/plain-writing/long_sentences.py FILE.md
   ```
3. Run the clarity lint:
   ```
   python3 ~/.claude/skills/clarity/scripts/strip_markdown.py FILE.md | python3 ~/.claude/skills/clarity/scripts/prose_stats.py -
   ```
   Read each hit in its place. A hit is a place to look, not a failure.

**One line** (a comment, a commit message, an error message, a test name): check it against step 3 only.

**No clarity skill on this machine?** Skip it. Steps 3, 4 and 6 still apply.

## 6. Before you finish

- **Facts:** no number, link, condition or claim changed meaning.
- **Numbers:** every count in the README matches `backend/tests/test_baseline.py`.
- **Length:** the sentence-length check prints nothing.
- **Scan test:** read only the headings and the first word of each line. The reader still gets the point.
- **Review:** for the README, show the change to the user before the next one.
