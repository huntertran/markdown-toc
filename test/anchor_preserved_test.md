<!-- TOC -->

<!-- /TOC -->

# First heading
<a id="markdown-first-heading" name="first-heading"></a>

This fixture deliberately does NOT set insertAnchor, so the default (false)
applies. Update must not delete the anchors below: an update that will not
write anchors back must not remove the ones already in the document. Removing
them is the job of the "Auto Markdown TOC: Delete" command.

Do not add insertAnchor to the TOC marker above. anchor_test.md already covers
the insertAnchor:true path, where anchors are deleted and rewritten.

# Second heading
<a id="markdown-second-heading" name="second-heading"></a>

Body of the second section.

# Third heading

This heading has no anchor and must not gain one.
