# Manual fixture harness: findings and fix plan

Status: all findings from the first pass are fixed. Updated 2026-09-06.
Scope: `test/*.md` manual fixtures, the headless harness under `src/test/manual/`, and the extension bugs the harness exposed.

## 1. The harness

`test/*.md` used to be manual fixtures: open in VS Code, press `Ctrl+M T`, eyeball the result. They now run headless.

| File | Purpose |
| --- | --- |
| `src/test/manual/vscodeStub.ts` | In-process stand-in for the `vscode` API the extension touches (`Position`, `Range`, `TextDocument`, `TextEditorEdit`, `window`, `workspace`, `commands`). `installVscodeStub()` hooks `Module._load` so `require('vscode')` resolves to it. |
| `src/test/manual/markdownSymbolProvider.ts` | Stands in for VS Code's built-in markdown `DocumentSymbolProvider`: ATX headers only, fenced code skipped, nested by level, symbol name keeps the leading `#` marks. |
| `src/test/manual/runManualTests.ts` | Runs every fixture, prints the headers the extension sees, the generated TOC, the diff against the file on disk, and compares run 1 against a snapshot. |
| `test/expected/*.md` | Snapshots of the current output, one per fixture. |

Commands:

```
npm test                          # unit asserts + manual fixtures
npm run test:manual               # fixtures only (needs a prior npm run compile-tests)
npm run test:manual -- --update   # rewrite test/expected/*.md
```

A fixture fails when Insert/Update throws, when repeated runs never converge (run 3 must equal run 2), or when the output stops matching its snapshot.

Current state: **11 fixtures, 0 failures**, and every fixture is now stable from run 1.

### Fixtures

| Fixture | Pins |
| --- | --- |
| `code_block_test.md` | Headers inside ``` fences are not sections. |
| `code_block_test_plantuml.md` | Same for plantuml fences and `@startmindmap` sentinels (issue #60). |
| `code_block_at_end_test.md` | Closing fence on the last line, no trailing newline, no TOC markers (issue #56). |
| `header_test.md` | CRLF document, depth filtering, ignore marker. |
| `level_test.md` | CRLF, depth 1-6 indentation, `depthfrom` in the start marker, unicode anchor. |
| `ignore_marker_test.md` | `ignore:true` and legacy `ingore:true` are both honoured. |
| `ignore_first_line_test.md` | Ignore marker on line 0, header on line 1. |
| `anchor_test.md` | `insertAnchor:true` refresh, including removal of a stale anchor. |
| `root_depth_test.md` | A stray deep root header does not drag the depth filter with it. |
| `section_number_test.md` | Wrong header numbers are corrected; numbered TOC rows. |
| `section_anchor_test.md` | Numbering and anchor insertion in the same command. |

### Harness fidelity caveats

- The real markdown symbol provider can be replaced by other extensions (Markdown All in One, markdownlint), which is what issue #60 was about. The stub models the built-in behaviour only, so `HeaderManager.getDocumentSymbols` kind-filtering is *not* covered by these fixtures.
- Setext (`===` underlined) headers are not modelled.
- The stub applies all edits of one `edit()` call against the original document, back to front, matching VS Code. Where an insert shares an offset with a delete, the delete is applied first.

## 2. Findings and what was done

### F1 — Section numbers never reached the TOC — FIXED

The section-numbering pass in `updateMarkdownToc` was commented out (`// TODO: need to go back to this`) because it needed `await headerManager.getHeaderList()` inside the synchronous `editor.edit()` callback. Fixtures shipped TOCs like `- [1. section 1](#1-section-1)` that the command could no longer reproduce.

Fixed: `updateMarkdownToc` renumbers headers in its own awaited edit, rebuilds the header list from the renumbered text, then writes the TOC and anchors in a second edit. Two edits rather than one keeps header replacements from sharing an edit with the TOC insert, which is what made the original attempt fragile.

Guarded by detection: numbering only runs when the document already numbers its headers (`detectAndAutoSetSection`, now defaulting to `true` to match `package.json`). Documents that do not number their headers are untouched.

Supporting fixes:

- `Header.detectedOrderString` records the order the header text carried. `isOrderedListDetected` was previously derived from `orderedListString`, which `HeaderManager` recomputes for every header and is therefore never empty — the flag was always true and meaningless.
- `ConfigManager` now runs `detectAndAutoSetSection` from a TOC start marker through `parseBool`; it was storing the raw string, so `detectandautosetsection:false` in a document was truthy.

Covered by `section_number_test.md` and `section_anchor_test.md`.

### F2 — `getMostPopularHeaderDepth` compared a count against a depth — FIXED

`if (value >= mostPopularHeaderDepth)` weighed an occurrence count against a depth number, and `mostPopularHeaderDepthCount` was assigned but never read. Counts are now compared against counts, with ties going to the shallower depth.

