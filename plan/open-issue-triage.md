# Open Issue Triage — 2026-09-07

Triage of all **22 open issues** on `huntertran/markdown-toc` against the code at
`68178c9` (v3.1.0). **Updated 2026-09-07 after the 3.1.1 release: 10 of those 22
are now closed, 12 are still open. §0 is the current status board; read it
first.**

> **Repo note.** This clone has two remotes: `origin` = `huntertran/markdown-toc`
> (active) and `upstream` = `alanwalk/markdown-toc` (archived, read-only, last
> pushed 2020, 49 stale open issues). With no default set, `gh` resolves to
> `upstream` and silently triages the wrong repository. `gh repo set-default
> huntertran/markdown-toc` has been run in this clone; anyone cloning fresh
> needs to run it too.

**Method.** Every row marked *verified* was reproduced by running a throwaway
fixture through the headless harness (`npm run compile-tests && node
./out/test/manual/runManualTests.js`), which drives the real extension code
against the stubbed vscode API. Rows marked *source read* were determined by
reading the code only.

**Commits reviewed**

| Commit | Summary |
|---|---|
| `c623a83` | clamp line index after a closing code fence |
| `a687d4b` | auto-renumber headers on TOC update (3.1.0) |
| `68178c9` | structural updates, rebuilt `dist/` |
| `4761971` | stop TOC updates from rewriting the document (#38, #16, #18, #50) |
| `4257d02` | honour `updateOnSave`, stop per-document options leaking (#53) |
| `a0e57b1` | derive anchors from the TOC row that links to them (#10, #33) |
| `9a42262` | keep title punctuation, honour the editor indentation (#69, #67, #55) |
| `1b8af6f` | release 3.1.1 |

---

## 0. Status board — updated 2026-09-07, after 3.1.1

3.1.1 shipped. **10 of the 22 issues triaged here are now closed; 12 remain
open.** Open bugs first, then the open enhancements, then what was closed and
what guards it. The sections below this one are the original triage and are
left as written, except where a later run corrected them.

### 0.1 Open bugs

| # | Title | Where the triage stands | Next step |
|---|---|---|---|
| ~~**#41**~~ | Adding a TOC ignore above the TOC removes unique settings | **Fixed in 3.1.2.** Root cause: `ConfigManager.loadCustomOptions` stopped at the first line matching `REGEXP_TOC_START`, and `<!-- TOC ignore:true -->` matches it too. That line carries no options, so `optionsFlag` stayed empty and the real start marker below it was never read. `loadCustomOptions` now skips ignore markers, as `TocManager.scanForTocRange` already did. Guarded by `test/ignore_marker_above_toc_test.md` and two behaviour tests. | Ask the reporter to confirm on 3.1.2, then close. |
| **#7** | Not works with setext style headers | Verified broken (§4). `Header 1` over `====` is invisible on the symbol-provider path. | Fix — needs a text-scan fallback. Filed under `enhancement`. |
| **#72** | `TOC ignore:true` for first header removes that header | Believed fixed by the 3.1.0 commits (§2, high confidence). Guarded by `test/ignore_marker_test.md` and `test/ignore_first_line_test.md`. Never confirmed by the reporter. | Ask the reporter to confirm on 3.1.1, then close. |
| **#58** | `TOC ignore:true` | Same two fixes and same tests as #72 (§2, high confidence). | Ask the reporter to confirm on 3.1.1, then close. |
| **#59** | Section numbers not added | Believed fixed by the 3.1.0 commits (§2, high confidence). Guarded by `test/section_number_test.md`. | Ask the reporter to confirm on 3.1.1, then close. |
| **#68** | Extension does nothing | Two candidate causes both addressed in 3.1.0 (§2), medium confidence — the reporter's sample has no TOC markers, which is the crash-prone shape. | Ask the reporter to confirm on 3.1.1. Not the same issue as #56; see §6. |
| **#49** | EOL / `autoauto` still not fixed? | Fixed in an earlier release: `src/ConfigManager.ts` guards `files.eol === 'auto'` and falls back to `os.EOL` (§3). Source read only, not reproduced. | Ask the reporter to confirm, then close. |
| **#52** | "Insert section" will not work if there is no line between two quoted codes | Fixed in an earlier release; the reporter's exact input was re-run and yields all three headings (§3). Labelled `bug`. | Close with the verification note. |
| **#64** | Unicode characters break anchors | Partially fixed (§3). `# 🟠Landingpage 🖥️` yields `#landingpage-`, and `unicodeAnchors:true` offers literal-Unicode anchors as an opt-in; the default path still drops non-ASCII. | Confirm against GitHub's current slug rules, then decide. |

### 0.2 Open enhancements

| # | Title | Note |
|---|---|---|
| **#57** | Default ToC header/title | Small, self-contained, popular pattern. Good first contribution. |
| **#32** | Allow stable links | Marks user-defined anchors via `class` and preserves them. Depended on the #10/#33 anchor rework, which has now landed, so it is unblocked. |
| **#13** | Customize start number | Narrow use case (numbering continued across files). Recommend declining. |

### 0.3 Closed

All ten closed by the four fix commits on `master` after 3.1.0 and shipped in
**3.1.1**. Each carries a comment on the issue naming its root cause, commit,
test and version.

| # | Title | Commit | Guarded by |
|---|---|---|---|
| #38 | CHANGELOG Versioning not supported | `4761971` | `test/changelog_version_test.md` |
| #16 | TOC eat digit | `4761971` | `test/changelog_version_test.md` |
| #18 | `depthFrom` ignored for section numbering | `4761971` | `test/depth_from_section_test.md` |
| #50 | It deletes stuff above the ToC! | `4761971` | `test/toc_comment_marker_test.md` |
| #53 | Can we disable auto update TOC | `4257d02` | `src/test/manual/runBehaviorTests.ts` |
| #10 | `orderedList=true`: link prefix in the TOC, not in the header refs | `a0e57b1` | `test/anchor_slug_test.md` + anchor behaviour tests |
| #33 | Extension not slugifying anchors properly | `a0e57b1` | `test/anchor_slug_test.md` + anchor behaviour tests |
| #69 | Removes parentheses from section title | `9a42262` | `test/title_markup_test.md` |
| #67 | Ignore image alt text in title | `9a42262` | `test/title_markup_test.md` |
| #55 | Configured indent settings not respected | `9a42262` | `test/indent_test.md` + indentation behaviour tests |

Closed earlier, outside this triage: #56 (`Illegal value for 'line'`, fixed by
`c623a83`, see §6), #51, #71, #73.

---

## 1. Ship-blocker: 3.1.0 turned three display bugs into data loss — FIXED

> **Status: all three fixed and covered by regression fixtures.** See §1.4 for
> the changes and the tests. The rest of this section documents the failures as
> they were, because the fixtures assert against exactly these shapes.

`detectAndAutoSetSection` flipped from `false` to `true`, and header renumbering
now runs on **every** Insert/Update. Three long-standing bugs that used to only
produce a wrong TOC began to **rewrite the user's document**.

### 1.1 #38 / #16 — leading digits in a header are destroyed

`REGEXP_HEADER_META` is `/^(\#*)\s*((\d*\.?)*)\s*(.+)/`. Group 2 greedily
consumes any leading digit-and-dot run as a "section number", so for `# 1.1.1`
it captures `1.1.` and leaves `dirtyTitle` as `1`.

Input:

```markdown
# 1.1.1

- Change b

# 0.1.1

- Change a
```

Output after one Insert/Update (**verified**):

```markdown
<!-- TOC -->

- [1. 1](#1-1)
- [2. 1](#2-1)

<!-- /TOC -->
# 1. 1

- Change b

# 2. 1
```

Before 3.1.0 this produced a wrong TOC. Now it **overwrites the release numbers
in the file**. Any CHANGELOG opened with `updateOnSave` on loses its version
headings on the next save.

**Priority: highest.** Consider reverting the `detectAndAutoSetSection` default
to `false` until `REGEXP_HEADER_META` is fixed.

### 1.2 #18 — numbering ignores `depthFrom` and invents numbers

Input, with `<!-- TOC depthFrom:2 -->`:

```markdown
# Title

## 1. Section

### 1.1. Subsection
```

Output (**verified**):

```markdown
# 1. Title

## 1.1. Section

### 1.1.1. Subsection
```

Two defects. Numbering starts at depth 1 regardless of `depthFrom`, so every
level is shifted, and `# Title` **gains a number the user never wrote** despite
`depthFrom:2` excluding it from the TOC entirely.

### 1.3 #50 — a comment mentioning "toc" swallows the document above the TOC

`REGEXP_TOC_START` is `/\s*<!--(.*)[^\/]TOC(.*)-->/gi`, which matches `TOC`
anywhere in any HTML comment — including an attribution comment that merely
names the tool.

Input:

```markdown
## Table of Contents
<details>
<summary><b>(click to expand)</b></summary>
<!-- Generated by auto-markdown-toc -->

<!-- TOC -->

<!-- /TOC -->

</details>
```

Output (**verified**): the `<!-- Generated by auto-markdown-toc -->` line is
gone. The scanner treated it as the TOC start marker and replaced everything
from it to `<!-- /TOC -->`.

### 1.4 The fixes

| Was | Change |
|---|---|
| §1.1 #38, #16 | `REGEXP_HEADER_META` is now `/^(#*)\s*(?:((?:\d+\.)+\d*\|\d+\.)\s+)?(.+)$/`. A section number must be **separated from the title by whitespace**, so `# 1.1.1` has no number and is entirely a title. The number group is optional, which shifts the title to group 3; `Header.convertFromSymbol` was updated and now defaults an absent group to `""`, so `isOrderedListDetected` stays false for such documents and renumbering never runs on them. |
| §1.2 #18 | `HeaderManager.getNumberingRootDepth()` returns `max(1, depthFrom)`. `calculateHeaderOrder` returns `[]` for any header above that depth, and computes order arrays relative to it via `createFirstOrderArray`. Headers that carry no order are filtered out before the previous-sibling / parent search, so numbering continues across them instead of restarting. `Header.tocWithOrder` returns the plain title when `orderArray` is empty, which is what stops an unnumbered header being rewritten as `# . Title`. |
| §1.3 #50 | `REGEXP_TOC_START` and `REGEXP_TOC_STOP` are anchored: `/^\s*<!--\s*TOC\b(.*?)-->/i` and `/^\s*<!--\s*\/TOC\b(.*?)-->/i`. The marker must begin with `TOC`, and `\b` keeps `<!-- TOCX -->` from matching. The `g` flag was dropped — these are used as predicates, where a stateful `lastIndex` is a hazard and buys nothing. |

Side effects worth knowing about:

- `createFirstOrderArray` seeds every level with `1`. The old `new Array(depth)`
  left holes, which `join('.')` rendered as `..1` when the first header in a
  document sat below depth 1.
- Anchoring the marker regexes also means an inline `<!-- /TOC -->` inside a
  sentence is no longer mistaken for the stop marker.

### 1.5 Tests

| Fixture | Asserts |
|---|---|
| `test/changelog_version_test.md` | `# 1.1.1`, `# 0.1.1`, `# 12 Monkeys` and `# 2020.1` survive Insert/Update unmodified and appear in the TOC with their full text. |
| `test/depth_from_section_test.md` | With `depthFrom:2`, the `#` headers keep their text and stay out of the TOC, `##` headers number from `1.`, `###` from `1.1.`, and numbering continues across an intervening unnumbered `#`. |
| `test/toc_comment_marker_test.md` | `<!-- Generated with auto-markdown-toc -->`, `<!-- TOCX is not a marker either -->` and the `<details>` wrapper all survive; only the real TOC block is replaced. |

Unit-level assertions live in `src/test/runTest.ts` alongside the existing
anchor, code-fence and ignore-marker checks: `REGEXP_HEADER_META` is pinned
against numbered headers, version headings, bare digits and a numbered section
whose title starts with a digit; `REGEXP_TOC_START` / `REGEXP_TOC_STOP` are
pinned against real markers, attribution comments, `TOCX`, inline occurrences,
and the absence of the `g` flag (a shared predicate regex with a sticky
`lastIndex` answers differently on every other call).

Both layers were verified to fail without the fix, via `git stash push` limited
to the three source files: the three new fixtures and the new unit assertions go
red against the pre-fix code, and everything that passed before still passes.

Full `npm test` — `pretest` (tsc, webpack, eslint) then `runTest.js` then the
fixture runner — exits 0: **15 fixtures, 0 problems**, five unit groups passing.

> Two build notes. `dist/extension.js` is committed in this repo and is **not**
> rebuilt by these source changes; run `npm run package` before publishing.
> Beware that `npm test` triggers `pretest`, which runs `npm run compile`
> (webpack in development mode) and overwrites `dist/` with a non-production
> build. `dist/` was restored to its committed state after testing.

---

## 2. Fixed by the 3.1.0 commits — all four still open (see §0.1)

| # | Title | Fix | Confidence |
|---|---|---|---|
| **#72** | `TOC ignore:true` for first header removes that header | Two bugs, both fixed: `REGEXP_IGNORE_TITLE` only matched the original typo `ingore:true` (`src/models/RegexStrings.ts:12`), and `getIsHeaderIgnored` guarded on `previousLine > 0` so a marker on line 0 never applied (`src/HeaderManager.ts:85`). **Verified**: the header survives and is excluded from the TOC. | High |
| **#58** | `TOC ignore:true` works for `##` but not `#` | Same two fixes. **Verified** with a `#` heading on line 1. | High |
| **#59** | "Auto Markdown Sections: Insert/Update" does nothing | `updateHeadersWithSections` wrote `fullHeaderWithoutOrder` whenever `orderedList` was off (the default), i.e. the Insert command silently *removed* numbers. It now always writes `fullHeaderWithOrder`; removal has its own command. Covered by `test/section_number_test.md`. | High |
| **#68** | Extension does nothing on Insert/Update | Two candidate causes both addressed: the `Illegal value for 'line'` crash (`src/TocManager.ts:37`), and silent no-ops now surfacing a "no headers detected" warning. Reporter's sample has no TOC markers, which is the crash-prone shape. | Medium — ask reporter to confirm on 3.1.0 |

---

## 3. Already fixed in earlier releases — all three still open (see §0.1)

| # | Title | Why it is fixed | Verified |
|---|---|---|---|
| **#49** | EOL / `autoauto` still not fixed? | `src/ConfigManager.ts:30` guards `files.eol === 'auto'` and falls back to `os.EOL`. That was the exact root cause; reporter was on 3.0.12. | Source read |
| **#52** | "Insert section" fails with no blank line between two code fences | The reporter's exact input now yields all three headings including `## Test Subtitle 2`. | Yes |
| **#64** | Unicode characters break anchors | Partially. `# 🟠Landingpage 🖥️` yields `#landingpage-`, and the `unicodeAnchors:true` setting now offers literal-Unicode anchors as an opt-in. Worth confirming against GitHub's current slug rules before closing. | Yes, partial |

---

## 4. Confirmed still broken

| # | Title | Root cause | Effort |
|---|---|---|---|
| ~~**#38, #16**~~ **FIXED** | CHANGELOG versioning / TOC eats leading digits | See §1.1 and §1.4. Guarded by `test/changelog_version_test.md`. | Done |
| ~~**#18**~~ **FIXED** | `depthFrom` ignored for section numbering | See §1.2 and §1.4. Guarded by `test/depth_from_section_test.md`. | Done |
| ~~**#50**~~ **FIXED** | It deletes stuff above the ToC | See §1.3 and §1.4. Guarded by `test/toc_comment_marker_test.md`. | Done |
| ~~**#10**~~ **FIXED** | `orderedList=true`: TOC link has the number prefix, the anchor does not | See §4.1. Guarded by `test/anchor_slug_test.md` and the anchor tests in `runBehaviorTests.ts`. | Done |
| ~~**#33**~~ **FIXED** | Extension not slugifying anchors properly | See §4.1. Guarded by `test/anchor_slug_test.md` and the anchor tests in `runBehaviorTests.ts`. | Done |
| ~~**#69**~~ **FIXED** | Removes parentheses from section title | `Header.cleanUpTitle` stripped `(` and `)` unconditionally in its "special char" pass. See §4.2. Guarded by `test/title_markup_test.md` and `parenthesesStayInTheTocRow` / `parenthesesDoNotEmptyATitle`. | Done |
| ~~**#67**~~ **FIXED** | Ignore image alt text in title | `cleanUpTitle`'s link regex did not handle an image nested inside a link. See §4.2. Guarded by `test/title_markup_test.md` and `imageAltTextStaysOutOfTheTocRow`. | Done |
| ~~**#55**~~ **FIXED** | Configured indent settings not respected | The earlier reading of this row was wrong: `generateTocRow` does use `options.tab`, and the settings path worked. The real cause is that the *open editor's* indentation was never asked. See §4.3. Guarded by `test/indent_test.md` and six tests in `runBehaviorTests.ts`. | Done |
| **#7** | Not works with setext style headers | **Verified.** `Header 1` over `====` is invisible on the symbol-provider path. Needs a text-scan fallback. | Medium |
| ~~**#53**~~ **FIXED** | Can we disable auto update TOC | The `updateOnSave` setting was not honoured until some other command ran — **see §5.1**. Answer and close. | Done |

### 4.1 #10 and #33 — one fix, because they are one bug

Both are the anchor and the TOC link disagreeing, and there was only ever one
cause: two slug algorithms. The TOC link came from `anchor-markdown-header`
(GitHub's rules — punctuation dropped, section number included); the anchor came
from `Anchor`, which lowercased the *title*, dashed its spaces and ran
`encodeURIComponent` over the result. So `# Alpha, Beta` linked to `#alpha-beta`
and anchored `name="alpha%2C-beta"` (#33), and every row of an ordered TOC
linked to `#1-section-h1` while anchoring `name="section-h1"` (#10).

The anchor is now derived from the row's own href:

| Change | |
|---|---|
| `Anchor` | Its constructor takes the finished slug: `id = "markdown-" + slug`, `name = slug`. It no longer slugifies anything, so `encodeURIComponentPreservingUnicode` in `AnchorEncoder` lost its last caller and was removed. |
| `Header` | The eagerly built `anchor` field is gone. `anchorFor(tocString)` generates the row with `tocRowWithAnchor`, pulls the href back out with `REGEXP_ANCHOR` — which `insertAnchor` was already doing, only to throw the result away — and returns an `Anchor` for it, or `undefined` when the row carries no link. |
| `AutoMarkdownToc` | `insertAnchors` takes `useOrderedToc` and passes each header the same TOC string its row was built from, via the existing `getTocString`. `getTocInsertOptions` is now called once, before the edit, and shared by `createToc` and `insertAnchors` — that shared decision is what keeps the two halves in step. |

It follows from deriving one from the other that this holds for every path at
once: `orderedList`, numbering detected by `detectAndAutoSetSection`,
`unicodeAnchors` (the row keeps literal Unicode, so the anchor does too), and
any future change to the slug rules.

One consequence worth naming: in `anchorMode:bitbucket` the row's href is
`#markdown-header-...`, so the anchor `id` becomes `markdown-markdown-header-...`.
It reads oddly, but `id` is only ever matched by `REGEXP_MARKDOWN_ANCHOR` when
anchors are deleted, which still matches, and the `name` now agrees with the
link — which it never did in that mode before.

**Tests.** `test/anchor_slug_test.md` pins the whole shape: an ordered TOC over
titles carrying a comma, an ampersand, an apostrophe, a question mark and
parentheses, with `insertAnchor:true`. Four assertions in
`src/test/manual/runBehaviorTests.ts` state the invariant directly — the set of
`](#slug)` targets equals the set of `name="..."` anchors — over the ordered,
unordered, detected-numbering and `unicodeAnchors` paths. All four go red
against the old derivation, checked by restoring it in `anchorFor`.

`test/expected/section_anchor_test.md` has been regenerated. It was §5.3: the
broken link frozen into a snapshot. It now reads
`name="2-wrong-number-with-a-stale-anchor"`, matching its row.

### 4.2 #69 and #67 — one function, `Header.cleanUpTitle`

Both are the title-cleanup pass mangling the row text. `cleanUpTitle` ran three
substitutions, in this order: unwrap links, drop HTML comments, then strip
`` #*` ``, `(` and `)` as "special chars".

**#69** was the last of those. Parentheses are ordinary title text — nothing
about them needs removing, and `anchor-markdown-header` already drops them when
it builds the slug. So `### bar (info)` rendered as `bar info` while still
linking to `#bar-info`. Only the `(` / `)` alternatives were removed from that
pattern; the slug is unchanged, so links published against earlier versions
still resolve.

**#67** was the link rule, `/\[(.+)]\([^)]*\)/gi`. Against a badge — an image
wrapped in a link, `[![alt](image)](href)` — the greedy `.+` ran to the *last*
`](`, so the outer link was unwrapped into its own inner image, which then
survived into the row with its alt text and, after the paren strip, its URL. Two
changes:

| Change | Why |
|---|---|
| Images are removed first: `/!\[[^\]]*\]\([^)]*\)/g` → `""` | An image renders as a picture and contributes no heading text, so its alt text is not part of the title. Running before the link rule turns `[![alt](image)](href)` into `[](href)`. |
| The link rule is now `/\[([^\]]*)\]\([^)]*\)/g` | `[^\]]*` accepts the empty string, so the link the image rule just emptied disappears instead of surviving as a literal `[](href)`. It is also per-link rather than greedy across the line, which is what lets two links in one title each keep their own text. |

One addition that follows from the first: removing an image from the middle of a
title leaves the whitespace that surrounded it behind, so the result is passed
through `/\s+/g → " "` before the existing `trim()`.

`cleanUpTitle` is private and reached only from `tocRowWithAnchor`, so this
touches the TOC row and the anchor derived from it — never the header line in
the document, which keeps its badge.

**Tests.** `test/title_markup_test.md` pins the shape end to end: the issues'
own headings (`### bar (info)`, the Gitter badge), an image mid-title, two links
in one title, and backticks next to parentheses. Four tests in
`src/test/manual/runBehaviorTests.ts` state the invariants directly —
`parenthesesStayInTheTocRow`, `parenthesesDoNotEmptyATitle`,
`imageAltTextStaysOutOfTheTocRow`, `ordinaryLinksKeepTheirText`. The image test
asserts against the TOC block alone, via the new `tocBlock` helper, because the
heading it came from still contains the alt text and would otherwise satisfy a
whole-document assertion.

`test/expected/anchor_slug_test.md` was regenerated: its
`## Trailing spaces and (parentheses)` row now reads
`[1.4. Trailing spaces and (parentheses)](#14-trailing-spaces-and-parentheses)`.
The anchor and the href are unchanged — this was §4.1's fixture recording the
#69 behaviour as expected, the same way `section_anchor_test.md` recorded #10.
Its prose was corrected to match. No other snapshot moved.

### 4.3 #55 — the settings were read, the editor was not

**The row above had the wrong cause.** `generateTocRow` does use
`options.tab` (`src/AutoMarkdownToc.ts:349`), and `ConfigManager` did turn
`insertSpaces` + `tabSize` into it. Driving the harness with
`editor.tabSize: 2` produced a correctly indented TOC. So the settings path was
never the broken half.

The reporter says it exactly: *"the default indent size is taken into account,
and not the current indent size"*, with a screenshot of the status bar reading
**Spaces: 2** — and they are using the EditorConfig extension. Neither
EditorConfig nor `editor.detectIndentation` (which is **on by default**, and
infers the width from the file's own content) writes to the settings. Both set
the open editor's own `TextEditor.options`. That is what the status bar reports
and what a user means by their indent setting, and `ConfigManager` never looked
at it.

| Change | |
|---|---|
| `ConfigManager.loadIndentation()` | New. Resolves `tabSize` and `insertSpaces` from the first source that gives a usable answer: **the active editor's `options`**, then `"[markdown]": { "editor.*" }`, then `editor.*`, then a default. The two existing settings lookups are unchanged, only demoted. |
| `firstNumber` / `firstBoolean` | vscode types `TextEditorOptions.tabSize` as `number \| string` and `insertSpaces` as `boolean \| string` — `"auto"` is a legal value — and a scoped setting holds whatever the user typed. A candidate of the wrong type is skipped so the next source answers, rather than being coerced into a nonsense width. |
| `options.tab` | Now assigned on **both** branches. Only the spaces branch ever wrote to it, so once any spaces-indented document had been opened the value stuck for the rest of the session and a tab-indented document was still indented with spaces. Same shape as the `uniqueValue` leak in §5.2. |
| `Options` | `DEFAULT_TAB_SIZE = 4` / `DEFAULT_INSERT_SPACES = true` — vscode's own defaults, so the last-resort fallback matches what the editor itself would insert. `tabSize`/`insertSpaces` previously initialised to `2`/`false`, which was neither vscode's default nor ever reachable in practice. |

`src/test/manual/vscodeStub.ts` grew a `TextEditor.options`, empty by default,
so a test that does not set it falls back to `configuration` the way a real
editor falls back to the settings — which is why no existing fixture moved.

**Tests.** `test/indent_test.md` is a four-level document that pins the
settings-fallback path in a snapshot. Six tests in `runBehaviorTests.ts` cover
the rest, asserting on the indent string in front of each row:

| Test | Asserts | Red without the fix |
|---|---|---|
| `editorIndentationWinsOverTheSettings` | Editor says 2 spaces, settings say 4 → two spaces per level. **This is #55.** | Yes |
| `tabIndentationIsHonoured` | Editor says `insertSpaces:false` → one literal tab per level. | Yes |
| `indentationDoesNotStickAcrossDocuments` | One extension instance, a 2-space document then a tab document → the second is tabs. | Yes |
| `missingIndentationFallsBackToTheVscodeDefault` | Nothing set anywhere → four spaces. | Yes |
| `markdownScopedIndentationIsUsed` | `"[markdown]": { "editor.tabSize": 3 }` → three spaces. | No — pins the path that already worked |
| `unusableEditorIndentationFallsThrough` | Editor options of `"auto"` → the configured width. | No — same |

The last two pass against the pre-fix code on purpose, the way
`perDocumentOptionsSurviveRepeatedRuns` does: they guard the behaviour the fix
had to leave alone. Verified by `git stash push` limited to `ConfigManager.ts`
and `Options.ts`; the fixture suite is unchanged either way.

---

## 5. New defects found during this triage (not filed)

Not reported by anyone; found while reading the code.

1. ~~**`updateOnSave:false` is ignored until some other command runs.**~~
   **FIXED.** `AutoMarkdownToc.onDidSaveTextDocument` read `UPDATE_ON_SAVE.value`
   **before** `updateOptions()` had ever run. Until then `workspaceValue` was
   still the `Dictionary` constructor default (`true`), so the user's `false`
   was not honoured. **Root cause of #53.** The handler now calls
   `this.configManager.updateOptions()` once it knows it is looking at a
   markdown document, and reads the setting after that.

   Two related changes in the same handler: the save-loop guard moved above the
   setting check (it has to run whether or not the setting is on), and the
   handler is now `async` and awaits `updateMarkdownToc()` before setting
   `isProgrammaticallySave` and calling `doc.save()`. It used to fire the update
   and save concurrently, so the save could write the *old* text and the guard
   flag could be set after the save it was meant to guard. `extension.ts` awaits
   the handler to match.

2. ~~**Per-document options leak across documents.**~~ **FIXED.**
   `loadCustomOptions` reset `optionsFlag` but never cleared
   `Dictionary.uniqueValue`. A `<!-- TOC depthFrom:2 -->` read from document A
   kept applying to document B for the rest of the session, because
   `Dictionary.value` prefers `uniqueValue` whenever it is not `undefined`.
   `loadCustomOptions` now clears every
   `uniqueValue` before it scans, through the new `Options.allSettings` list.

### Tests for 5.1 and 5.2

These need two documents, or a save event, so they do not fit the
one-fixture-per-file shape of `runManualTests.ts`. They live in
`src/test/manual/runBehaviorTests.ts`, which drives the real extension code
against the same vscode stub, and runs as part of `npm test` (or on its own via
`npm run test:behavior`; an optional substring argument selects a subset).

| Test | Asserts |
|---|---|
| `updateOnSaveIsHonouredOnTheFirstSave` | With `updateOnSave:false` and no command having run first, a save leaves the document byte-identical and triggers no save of its own. |
| `updateOnSaveStillWorks` | With the setting on, the save writes the TOC, saves exactly once, and the extension's own save does not update again. |
| `documentLevelUpdateOnSaveWins` | `<!-- TOC updateOnSave:false -->` beats a workspace setting of `true`. |
| `perDocumentOptionsDoNotLeak` | One extension instance, document A with `depthFrom:2 bulletCharacter:*`, then document B with no options: B renders its depth 1 header, uses `-`, and carries none of A's options into its own start marker. |
| `perDocumentOptionsSurviveRepeatedRuns` | The reset does not go too far — a document that does set options still sees them on every run. |

Verified against the pre-fix code by reverting the four source files: four of
the five tests go red, and `perDocumentOptionsSurviveRepeatedRuns` passes both
ways, which is the point of it. Full `npm test` after the fix: five unit groups,
five behaviour tests, **15 fixtures, 0 problems**. `dist/` was restored to its
committed state afterwards.

3. ~~**A broken link is frozen into a committed snapshot.**~~ **FIXED** with
   #10 and #33; the snapshot was regenerated. It used to record

   ```markdown
   - [2. Wrong number, with a stale anchor](#2-wrong-number-with-a-stale-anchor)
   ...
   <a id="markdown-wrong-number%2C-with-a-stale-anchor" name="wrong-number%2C-with-a-stale-anchor"></a>
   ```

   which was #10 and #33 captured as expected behaviour.

4. **Unique option keys are lowercased on write.** `<!-- TOC insertAnchor:true -->`
   comes back as `<!-- TOC insertanchor:true -->` because
   `generateCustomOptionsInTocStart` emits `optionsFlag` entries, which were
   lowercased during parsing. Cosmetic, but it churns diffs on every update.

---

## 6. Test coverage of the 3.1.0 fixes

| Issue | Fixture | Status |
|---|---|---|
| #72, #58 | `test/ignore_marker_test.md`, `test/ignore_first_line_test.md` | Covered. Both spellings and the line-0 case. |
| #59 | `test/section_number_test.md` | Covered. |
| #68 (crash path) | `test/code_block_at_end_test.md` | Covered, and genuinely enforced — `vscodeStub.lineAt` throws on an out-of-range index (`src/test/manual/vscodeStub.ts:135`) and the runner turns that into a failure and a non-zero exit code. |
| anchors preserved when `insertAnchor:false` | `test/anchor_preserved_test.md` | **Added by this triage.** Both pre-existing anchor fixtures set `insertAnchor:true`, so the preserve-anchors branch had no guard at all — reverting the `if (INSERT_ANCHOR.value)` gate left the suite green. Verified the new fixture fails when that gate is reverted. |
| #69, #67 | `test/title_markup_test.md` | **Added by §4.2.** Parentheses, a linked badge, a mid-title image, two links in one title. |
| #55 | `test/indent_test.md` | **Added by §4.3.** Four nesting levels on the settings-fallback path; the editor-driven cases are behaviour tests. |

Suite currently: **18 fixtures, 0 problems**, five unit groups and **19
behaviour tests** passing.

### ~~Wrong issue number in the fixtures~~ — the note was wrong, nothing to correct

> This section previously claimed that `#56` belonged to the archived upstream
> repo and that the crash should be attributed to **#68**. **Both halves are
> false.** It is left here, corrected, because it was an action item in §8.

`huntertran/markdown-toc#56` exists and is exactly the right issue:
**"Cannot generate ToC, Illegal value for `line`"**, reported by J-Siu, now
**closed**, with the owner commenting *"Version 3.1.0 should fix this issue"*.
So every citation is already correct and none of them was touched:

| Cites `#56` | |
|---|---|
| `test/code_block_at_end_test.md` and its snapshot | Correct |
| `src/test/runTest.ts` (three comments), `src/test/manual/vscodeStub.ts:134` | Correct |
| `plan/manual-fixture-fix-plan.md:35` | Correct |
| `CHANGELOG.md:19`, linking `huntertran/markdown-toc/issues/56` | Correct |
| `c623a83` / PR #74, and `a687d4b` | Correct |

Where the confusion came from: the archived `alanwalk/markdown-toc` **also** has
a #56, an unrelated question about hyperlinks in headings, and `gh` resolves to
that remote by default in a fresh clone (see the repo note at the top). Reading
the upstream issue and assuming it was the one being cited is what produced the
claim.

**#68 is a different, still-open issue** ("Extension does nothing on
Insert/Update", §2). The `Illegal value for 'line'` crash is one of two
candidate causes for it, which is why the two are related — but #68 is not the
crash report and must not be swapped in for #56.

---

## 7. Enhancements — triage, do not fix now (see §0.2)

| # | Title | Note |
|---|---|---|
| #41 | TOC ignore above the TOC removes unique settings | **This row was wrong.** The `uniqueValue` reset did not resolve it: re-reproduced on 3.1.1, the settings on the start marker are still dropped when an ignore marker sits above the TOC. It is a bug, not an enhancement. See §0.1. |
| #57 | Default ToC header/title | Small, self-contained, popular pattern. Good first contribution. |
| #32 | Allow stable links | Proposes marking user-defined anchors via `class` and preserving them. Depended on the #10/#33 anchor rework, which landed in 3.1.1, so it is unblocked. |
| #13 | Customize start number | Narrow use case (numbering continued across files). Recommend declining. |

---

## 8. Recommended order of work

1. ~~**Fix #38 / #16**~~ — done (§1.4). The greedy section-number regex was the
   data-loss one; `detectAndAutoSetSection` can now stay `true` by default,
   because a document of bare version headings is no longer detected as numbered.
2. ~~**Fix #50**~~ — done (§1.4). An attribution comment can no longer eat the
   document.
3. ~~**Fix #18**~~ — done (§1.4). Numbering respects `depthFrom`.
4. ~~**Ship §5.1 and §5.2.**~~ — done. They resolve #53 and the cross-document
   options leak. They do **not** resolve #41, which this line guessed at and
   which is still open — see §0.1. Guarded by
   `src/test/manual/runBehaviorTests.ts`.
5. ~~**Fix #10 and #33 together**~~ — done (§4.1). One anchor-derivation change;
   `test/expected/section_anchor_test.md` regenerated.
6. ~~**Batch the title-cleanup bugs**: #69 (parentheses) and #67 (image alt
   text), both in `Header.cleanUpTitle`.~~ — done (§4.2). Guarded by
   `test/title_markup_test.md` and four tests in `runBehaviorTests.ts`.
7. ~~**Fix #55** — use the `tabSize` / `insertSpaces` options already being
   read.~~ — done (§4.3), though not for the reason this line assumed: the
   settings were already being used, the open editor's own indentation was not.
8. **Close §2 and §3** (seven issues: #72, #58, #59, #68, #49, #52, #64) with a
   note naming the version that fixed each. **Still outstanding** — all seven are
   open. Six want the reporter to confirm on 3.1.1 first; #52 was verified here
   and can be closed now. See §0.1.
9. ~~**Fix #41**~~ — done in 3.1.2. `loadCustomOptions` read the ignore marker
   as the options line and stopped there; it now skips ignore markers. See
   §0.1.
10. **Fix #7** — setext headers, the one item in §4 never picked up.
11. ~~**Correct the `#56` attribution** in the fixtures and CHANGELOG (§6).~~ —
   **withdrawn.** The attribution was already correct; the triage note was not.
   See §6. No fixture, comment or CHANGELOG line was changed.

Every fix should land with a fixture in `test/` plus a snapshot in
`test/expected/`, following the pattern `a687d4b` established.
