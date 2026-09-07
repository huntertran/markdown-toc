<!-- TOC insertAnchor:true orderedList:true -->

<!-- /TOC -->

# Section H1

The TOC row for this heading is numbered, so its link points at "#1-section-h1".
The anchor used to be built from the title alone ("section-h1"), which made
every row of an ordered TOC a dead link (#10).

## Alpha, Beta

Punctuation is the other half of it (#33). The TOC link comes from GitHub's slug
rules, which drop the comma. The anchor used to run encodeURIComponent over the
title instead, which escaped it to "%2C" and produced a target nothing linked to.

## Gamma & Delta

An ampersand is dropped by the slug rules and escaped to "%26" by the old anchor.

## What's New?

Apostrophes and question marks disappear from the slug entirely.

## Trailing spaces and (parentheses)

The row keeps the parentheses (#69); only the slug drops them. Both halves
have to agree on that same slug.
