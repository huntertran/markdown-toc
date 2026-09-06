Auto Markdown TOC
---

Generate TOC (table of contents) of headlines from parsed [markdown](https://en.wikipedia.org/wiki/Markdown) file.

<!-- TOC -->

- [1. Features](#1-features)
- [2. Installation](#2-installation)
- [3. Usage](#3-usage)
    - [3.1. Insert TOC](#31-insert-toc)
    - [3.2. Insert Header Number Sections](#32-insert-header-number-sections)
    - [3.3. Ignore Header](#33-ignore-header)
    - [3.4. Anchors](#34-anchors)
    - [3.5. Header Numbering](#35-header-numbering)
- [4. Configuration](#4-configuration)
    - [4.1. Default Settings](#41-default-settings)
    - [4.2. Unique Settings](#42-unique-settings)
- [5. Contributors](#5-contributors)
- [6. What's New?](#6-whats-new)
- [7. Authors](#7-authors)
- [8. License](#8-license)
- [9. Links](#9-links)

<!-- /TOC -->

# 1. Features
<a id="markdown-features" name="features"></a>
- Insert header number sections.
- Auto active plugin on markdown
- Insert anchor for header `<a id="markdown-header" name="header"></a>`
- Linking via anchor tags `# A 1` → `#a-1`
- Depth control[1-6] with `depthFrom:1` and `depthTo:6`
- Enable or disable links with `withLinks:true`
- Refresh list on save with `updateOnSave:true`
- Use ordered list (1. ..., 2. ...) with `orderedList:true`
- Anchor support for (github.com|nodejs.org|bitbucket.org|ghost.org|gitlab.com).

# 2. Installation
<a id="markdown-installation" name="installation"></a>

```
ext install auto-markdown-toc
```

# 3. Usage
<a id="markdown-usage" name="usage"></a>

## 3.1. Insert TOC
<a id="markdown-insert-toc" name="insert-toc"></a>

![Insert TOC](img/insert-toc.gif)

## 3.2. Insert Header Number Sections
<a id="markdown-insert-header-number-sections" name="insert-header-number-sections"></a>

**Tips:Section of header is begin with depthFrom**

![Insert Header Number Sections](img/insert-header-number-sections.gif)

## 3.3. Ignore Header
<a id="markdown-ignore-header" name="ignore-header"></a>
To ignore a header, you can add the line `<!-- TOC ignore:true -->` above the header to be ignored.

```
<!-- TOC ignore:true -->
# Header to be ignored

# Header that should not be ignored
```

## 3.4. Anchors
<a id="markdown-anchors" name="anchors"></a>

With `insertAnchor:true` every header gets an anchor tag written under it (above it in `bitbucket.org` mode), and each Insert/Update refreshes them: the anchors this extension generated are removed and written again, so anchors left over from renamed or deleted headers do not pile up.

With `insertAnchor:false` (the default) Insert/Update leaves existing anchors alone. Updating a table of contents never deletes markup it would not put back. To remove the anchors, run **Auto Markdown TOC: Delete**, which clears the TOC and its anchors together.

Only tags this extension generated are touched, that is lines matching `<a id="markdown-..." name="..."></a>`. Anchors you wrote yourself are never removed.

## 3.5. Header Numbering
<a id="markdown-header-numbering" name="header-numbering"></a>

**Auto Markdown Sections: Insert/Update** numbers every header (`# 1. First`, `## 1.1. Child`), and **Auto Markdown Sections: Delete** removes the numbers again.

A document that already numbers its headers keeps them correct on its own: with `detectAndAutoSetSection:true` (the default) every TOC update renumbers the headers and writes numbered TOC rows, so inserting or deleting a section does not leave the rest of the document stale. Documents that do not number their headers are left alone, and can still get numbered rows in the TOC only by setting `orderedList:true`.

# 4. Configuration
<a id="markdown-configuration" name="configuration"></a>

|attributes|values|defaults|
|---|---|---|
|depthFrom|uint(1-6)|1|
|depthTo|uint(1-6)|6|
|bulletCharacter|string|"-"|
|insertAnchor|bool|false|
|withLinks|bool|true|
|orderedList|bool|false|
|updateOnSave|bool|true|
|anchorMode|github.com/bitbucket.org/ghost.org/gitlab.com|github.com|
|unicodeAnchors|bool|false|
|detectAndAutoSetSection|bool|true|

By default, `vscode` use 4 spaces for tab. You can change that number specifically for markdown by adding this to your `settings.json`

```json
    "[markdown]": {
        "editor.tabSize": 2
    },
```

## 4.1. Default Settings
<a id="markdown-default-settings" name="default-settings"></a>

To change the default configuration settings for the `Auto Markdown TOC` extension, edit the user or workspace settings as described here. The available settings are as follows:

|attributes|values|defaults|
|---|---|---|
|markdown-toc.depthFrom|number|1|
|markdown-toc.depthTo|number|6|
|markdown-toc.bulletCharacter|string|"-"|
|markdown-toc.insertAnchor|bool|false|
|markdown-toc.withLinks|bool|true|
|markdown-toc.orderedList|bool|false|
|markdown-toc.updateOnSave|bool|true|
|markdown-toc.anchorMode|enum|github.com|
|markdown-toc.unicodeAnchors|bool|false|
|markdown-toc.detectAndAutoSetSection|bool|true|

## 4.2. Unique Settings
<a id="markdown-unique-settings" name="unique-settings"></a>

```
<!-- TOC depthFrom:2 orderedList:true -->

<!-- /TOC -->
```

# 5. Contributors
<a id="markdown-contributors" name="contributors"></a>

- sine sawtooth (Add: Header number section)
- chriscamicas (Update: Anchor generation)
- kevindaub (Add : Use workspace settings for tabs and eOL)
- rovest (Feature: Insert anchor)
- zhiguang Wang(Fix: Recognized code to header list)
- jgroom33 (Fix: Codeblock error)
- satokaz (Fix: Codeblock error)
- [mwhebert:](https://github.com/mwhebert) issue [#20](https://github.com/huntertran/markdown-toc/issues/20)
- [vamsi-juvvi](https://github.com/vamsi-juvvi) issue[#60](https://github.com/huntertran/markdown-toc/issues/60)
- [alexchexes](https://github.com/alexchexes) add: unicodeAnchors option

# 6. What's New?
<a id="markdown-what's-new%3F" name="what's-new%3F"></a>
[CHANGELOG](https://github.com/huntertran/markdown-toc/blob/master/CHANGELOG.md)


# 7. Authors
<a id="markdown-authors" name="authors"></a>

This forked repository is maintained by me and anyone who would like to contribute. The EOL fixed was contributed by [roborourke](https://github.com/roborourke/markdown-toc.git) and any one open new pull request with the hope of fixing the problem.

The original code is created by Alan Walk. If you have any questions, contact him at:
- Mail : [alanwalk93@gmail.com](mailto:alanwalk93@gmail.com)
- Twitter : [@AlanWalk93](https://twitter.com/AlanWalk93)
- Github : [AlanWalk](https://github.com/AlanWalk)

# 8. License
<a id="markdown-license" name="license"></a>
The package is Open Source Software released under the [MIT License](LICENSE). It's developed by AlanWalk, maintained by Hunter Tran

# 9. Links
<a id="markdown-links" name="links"></a>
- [Source Code](https://github.com/huntertran/markdown-toc)
- [Market](https://marketplace.visualstudio.com/items?itemName=huntertran.auto-markdown-toc)
