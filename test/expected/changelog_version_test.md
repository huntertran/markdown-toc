<!-- TOC -->

- [1.1.1](#111)
- [0.1.1](#011)
- [12 Monkeys](#12-monkeys)
- [2020.1](#20201)

<!-- /TOC -->

# 1.1.1

A version heading, not a numbered section. There is no whitespace between the
digits and the end of the heading, so there is no title for a section number to
sit in front of and the whole thing is the title.

The previous REGEXP_HEADER_META split this into the section number "1." and the
title "1". With detectAndAutoSetSection defaulting to true the header was then
rewritten in place as "# 1. 1", destroying the version number.

# 0.1.1

- Change a

# 12 Monkeys

Leading digits with no dot are never a section number, so this title survives
whole.

# 2020.1

Calendar versioning: still a title, still untouched.
