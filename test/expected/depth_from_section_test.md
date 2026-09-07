<!-- TOC depthfrom:2 -->

- [1. Section](#1-section)
    - [1.1. Subsection](#11-subsection)
- [2. Another Section](#2-another-section)
    - [2.1. Another Subsection](#21-another-subsection)
- [3. Third Section](#3-third-section)

<!-- /TOC -->

# Title

depthFrom:2 keeps this header out of the TOC, so it must not be numbered
either. Numbering used to start at depth 1 regardless of depthFrom, which both
shifted every level below and wrote a number onto this line that the user never
asked for.

## 1. Section

The numbering root is depth 2, so this is level one of the numbering: "1.", not
"1.1.".

### 1.1. Subsection

## 2. Another Section

### 2.1. Another Subsection

# Second Title

Also above the numbering root, and also left alone. Numbering continues across
it rather than restarting.

## 3. Third Section
