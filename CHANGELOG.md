# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [3.1.2] - 2026-09-07
### Fixed:
- [#72](https://github.com/huntertran/markdown-toc/issues/72): an unclosed `<!-- TOC -->` earlier in the document - such as the `<!-- TOC -->` / `<!--\TOC-->` pair suggested as a workaround in [#40](https://github.com/huntertran/markdown-toc/issues/40) - was taken as the start of the TOC block, so Insert/Update replaced everything down to the real block's `<!-- /TOC -->` and deleted the headers in between. The last start marker before the stop marker now wins, and a stray `<!-- /TOC -->` above the block no longer ends the scan
- A header excluded by `<!-- TOC ignore:true -->` no longer sets the TOC's baseline indentation. Ignoring a document's only `h1` used to push every remaining `h2` one level to the right

## [3.1.1] - 2026-09-07
### Fixed:
- [#38](https://github.com/huntertran/markdown-toc/issues/38), [#16](https://github.com/huntertran/markdown-toc/issues/16): a header that is only a version number (`# 1.1.1`) was read as the section number `1.` plus the title `1`, so 3.1.0's renumbering rewrote it. A section number now has to be followed by whitespace, and such a document is no longer treated as numbered. A CHANGELOG survives a save again
- [#18](https://github.com/huntertran/markdown-toc/issues/18): headers above `depthFrom` were given numbers the user never wrote, and numbering restarted after them. Numbering now starts at `depthFrom` and continues across those headers
- [#50](https://github.com/huntertran/markdown-toc/issues/50): an HTML comment that merely mentioned the tool registered as the TOC start marker, so everything down to `<!-- /TOC -->` was replaced on the next update. The markers must now begin the line and start with `TOC`
- [#53](https://github.com/huntertran/markdown-toc/issues/53): `updateOnSave:false` was ignored until some unrelated command happened to load the settings, because the save handler read the setting before the configuration
- The save handler awaits the TOC update before saving. It used to start both at once, so the save could write the pre-update text and the loop guard could be set after the save it was meant to guard
- [#41](https://github.com/huntertran/markdown-toc/issues/41): options set in one document's `<!-- TOC ... -->` marker kept applying to every other document for the rest of the session
- [#10](https://github.com/huntertran/markdown-toc/issues/10), [#33](https://github.com/huntertran/markdown-toc/issues/33): a TOC row and the anchor it targets were produced by two different slug algorithms, so they agreed only for an unnumbered, punctuation-free heading. The anchor is now derived from the row that links to it, which keeps the two in step on the ordered, detected-numbering and `unicodeAnchors` paths as well
- [#69](https://github.com/huntertran/markdown-toc/issues/69), [#67](https://github.com/huntertran/markdown-toc/issues/67): parentheses were stripped from titles (`### bar (info)` became `bar info`); an inline image's alt text was pulled into the TOC row instead of being dropped; and a title carrying two links kept only one of them
- [#55](https://github.com/huntertran/markdown-toc/issues/55): the open editor's own indentation — where `editor.detectIndentation` and EditorConfig put their answer — was never consulted, and a tab-indented document was still indented with spaces once a spaces-indented one had been opened in the same session. Indentation is now resolved from the active editor, then `[markdown]`-scoped settings, then `editor.*`

## [3.1.0] - 2026-09-06
### New:
- Header numbering is applied again on Insert/Update TOC: a document that already numbers its headers (`# 1. Section`) has those numbers corrected on every update, and its TOC rows are numbered to match, without needing `orderedList`. Controlled by `detectAndAutoSetSection`; documents that do not number their headers are left untouched

### Changed:
- `detectAndAutoSetSection` now defaults to `true`. The setting was declared as `true` in the extension manifest but read as `false` in code, so it never took effect
- With `insertAnchor:false` (the default), Insert/Update TOC no longer deletes the anchors a document already contains. Anchors are only rewritten when the extension is also inserting them; use **Auto Markdown TOC: Delete** to remove a TOC and its anchors
- A TOC inserted at the cursor is now separated from the text on that line instead of running into it
- Renumbering makes Insert/Update TOC two undo steps on documents with numbered headers
- The `test/` fixtures and `plan/` notes are no longer packaged into the published extension

### Fixed:
- [#56](https://github.com/huntertran/markdown-toc/issues/56): `Illegal value for 'line'` aborted Insert/Update TOC when the document ended with a closing code fence
- `<!-- TOC ignore:true -->` had no effect: only the original misspelling `ingore:true` was recognised. Both spellings now work, so documents written against either release keep working
- An ignore marker on the very first line of a document was never applied to the header below it
- **Auto Markdown Sections: Insert/Update** removed header numbers instead of writing them whenever `orderedList` was off, which is the default
- `detectAndAutoSetSection` set inside a `<!-- TOC ... -->` marker was read as text, so `detectandautosetsection:false` behaved as `true`
- The header depth filter compared an occurrence count against a header depth, so which headers reached the TOC in documents with mixed top-level depths was effectively arbitrary

### Development:
- The manual fixtures in `test/*.md` now run headless: `npm test` drives the real extension code against every fixture through a stubbed `vscode` API and compares the result with the snapshots in `test/expected/`. `npm run test:manual -- --update` refreshes them

## [3.0.17] - 2026-05-18
### Fixed:
- Insert/Update TOC command no longer deletes the existing TOC when no headers are detected — previously an unhandled throw inside an `async` edit callback caused the queued delete to commit without a replacement
- `TypeError: emojiRegex is not a function` at activation/usage caused by webpack picking the ESM `emoji-regex@10` build under `target: 'node'`; webpack now resolves the CommonJS `main` field
- Broadened header `SymbolKind` filter (added `Field`, `Key`, `Module`, `Method`) with a fallback to raw symbols so third-party markdown symbol providers no longer produce empty TOCs

## [3.0.16] - 2026-05-04
### New:
- Add `unicodeAnchors` option: use literal Unicode characters in generated anchor links instead of URL-encoding non-ASCII characters

### Changed:
- Upgraded dependencies: TypeScript 5.x, ESLint 8.57, @typescript-eslint 8.x, @types/node 22.x, mocha 11.x, and others
- Upgraded `anchor-markdown-header` to 0.8.4 — `%` signs in heading text are now stripped from anchor URLs, matching GitHub's actual behavior

## [3.0.15] - 2025-09-13
### Fixed:
- VSCode Overlapping range error
- Cannot delete TOC when there is `<!-- TOC ignore:true -->` in text
- TOC created in wrong location when there is `<!-- TOC ignore:true -->` in text
- Remove svg references in README.md to conform with visual studio marketplace preprocessing

## [3.0.13] - 2023-08-18
### Fixed:
- [#60](https://github.com/huntertran/markdown-toc/issues/60): Only process string symbols for markdown headers
- Also change svg origins in README.md from https://vsmarketplacebadge.apphb.com to https://vsmarketplacebadges.dev to keep vsce happy

## [3.0.12] - 2020-09-13
### Fixed:
- [#40](https://github.com/huntertran/markdown-toc/issues/35): check if a header is ignored or not

## [3.0.11] - 2020-07-09
### Fixed:
- [#35](https://github.com/huntertran/markdown-toc/issues/35): implement a new algorithm to ignore title of Github markdown style

## [3.0.10] - 2020-07-01
### Fixed:
- #8: reserve underscore

## [3.0.9] - 2020-06-24
### New
- use VSCode API to get header list
- improve performance

## [3.0.8] - 2020-06-14
### Fixed:
- #33: whitespace will be replaced with "-" in anchors
- #30: remove extra line in bitbucket style
- Re-package to target linux inconsistency on file naming case.

## [3.0.5] - 2020-03-20
### Fixed:
- #21: now option can contains special characters
- Potential fix for #26, #25, #14: working on linux.

## [3.0.4] - 2020-02-17
### Fixed:
- #20: orderedlist option not working as expected when disable

## [3.0.3] - 2019-12-03
### Fixed:
- Set default detecting and auto insert section number to FALSE

## [2.2.2] - 2019-08-22
### Fixed:
- Ignore 'header' in code block

## [2.2.1] - 2019-08-21
### Fixed:
- Custom options for each document is now working as expected.

## [2.2.0] - 2019-08-19
### Added:
- When anchor mode is bitbucket, the anchor will be rendered above the header.

## [2.1.4] - 2019-08-18
### Fixed:
- Error when markdown document is not ending with a newline.

## [2.1.3] - 2019-08-17
### Added:
- Conditions for key bindings.

## [2.1.2] - 2019-08-17
### Fixed:
- Ordered number is wrong.
- Some typo in readme and changelog.

## [2.1.1] - 2019-07-23
### Fixed:
- Header with anchor now rendered with colors as default of vscode

## [2.1.0] - 2019-07-23
### Changed
- Source code break down to functions and classess for easy maintainance and extension.

### Added
- Custom bullet character for TOC using markdown-toc.bulletCharacter setting.

## [2.0.0] - 2019-07-19
### Fixed:
- All TSLINT errors now fixed and (hopfully) working as original code.

## [1.6.1] - 2019-07-19
### Fixed:
- EOL (End of line) now respect the auto setting by [roborourke](https://github.com/roborourke/markdown-toc.git)

## [1.6.0] - 2017-07-25
### Added
- A way to ignore certain headings.

### Fixed
- Fixed anchors may have invalid chars that break the links.

## [1.5.6] - 2017-07-25
### Fixed
- Fixed wrong section number.
- Fixed depthTo option is not recognized.

## [1.5.5] - 2017-05-23
### Fixed
- Fixed code block using tildes is not in code (kentakei's code).

## [1.5.4] - 2017-05-18
### Fixed
- Fixed section header numbering not resetting (CapitalistHippie's code).

## [1.5.3] - 2017-05-18
### Changed
- This is a error commit.

## [1.5.2] - 2017-05-10
### Changed
- Using `tabSize` and `insertSpaces` from `[markdown]` configuration (junian's code).
- Only display right click menus when editing markdown files (junian's code).

## [1.5.1] - 2017-03-25
### Fixed
- Inserted anchor is correct.

## [1.5.0] - 2017-02-21
### Added
- Insert / Delete header number sections.
- Keyboard shortcuts.
- Editor context menus.

### Fixed
- Can't remove all custom option.

### Removed
- Anchor mode is not support nodejs.

## [1.4.6] - 2017-01-17
### Fixed
- Identical headers will link to first occurrence in text.

## [1.4.5] - 2017-01-16
### Fixed
- OrderedList option should reset sub-order.

## [1.4.4] - 2017-01-16
### Changed
- Decode Unicode for anchor.

## [1.4.3] - 2016-11-11
### Changed
- Support header lines with trailing slashes (MarioSchwalbe's code).

## [1.4.2] - 2016-11-07
### Fixed
- Modify Dependencies.

## [1.4.1] - 2016-11-07
### Fixed
- Modify Dependencies.

## [1.4.0] - 2016-11-07
### Added
- Add anchor mode, you can use anchor in other site.
### Changed
- Based on GitHub markdown anchor generation (chriscamicas's code).

## [1.3.0] - 2016-08-23
### Added
- Use Workspace Settings for Tabs and EOL (kevindaub's code).
### Changed
- Auto remove extra space when depthFrom is not startFrom.

## [1.2.3] - 2016-08-21
### Fixed
- Error when none attributes.

## [1.2.2] - 2016-07-18
### Changed
- Just update document.

## [1.2.1] - 2016-07-18
### Changed
- Remove attributes in<!-- TOC -->.
### Fixed
- DepthTo is not valid.

## [1.2.0] - 2016-07-18
### Added
- Load default config from vscode settings.

## [1.1.3] - 2016-06-14
### Fixed
- Codeblock error.

## [1.1.2] - 2016-05-23
### Fixed
- Recognized code to header list.
- Delete anchor failed sometime.

## [1.1.1] - 2016-05-23
### Changed
- Just update document.

## [1.1.0] - 2016-05-22
### Added
- Auto active extensions on markdown.
- Auto insert anchor for header.

### Fixed
- Update on save is valid on other language.

## [1.0.0] - 2016-05-01
### Added
- All basic function.
