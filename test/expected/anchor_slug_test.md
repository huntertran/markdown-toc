<!-- TOC insertanchor:true orderedlist:true -->

- [1. Section H1](#1-section-h1)
    - [1.1. Alpha, Beta](#11-alpha-beta)
    - [1.2. Gamma & Delta](#12-gamma--delta)
    - [1.3. What's New?](#13-whats-new)
    - [1.4. Trailing spaces and (parentheses)](#14-trailing-spaces-and-parentheses)

<!-- /TOC -->

# Section H1
<a id="markdown-1-section-h1" name="1-section-h1"></a>

The TOC row for this heading is numbered, so its link points at "#1-section-h1".
The anchor used to be built from the title alone ("section-h1"), which made
every row of an ordered TOC a dead link (#10).

## Alpha, Beta
<a id="markdown-11-alpha-beta" name="11-alpha-beta"></a>

Punctuation is the other half of it (#33). The TOC link comes from GitHub's slug
rules, which drop the comma. The anchor used to run encodeURIComponent over the
title instead, which escaped it to "%2C" and produced a target nothing linked to.

## Gamma & Delta
<a id="markdown-12-gamma--delta" name="12-gamma--delta"></a>

An ampersand is dropped by the slug rules and escaped to "%26" by the old anchor.

## What's New?
<a id="markdown-13-whats-new" name="13-whats-new"></a>

Apostrophes and question marks disappear from the slug entirely.

## Trailing spaces and (parentheses)
<a id="markdown-14-trailing-spaces-and-parentheses" name="14-trailing-spaces-and-parentheses"></a>

The row keeps the parentheses (#69); only the slug drops them. Both halves
have to agree on that same slug.
