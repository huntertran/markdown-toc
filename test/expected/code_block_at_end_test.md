<!-- TOC -->

- [1. section 1](#1-section-1)
- [2. section 2](#2-section-2)

<!-- /TOC -->
# 1. section 1
<a id="markdown-section-1" name="section-1"></a>

This file deliberately contains no TOC start/stop comment markers. Without a
stop marker, running Update Markdown TOC makes scanForTocRange() walk every
line to the end of the document, which is what issue #56 needs. A file that
already has a closing marker breaks out of that loop early and never reaches
the fence below. Do not add TOC markers to this file, and do not spell them
out in the prose either: the scanner matches them anywhere on a line.

~~~
# this tilde fence is NOT a section
~~~

# 2. section 2
<a id="markdown-section-2" name="section-2"></a>

Regression fixture for issue #56. The closing fence below is the very last
line of this file and the file has NO trailing newline. In that shape
getNextLineIndexIsNotInCode() ran past the end of the document and
scanForTocRange() fed the result straight into doc.lineAt(), which threw
"Illegal value for `line`" and aborted the Update Markdown TOC command.

Keep this file exactly as it is: adding a trailing newline exposes a final
empty line, which keeps the index in range and stops reproducing the bug.

```
# 3. ls codeblock --this is NOT a section
```