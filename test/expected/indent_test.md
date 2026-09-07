<!-- TOC -->

- [Top](#top)
    - [Middle](#middle)
        - [Leaf](#leaf)
            - [Deepest](#deepest)

<!-- /TOC -->

# Top

One nesting step per heading level, so the indentation of a TOC row is visible
on its own line rather than only in aggregate.

## Middle

### Leaf

#### Deepest

This fixture is run with no editor indentation set, which is the case where
ConfigManager falls back to the `editor.*` settings. The stub configures
`tabSize: 4`, `insertSpaces: true`, so every level is four spaces.

The source that wins when there *is* an editor to ask - the case in #55, where
`editor.detectIndentation` or the EditorConfig extension has set the open
editor's own options - needs a second document to be worth asserting, so it
lives in `src/test/manual/runBehaviorTests.ts` instead.