**Behaviour change to watch:** in a document whose root headers are mostly `#` but which opens with, say, a `######` header, that stray deep root used to be kept in the TOC by accident and is now filtered out — which is what the filter was written to do. Pinned by `root_depth_test.md`. If it turns out to bother users, the follow-up is to drop the heuristic rather than restore the broken comparison.

### F3 — The ignore marker only worked when misspelled — FIXED

`REGEXP_IGNORE_TITLE` matched `ingore:true` only, so the correctly spelled `<!-- TOC ignore:true -->` in `header_test.md` was not honoured. The pattern is now `/<!--\s*TOC\s+i(?:gn|ng)ore:true\s*-->/si`: **both spellings match**. The typo is not deprecated and must keep working — the extension has a large installed base and documents in the wild carry it.

Covered by asserts in `src/test/runTest.ts` (both spellings, mixed case, plus negatives: `<!-- TOC -->`, `ignore:false`, `innore:true`) and by `ignore_marker_test.md`.

### F4 — `getIsHeaderIgnored` off-by-one — FIXED

`if (previousLine > 0)` skipped line 0, so a marker on the first line never ignored the header on line 1. Now `>= 0`. Covered by `ignore_first_line_test.md`.

### F5 — TOC glued to the following line — FIXED

With no TOC markers the block is inserted at the cursor, and `createToc` never terminated its last line, producing `<!-- /TOC --># 1. section 1`. `getTocInsertOptions` now adds a line ending before or after the block when the cursor line has text on that side, and adds nothing when an existing TOC block is being replaced. Every fixture is stable from run 1 as a result.

### F6 — Anchors were deleted even when `insertAnchor` is off — FIXED (option A)

`deleteAnchors` ran whenever the TOC range spanned more than one line, while `insertAnchors` is gated on `INSERT_ANCHOR`. With the default (`insertAnchor: false`) an update stripped every `<a id="markdown-..." name="..."></a>` and never put it back, and `updateOnSave` persisted that.

Fixed with option A: `updateMarkdownToc` deletes anchors only when `INSERT_ANCHOR` is on, as the delete half of a delete-then-reinsert refresh. `deleteMarkdownToc` (**Auto Markdown TOC: Delete**) still clears anchors unconditionally, so the cleanup path is unchanged. The deletion regex only ever matched extension-generated tags at line start, so hand-written anchors were never at risk. Documented in README 3.4, covered by `anchor_test.md`.

### F7 — Fixtures shipped inside the VSIX — FIXED

`.vscodeignore` now excludes `test/**` and `plan/**`.

### F8 — "Sections: Insert/Update" deleted the numbers it was asked to write — FIXED

Found while wiring F1. `updateHeadersWithSections` chose between `fullHeaderWithOrder` and `fullHeaderWithoutOrder` based on `orderedList`, which defaults to `false` — so **Auto Markdown Sections: Insert/Update** stripped header numbers instead of writing them unless that unrelated option happened to be on. It now always writes numbers; removal has its own command, `deleteMarkdownSections`.

The TOC update passes `insertSpacing: false` so the numbering pass does not also insert blank lines above headers. That spacing is the Sections command's own behaviour and would reflow the document on every save.

### F9 — Anchor `name` and TOC link can disagree (open, not fixed)

Visible in `section_anchor_test.md`: the header "2. Wrong number, with a stale anchor" gets `<a name="wrong-number%2C-with-a-stale-anchor">` from `encodeURIComponent`, while the TOC row links to `#2-wrong-number-with-a-stale-anchor` from `anchor-markdown-header`. Two slug rules for the same header. It only matters for renderers that honour the explicit anchor; GitHub generates its own. Left alone deliberately — changing anchor ids would break existing deep links, the same reason F3 keeps the typo working.

## 3. Behaviour changes shipped

Worth calling out in release notes:

1. `detectAndAutoSetSection` defaults to `true` (it was `false` in code, `true` in `package.json`). Documents that already number their headers get renumbered on every TOC update.
2. Numbered documents get numbered TOC rows without setting `orderedList`.
3. **Sections: Insert/Update** writes numbers again (F8).
4. With `insertAnchor:false`, updates no longer delete anchors (F6).
5. A stray deep root header can now be filtered out of the TOC (F2).
6. Numbering makes the command two undo steps rather than one.

## 4. Follow-ups

- Merge the two edits into a single `WorkspaceEdit` applied with `workspace.applyEdit`, so undo is one step.
- Cover `HeaderManager.getDocumentSymbols` kind-filtering (issue #60) — needs the stub to emit the `Object`/`Method` kinds third-party providers return.
- Decide whether the most-popular-depth heuristic earns its keep at all (see F2).
- Consider reconciling anchor ids with the TOC slugs behind an opt-in setting (F9).
