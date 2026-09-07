/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AutoMarkdownToc = void 0;
const vscode_1 = __webpack_require__(1);
const ConfigManager_1 = __webpack_require__(3);
const HeaderManager_1 = __webpack_require__(9);
const AnchorMode_1 = __webpack_require__(7);
const RegexStrings_1 = __webpack_require__(4);
const TocManager_1 = __webpack_require__(16);
class AutoMarkdownToc {
    constructor() {
        this.configManager = new ConfigManager_1.ConfigManager();
        this.headerManager = new HeaderManager_1.HeaderManager(this.configManager);
        this.tocManager = new TocManager_1.TocManager();
    }
    onDidChangeTextDocument(event) {
        if (event.contentChanges.length > 0) {
            this.tocManager.updateTocRange(event.contentChanges);
        }
    }
    async onDidSaveTextDocument() {
        // Prevent save loop
        if (this.configManager.options.isProgrammaticallySave) {
            this.configManager.options.isProgrammaticallySave = false;
            return;
        }
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        let doc = editor.document;
        if (doc.languageId !== 'markdown') {
            return;
        }
        // updateOnSave has to be read from the real settings before it is
        // trusted. Until updateOptions() has run at least once, workspaceValue
        // is still the Dictionary constructor default (true), so a user who
        // turned the setting off had their document rewritten on save anyway
        // until some other command happened to load the configuration.
        this.configManager.updateOptions();
        if (!this.configManager.options.UPDATE_ON_SAVE.value) {
            return;
        }
        let tocRange = this.tocManager.getTocRange();
        if (!tocRange.isSingleLine) {
            // Both awaited: the save has to see the rewritten document, and the
            // isProgrammaticallySave flag has to be set before it fires.
            await this.updateMarkdownToc();
            this.configManager.options.isProgrammaticallySave = true;
            await doc.save();
        }
    }
    async updateMarkdownToc() {
        let autoMarkdownToc = this;
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        let activeEditor = editor;
        autoMarkdownToc.configManager.updateOptions();
        let headerList = await autoMarkdownToc.headerManager.getHeaderList();
        if (headerList.length === 0) {
            vscode_1.window.showWarningMessage("Auto Markdown TOC: no headers detected. TOC was not modified.");
            return;
        }
        // A document that already numbers its headers keeps those numbers in
        // sync. This runs as its own edit: header replacements and the TOC
        // insert below would otherwise be resolved against the same original
        // positions, and the header list has to be rebuilt from the renumbered
        // text before the TOC rows are generated.
        if (autoMarkdownToc.isAutoSetSectionEnabled()) {
            await activeEditor.edit(editBuilder => {
                autoMarkdownToc.updateHeadersWithSections(editBuilder, headerList, activeEditor.document, false);
            });
            headerList = await autoMarkdownToc.headerManager.getHeaderList();
        }
        let tocRange = autoMarkdownToc.tocManager.getTocRange();
        let insertOptions = autoMarkdownToc.getTocInsertOptions(tocRange, activeEditor.document);
        await activeEditor.edit(editBuilder => {
            if (!tocRange.isSingleLine) {
                editBuilder.delete(tocRange);
                // Anchors are only cleared when they are about to be written
                // again. With insertAnchor off an update must not silently
                // remove markup it will not put back; use the
                // "Auto Markdown TOC: Delete" command for that.
                if (autoMarkdownToc.configManager.options.INSERT_ANCHOR.value) {
                    autoMarkdownToc.deleteAnchors(editBuilder);
                }
            }
            autoMarkdownToc.createToc(editBuilder, headerList, tocRange.start, insertOptions);
            // The same useOrderedToc the rows were built with: an anchor has to
            // target the slug its own TOC row links to.
            autoMarkdownToc.insertAnchors(editBuilder, headerList, insertOptions.useOrderedToc);
        });
    }
    /**
     * True when the document numbers its headers and the user has left
     * detectAndAutoSetSection on. Only meaningful after getHeaderList() has run,
     * which is what sets isOrderedListDetected.
     */
    isAutoSetSectionEnabled() {
        return this.configManager.options.DETECT_AUTO_SET_SECTION.value === true
            && this.configManager.options.isOrderedListDetected;
    }
    /**
     * A TOC replacing an existing block needs no padding: the block it replaces
     * already sits on its own lines. A TOC inserted at the cursor does, or it
     * ends up glued to whatever shares that line.
     */
    getTocInsertOptions(tocRange, document) {
        let options = {
            useOrderedToc: this.configManager.options.ORDERED_LIST.value === true || this.isAutoSetSectionEnabled(),
            prefix: '',
            suffix: ''
        };
        if (!tocRange.isEmpty) {
            return options;
        }
        let lineText = document.lineAt(tocRange.start.line).text;
        if (lineText.substring(0, tocRange.start.character) !== '') {
            options.prefix = this.configManager.options.lineEnding;
        }
        if (lineText.substring(tocRange.start.character) !== '') {
            options.suffix = this.configManager.options.lineEnding;
        }
        return options;
    }
    deleteMarkdownToc() {
        let autoMarkdownToc = this;
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        editor.edit(function (editBuilder) {
            let tocRange = autoMarkdownToc.tocManager.getTocRange();
            if (tocRange.isSingleLine) {
                return;
            }
            autoMarkdownToc.deleteAnchors(editBuilder);
            editBuilder.delete(tocRange);
        });
    }
    updateHeadersWithSections(editBuilder, headerList, document, insertSpacing = true) {
        headerList.forEach(header => {
            // The Sections command separates a header from the text above it.
            // A TOC update must not reflow the document, so it opts out.
            if (insertSpacing && header.range.start.line !== 0 && !document.lineAt(header.range.start.line - 1).isEmptyOrWhitespace) {
                editBuilder.insert(new vscode_1.Position(header.range.start.line, 0), this.configManager.options.lineEnding);
            }
            // Writing sections always means writing the numbers. Gating this on
            // orderedList turned "Sections: Insert/Update" into a delete
            // whenever that option was off; removal has its own command,
            // deleteMarkdownSections.
            editBuilder.replace(header.range, header.fullHeaderWithOrder);
        });
    }
    async updateMarkdownSections() {
        this.configManager.updateOptions();
        let headerList = await this.headerManager.getHeaderList();
        let editor = vscode_1.window.activeTextEditor;
        let config = this.configManager;
        if (editor !== undefined) {
            config.options.isOrderedListDetected = true;
            let document = editor.document;
            editor.edit(editBuilder => {
                this.updateHeadersWithSections(editBuilder, headerList, document);
            });
        }
    }
    async deleteMarkdownSections() {
        this.configManager.updateOptions();
        let headerList = await this.headerManager.getHeaderList();
        let editor = vscode_1.window.activeTextEditor;
        let config = this.configManager;
        if (editor !== undefined && headerList !== undefined) {
            config.options.isOrderedListDetected = false;
            editor.edit(function (editBuilder) {
                headerList.forEach(element => {
                    editBuilder.replace(element.range, element.fullHeaderWithoutOrder);
                });
            });
        }
    }
    /**
     * Insert the anchor a header's own TOC row links to.
     */
    insertAnchor(editBuilder, header, useOrderedToc) {
        let anchor = header.anchorFor(this.getTocString(header, useOrderedToc));
        if (anchor === undefined) {
            return;
        }
        let text = [
            this.configManager.options.lineEnding,
            '<a id="',
            anchor.id,
            '" name="',
            anchor.name,
            '"></a>'
        ];
        let insertPosition = new vscode_1.Position(header.range.end.line, header.range.end.character);
        if (this.configManager.options.ANCHOR_MODE.value === AnchorMode_1.AnchorMode.bitbucket) {
            text = text.slice(1);
            text.push(this.configManager.options.lineEnding);
            text.push(this.configManager.options.lineEnding);
            insertPosition = new vscode_1.Position(header.range.start.line, 0);
        }
        editBuilder.insert(insertPosition, text.join(''));
    }
    insertAnchors(editBuilder, headerList, useOrderedToc) {
        if (!this.configManager.options.INSERT_ANCHOR.value) {
            return;
        }
        headerList.forEach(header => {
            this.insertAnchor(editBuilder, header, useOrderedToc);
        });
    }
    deleteAnchors(editBuilder) {
        let editor = vscode_1.window.activeTextEditor;
        if (editor !== undefined) {
            let doc = editor.document;
            for (let index = 0; index < doc.lineCount; index++) {
                let lineText = doc.lineAt(index).text;
                if (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_MARKDOWN_ANCHOR) === null) {
                    continue;
                }
                let startPosition = this.getStartPositionOfAnchorLine(index, doc);
                let range = new vscode_1.Range(startPosition, new vscode_1.Position(startPosition.line + 1, 0));
                editBuilder.delete(range);
            }
        }
    }
    getStartPositionOfAnchorLine(index, doc) {
        // To ensure the anchor will not insert an extra empty line
        let startPosition = new vscode_1.Position(index, 0);
        if (this.configManager.options.ANCHOR_MODE.value === AnchorMode_1.AnchorMode.bitbucket) {
            if (index > 0 && doc.lineAt(index - 1).text.length === 0) {
                startPosition = new vscode_1.Position(index - 2, 0);
            }
        }
        return startPosition;
    }
    createToc(editBuilder, headerList, insertPosition, options) {
        let text = [];
        //// TOC STAT: the custom option IS inside the toc start.
        text = text.concat(this.generateTocStartIndicator());
        //// HEADERS
        // Only the headers that actually make it into the TOC may set the
        // baseline indentation. Counting ignored headers here meant a
        // `<!-- TOC ignore:true -->` on the document's only h1 still pushed
        // every remaining h2 one level to the right.
        let renderedHeaders = headerList.filter(header => header.depth >= this.configManager.options.DEPTH_FROM.value && !header.isIgnored);
        let minimumRenderedDepth = renderedHeaders.length > 0
            ? renderedHeaders.reduce((depth, header) => Math.min(depth, header.depth), renderedHeaders[0].depth)
            : headerList[0].depth;
        let tocRows = renderedHeaders.map(header => this.generateTocRow(header, minimumRenderedDepth, options.useOrderedToc));
        text.push(tocRows.join(this.configManager.options.lineEnding));
        //// TOC END
        text.push(this.configManager.options.lineEnding + "<!-- /TOC -->");
        // insert
        editBuilder.insert(insertPosition, options.prefix + text.join(this.configManager.options.lineEnding) + options.suffix);
    }
    generateTocRow(header, minimumRenderedDepth, useOrderedToc) {
        let row = [];
        // Indentation
        let indentRepeatTime = header.depth - Math.max(this.configManager.options.DEPTH_FROM.value, minimumRenderedDepth);
        row.push(this.configManager.options.tab.repeat(indentRepeatTime));
        row.push(this.configManager.options.BULLET_CHAR.value);
        row.push(' ');
        // TOC with or without link and order
        if (this.configManager.options.WITH_LINKS.value) {
            row.push(header.tocRowWithAnchor(this.getTocString(header, useOrderedToc)));
        }
        else {
            row.push(this.getTocString(header, useOrderedToc));
        }
        return row.join('');
    }
    getTocString(header, useOrderedToc) {
        if (useOrderedToc) {
            return header.tocWithOrder;
        }
        else {
            return header.tocWithoutOrder;
        }
    }
    generateTocStartIndicator() {
        let tocStartIndicator = [];
        tocStartIndicator.push('<!-- TOC ');
        this.generateCustomOptionsInTocStart(tocStartIndicator);
        tocStartIndicator.push('-->' + this.configManager.options.lineEnding);
        return tocStartIndicator.join('');
    }
    generateCustomOptionsInTocStart(tocStartIndicator) {
        // custom options
        this.configManager.options.optionsFlag.forEach(optionKey => {
            if (this.configManager.options.optionsFlag.indexOf(optionKey) !== -1) {
                tocStartIndicator.push(optionKey + ':' + this.configManager.getOptionValueByKey(optionKey) + ' ');
            }
        });
    }
    dispose() {
    }
}
exports.AutoMarkdownToc = AutoMarkdownToc;


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConfigManager = void 0;
const RegexStrings_1 = __webpack_require__(4);
const Options_1 = __webpack_require__(5);
const vscode_1 = __webpack_require__(1);
class ConfigManager {
    constructor() {
        this.options = new Options_1.Options();
    }
    updateOptions() {
        this.loadConfigurations();
        this.loadCustomOptions();
    }
    loadConfigurations() {
        this.options.DEPTH_FROM.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.DEPTH_FROM.key);
        this.options.DEPTH_TO.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.DEPTH_TO.key);
        this.options.INSERT_ANCHOR.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.INSERT_ANCHOR.key);
        this.options.WITH_LINKS.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.WITH_LINKS.key);
        this.options.ORDERED_LIST.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.ORDERED_LIST.key);
        this.options.UPDATE_ON_SAVE.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.UPDATE_ON_SAVE.key);
        this.options.ANCHOR_MODE.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.ANCHOR_MODE.key);
        this.options.UNICODE_ANCHORS.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.UNICODE_ANCHORS.key);
        this.options.BULLET_CHAR.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.BULLET_CHAR.key);
        this.options.DETECT_AUTO_SET_SECTION.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.DETECT_AUTO_SET_SECTION.key);
        this.options.lineEnding = vscode_1.workspace.getConfiguration("files", null).get("eol");
        if (this.options.lineEnding === 'auto') {
            this.options.lineEnding = this.options.EOL;
        }
        this.loadIndentation();
        if (vscode_1.workspace.getConfiguration("files", null).get("autoSave") !== "off") {
            this.options.autoSave = true;
        }
    }
    /**
     * Resolves the indentation one TOC nesting level is written with.
     *
     * #55 - only the *configured* settings were consulted, so a document whose
     * effective indentation came from anywhere else was indented by the
     * configured default instead. Both `editor.detectIndentation` (on by
     * default, and it infers the width from the file itself) and the
     * EditorConfig extension work by setting the open editor's own options, not
     * the settings. Those options are what the status bar reports and what a
     * user means by "my indent setting", so the active editor is asked first
     * and the settings are the fallback for when there is no editor.
     */
    loadIndentation() {
        let editorOptions = vscode_1.window.activeTextEditor === undefined
            ? undefined
            : vscode_1.window.activeTextEditor.options;
        // Language scoped settings, "[markdown]": { "editor.tabSize": 2 }, are
        // read as plain keys off the section rather than through get().
        let markdownScope = vscode_1.workspace.getConfiguration("[markdown]", null);
        this.options.tabSize = this.firstNumber([
            editorOptions === undefined ? undefined : editorOptions.tabSize,
            markdownScope["editor.tabSize"],
            vscode_1.workspace.getConfiguration("editor", null).get("tabSize")
        ], this.options.DEFAULT_TAB_SIZE);
        this.options.insertSpaces = this.firstBoolean([
            editorOptions === undefined ? undefined : editorOptions.insertSpaces,
            markdownScope["editor.insertSpaces"],
            vscode_1.workspace.getConfiguration("editor", null).get("insertSpaces")
        ], this.options.DEFAULT_INSERT_SPACES);
        // Assigned on both branches. Only the spaces branch used to write to
        // `tab`, so once a spaces document had been opened the value stuck for
        // the rest of the session and a tab-indented document was still
        // indented with spaces.
        this.options.tab = this.options.insertSpaces && this.options.tabSize > 0
            ? " ".repeat(this.options.tabSize)
            : "\t";
    }
    /**
     * vscode types `TextEditorOptions.tabSize` as `number | string` and
     * `insertSpaces` as `boolean | string` - "auto" is a legal value to write -
     * and a language scoped setting holds whatever the user typed into their
     * settings file. A candidate of the wrong type is not an answer, so the
     * next source is asked instead of it being coerced into a nonsense value.
     */
    firstNumber(candidates, fallback) {
        for (let candidate of candidates) {
            if (typeof candidate === 'number' && isFinite(candidate) && candidate > 0) {
                return candidate;
            }
        }
        return fallback;
    }
    firstBoolean(candidates, fallback) {
        for (let candidate of candidates) {
            if (typeof candidate === 'boolean') {
                return candidate;
            }
        }
        return fallback;
    }
    /**
     * DEPRECATED
     * use single line unique options instead
     */
    loadCustomOptions() {
        this.options.optionsFlag = [];
        // Per document overrides belong to the document they were read from.
        // Without this reset a `<!-- TOC depthFrom:2 -->` in one file kept
        // applying to every other file for the rest of the session, because
        // Dictionary.value prefers uniqueValue whenever it is not undefined.
        this.options.allSettings.forEach(setting => {
            setting.uniqueValue = undefined;
        });
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        for (let index = 0; index < editor.document.lineCount; index++) {
            let lineText = editor.document.lineAt(index).text;
            // #41 - "<!-- TOC ignore:true -->" also starts with TOC, so the
            // first one of those above the TOC was read as the options line.
            // It carries no options, and the loop stops at the first start
            // marker, so the real "<!-- TOC depthFrom:2 ... -->" below it was
            // never read and its options were dropped on the next update.
            // TocManager.scanForTocRange already skips ignore markers this way.
            if (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_IGNORE_TITLE)) {
                continue;
            }
            if (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_START)) {
                let options = lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_CONFIG);
                if (options !== null) {
                    options.forEach(element => {
                        let pair = RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_CONFIG_ITEM.exec(element);
                        if (pair !== null) {
                            let key = pair[1].toLocaleLowerCase();
                            let value = pair[2];
                            switch (key) {
                                case this.options.DEPTH_FROM.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DEPTH_FROM.uniqueValue = this.parseValidNumber(value);
                                    break;
                                case this.options.DEPTH_TO.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DEPTH_TO.uniqueValue = Math.max(this.parseValidNumber(value), this.options.DEPTH_FROM.value);
                                    break;
                                case this.options.INSERT_ANCHOR.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.INSERT_ANCHOR.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.WITH_LINKS.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.WITH_LINKS.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.ORDERED_LIST.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.ORDERED_LIST.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.UPDATE_ON_SAVE.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.UPDATE_ON_SAVE.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.ANCHOR_MODE.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.ANCHOR_MODE.uniqueValue = value;
                                    break;
                                case this.options.UNICODE_ANCHORS.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.UNICODE_ANCHORS.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.BULLET_CHAR.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.BULLET_CHAR.uniqueValue = value;
                                    break;
                                case this.options.DETECT_AUTO_SET_SECTION.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DETECT_AUTO_SET_SECTION.uniqueValue = this.parseBool(value);
                                    break;
                            }
                        }
                    });
                }
                break;
            }
        }
        return;
    }
    getOptionValueByKey(key) {
        switch (key.toLowerCase()) {
            case this.options.DEPTH_FROM.lowerCaseKey:
                return this.options.DEPTH_FROM.value;
            case this.options.DEPTH_TO.lowerCaseKey:
                return this.options.DEPTH_TO.value;
            case this.options.INSERT_ANCHOR.lowerCaseKey:
                return this.options.INSERT_ANCHOR.value;
            case this.options.WITH_LINKS.lowerCaseKey:
                return this.options.WITH_LINKS.value;
            case this.options.ORDERED_LIST.lowerCaseKey:
                return this.options.ORDERED_LIST.value;
            case this.options.UPDATE_ON_SAVE.lowerCaseKey:
                return this.options.UPDATE_ON_SAVE.value;
            case this.options.ANCHOR_MODE.lowerCaseKey:
                return this.options.ANCHOR_MODE.value;
            case this.options.UNICODE_ANCHORS.lowerCaseKey:
                return this.options.UNICODE_ANCHORS.value;
            case this.options.BULLET_CHAR.lowerCaseKey:
                return this.options.BULLET_CHAR.value;
            case this.options.DETECT_AUTO_SET_SECTION.lowerCaseKey:
                return this.options.DETECT_AUTO_SET_SECTION.value;
        }
    }
    parseBool(value) {
        return value.toLocaleLowerCase() === 'true';
    }
    parseValidNumber(value) {
        let num = parseInt(value);
        if (num < 1) {
            return 1;
        }
        return num;
    }
}
exports.ConfigManager = ConfigManager;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RegexStrings = void 0;
class RegexStrings {
    constructor() {
        // The marker has to BEGIN with TOC. Matching "TOC" anywhere inside any HTML
        // comment made an ordinary attribution comment such as
        // "<!-- Generated by auto-markdown-toc -->" register as the start of the TOC
        // block, so everything between it and <!-- /TOC --> was replaced on the next
        // update. The \b keeps <!-- TOCX --> from matching.
        this.REGEXP_TOC_START = /^\s*<!--\s*TOC\b(.*?)-->/i;
        this.REGEXP_TOC_STOP = /^\s*<!--\s*\/TOC\b(.*?)-->/i;
        this.REGEXP_TOC_CONFIG = /\w+[:=][^\s]+/gi;
        this.REGEXP_TOC_CONFIG_ITEM = /(\w+)[:=]([^\s]+)/;
        this.REGEXP_MARKDOWN_ANCHOR = /^<a id="markdown-.+" name=".+"><\/a\>/;
        this.REGEXP_CODE_BLOCK1 = /^\s?```/;
        this.REGEXP_CODE_BLOCK2 = /^\s?~~~/;
        this.REGEXP_ANCHOR = /\[.+\]\(#(.+)\)/;
        // "ingore" is the original typo. Documents in the wild use it, so both
        // spellings have to keep working.
        this.REGEXP_IGNORE_TITLE = /<!--\s*TOC\s+i(?:gn|ng)ore:true\s*-->/si;
        // Groups: 1 = header marks, 2 = section number (undefined when absent),
        // 3 = title.
        //
        // A section number is a run of digits and dots that is SEPARATED FROM THE
        // TITLE BY WHITESPACE: "1.", "1.1", "2.3.4." all qualify in "## 1.1. Title".
        // That separator is what keeps a bare version heading such as "# 1.1.1" a
        // title. The previous pattern had no such requirement, so it split
        // "# 1.1.1" into the number "1.1." and the title "1" — which, once header
        // renumbering became the default, rewrote CHANGELOG version headings in
        // place.
        this.REGEXP_HEADER_META = /^(#*)\s*(?:((?:\d+\.)+\d*|\d+\.)\s+)?(.+)$/;
        this.REGEXP_UNIQUE_CONFIG_START = /\s*<!--(.*)[^\/]TOC UNIQUE CONFIGS(.*)-->/gi;
        this.REGEXP_UNIQUE_CONFIG_STOP = /\s*<!--(.*)\/TOC UNIQUE CONFIGS(.*)-->/gi;
        this.REGEXP_UNIQUE_CONFIG_LINE = /\s*<!--( *)(\w+)[:](\w+)( *)-->/gi;
    }
    static get Instance() {
        return this._instance || (this._instance = new this());
    }
}
exports.RegexStrings = RegexStrings;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Options = void 0;
const Dictionary_1 = __webpack_require__(6);
const AnchorMode_1 = __webpack_require__(7);
class Options {
    constructor() {
        // current document options
        this.optionsFlag = [];
        this.isProgrammaticallySave = false;
        this.isOrderedListDetected = false;
        // workspace settings
        this.DEPTH_FROM = new Dictionary_1.Dictionary("depthFrom", 1);
        this.DEPTH_TO = new Dictionary_1.Dictionary("depthTo", 6);
        this.INSERT_ANCHOR = new Dictionary_1.Dictionary("insertAnchor", false);
        this.WITH_LINKS = new Dictionary_1.Dictionary("withLinks", true);
        this.ORDERED_LIST = new Dictionary_1.Dictionary("orderedList", false);
        this.UPDATE_ON_SAVE = new Dictionary_1.Dictionary("updateOnSave", true);
        this.ANCHOR_MODE = new Dictionary_1.Dictionary("anchorMode", AnchorMode_1.AnchorMode.github);
        this.UNICODE_ANCHORS = new Dictionary_1.Dictionary("unicodeAnchors", false);
        this.BULLET_CHAR = new Dictionary_1.Dictionary("bulletCharacter", "-");
        this.DETECT_AUTO_SET_SECTION = new Dictionary_1.Dictionary("detectAndAutoSetSection", true);
        this.extensionName = "markdown-toc";
        this.EOL = (__webpack_require__(8).EOL);
        // Indentation to fall back on when neither the active editor nor the
        // settings answer with a usable value. vscode's own defaults, so a TOC
        // matches what the editor itself would have inserted.
        this.DEFAULT_TAB_SIZE = 4;
        this.DEFAULT_INSERT_SPACES = true;
        // language configuration
        this.lineEnding = "";
        this.tabSize = this.DEFAULT_TAB_SIZE;
        this.insertSpaces = this.DEFAULT_INSERT_SPACES;
        this.autoSave = false;
        // special characters. Recomputed from tabSize/insertSpaces on every
        // updateOptions(); see ConfigManager.loadIndentation.
        this.tab = '\t';
    }
    /**
     * Every setting a `<!-- TOC ... -->` line can override. loadCustomOptions
     * clears their uniqueValue through this, so overrides read from one
     * document stop applying to the next one.
     */
    get allSettings() {
        return [
            this.DEPTH_FROM,
            this.DEPTH_TO,
            this.INSERT_ANCHOR,
            this.WITH_LINKS,
            this.ORDERED_LIST,
            this.UPDATE_ON_SAVE,
            this.ANCHOR_MODE,
            this.UNICODE_ANCHORS,
            this.BULLET_CHAR,
            this.DETECT_AUTO_SET_SECTION
        ];
    }
}
exports.Options = Options;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Dictionary = void 0;
class Dictionary {
    constructor(key, defaultWorkspaceValue) {
        this.key = key;
        this.lowerCaseKey = key.toLocaleLowerCase();
        this.workspaceValue = defaultWorkspaceValue;
    }
    get value() {
        if (this.uniqueValue !== undefined) {
            return this.uniqueValue;
        }
        return this.workspaceValue;
    }
}
exports.Dictionary = Dictionary;


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AnchorMode = void 0;
var AnchorMode;
(function (AnchorMode) {
    AnchorMode["github"] = "github.com";
    AnchorMode["bitbucket"] = "bitbucket.org";
    AnchorMode["ghost"] = "ghost.org";
    AnchorMode["gitlab"] = "gitlab.com";
})(AnchorMode || (exports.AnchorMode = AnchorMode = {}));


/***/ }),
/* 8 */
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HeaderManager = void 0;
const Header_1 = __webpack_require__(10);
const vscode_1 = __webpack_require__(1);
const RegexStrings_1 = __webpack_require__(4);
class HeaderManager {
    constructor(configManager) {
        this.configManager = configManager;
    }
    async getDocumentSymbols(fileUri) {
        let allSymbols = await vscode_1.commands.executeCommand("vscode.executeDocumentSymbolProvider", fileUri);
        if (!allSymbols) {
            return [];
        }
        // Markdown headers can come back as different SymbolKinds depending on which
        // provider wins (built-in vs. Markdown All in One vs. markdownlint, etc.).
        // #60: With plantuml code blocks, the @startmindmap/@endmindmap sentinels
        // cause getDocumentSymbols to return Object kinds which must be excluded.
        const headerKinds = new Set([
            vscode_1.SymbolKind.String,
            vscode_1.SymbolKind.Field,
            vscode_1.SymbolKind.Key,
            vscode_1.SymbolKind.Module,
            vscode_1.SymbolKind.Method,
        ]);
        const filtered = allSymbols.filter(sym => headerKinds.has(sym.kind));
        // Fallback: if the filter eliminated everything but symbols exist,
        // trust the provider and use the raw list instead of producing an empty TOC.
        return filtered.length > 0 ? filtered : allSymbols;
    }
    async getHeaderList() {
        let headerList = [];
        let editor = vscode_1.window.activeTextEditor;
        if (editor !== undefined) {
            let fileUri = vscode_1.Uri.file(editor.document.fileName);
            let symbols = await this.getDocumentSymbols(fileUri);
            let headerLevels = new Map();
            let allHeaders = new Array();
            this.convertAllFirstLevelHeader(symbols, allHeaders, headerLevels);
            let consideredDepthToInclude = this.getMostPopularHeaderDepth(headerLevels);
            for (let index = 0; index < allHeaders.length; index++) {
                let header = allHeaders[index];
                // only level of consideredDepthToInclude
                if (header.depth > consideredDepthToInclude) {
                    continue;
                }
                header.isIgnored = this.getIsHeaderIgnored(header, editor);
                header.orderArray = this.calculateHeaderOrder(header, headerList);
                header.orderedListString = this.buildOrderedListString(header.orderArray);
                if (header.depth <= this.configManager.options.DEPTH_TO.value) {
                    headerList.push(header);
                    this.addHeaderChildren(symbols[index], headerList, editor);
                }
            }
            // violation of clean code
            this.detectAutoOrderedHeader(headerList);
        }
        return headerList;
    }
    getIsHeaderIgnored(header, editor) {
        let previousLine = header.range.start.line - 1;
        // Line 0 is a valid place for the marker, so the guard is >= 0.
        if (previousLine >= 0) {
            if (editor.document.lineAt(previousLine).text.match(RegexStrings_1.RegexStrings.Instance.REGEXP_IGNORE_TITLE)) {
                return true;
            }
        }
        return false;
    }
    getMostPopularHeaderDepth(headerLevels) {
        let mostPopularHeaderDepth = 0;
        let mostPopularHeaderDepthCount = 0;
        headerLevels.forEach((count, depth) => {
            // Compare counts against counts. Comparing a count against a depth,
            // as this used to, picked the winner more or less at random and
            // could cut off top level sections. Ties go to the shallower depth
            // so the broadest set of headers survives the filter.
            let isMorePopular = count > mostPopularHeaderDepthCount;
            let isShallowerTie = count === mostPopularHeaderDepthCount && depth < mostPopularHeaderDepth;
            if (isMorePopular || isShallowerTie) {
                mostPopularHeaderDepthCount = count;
                mostPopularHeaderDepth = depth;
            }
        });
        return mostPopularHeaderDepth;
    }
    convertAllFirstLevelHeader(symbols, allHeaders, headerLevels) {
        for (let index = 0; index < symbols.length; index++) {
            let header = new Header_1.Header(this.configManager.options.ANCHOR_MODE.value, this.configManager.options.UNICODE_ANCHORS.value);
            header.convertFromSymbol(symbols[index]);
            allHeaders.push(header);
            let depthCount = headerLevels.get(header.depth);
            if (depthCount === undefined) {
                headerLevels.set(header.depth, 1);
            }
            else {
                depthCount = depthCount + 1;
                headerLevels.set(header.depth, depthCount);
            }
        }
    }
    addHeaderChildren(symbol, headerList, editor) {
        if (symbol.children.length > 0) {
            for (let index = 0; index < symbol.children.length; index++) {
                let header = new Header_1.Header(this.configManager.options.ANCHOR_MODE.value, this.configManager.options.UNICODE_ANCHORS.value);
                header.convertFromSymbol(symbol.children[index]);
                header.isIgnored = this.getIsHeaderIgnored(header, editor);
                header.orderArray = this.calculateHeaderOrder(header, headerList);
                header.orderedListString = this.buildOrderedListString(header.orderArray);
                if (header.depth <= this.configManager.options.DEPTH_TO.value) {
                    headerList.push(header);
                    this.addHeaderChildren(symbol.children[index], headerList, editor);
                }
            }
        }
    }
    detectAutoOrderedHeader(headerList) {
        this.configManager.options.isOrderedListDetected = false;
        // orderedListString is recomputed for every header, so it can never
        // answer "does this document number its headers?". detectedOrderString
        // keeps what the header text itself carried.
        for (let index = 0; index < headerList.length; index++) {
            if (headerList[index].detectedOrderString !== undefined && headerList[index].detectedOrderString !== '') {
                this.configManager.options.isOrderedListDetected = true;
                break;
            }
        }
    }
    /**
     * The depth section numbering starts at. The README has always described
     * numbering as beginning at depthFrom, but the numbering itself used to
     * start at depth 1 regardless, which shifted every level and handed a
     * number to headers depthFrom excludes from the TOC altogether.
     */
    getNumberingRootDepth() {
        return Math.max(1, this.configManager.options.DEPTH_FROM.value);
    }
    /**
     * The first numbered header at a given depth: "1", "1.1", "1.1.1" ...
     * Length is relative to the numbering root. Every level is seeded with 1
     * because `new Array(n)` alone leaves holes, which join() renders as "..1".
     */
    createFirstOrderArray(depth, rootDepth) {
        return new Array(Math.max(1, depth - rootDepth + 1)).fill(1);
    }
    buildOrderedListString(orderArray) {
        if (orderArray.length === 0) {
            return "";
        }
        return orderArray.join('.') + ".";
    }
    calculateHeaderOrder(headerBeforePushToList, headerList) {
        let rootDepth = this.getNumberingRootDepth();
        if (headerBeforePushToList.depth < rootDepth) {
            // Above the numbering root, so not part of the numbering at all.
            // An empty order array is what tells Header to leave the text alone.
            return [];
        }
        // Headers above the root take no part in the numbering, so they must not
        // be mistaken for the previous sibling or the parent of a numbered one.
        let numberedHeaders = headerList.filter(header => header.orderArray.length > 0);
        if (numberedHeaders.length === 0) {
            // special case: First header
            return this.createFirstOrderArray(headerBeforePushToList.depth, rootDepth);
        }
        let lastHeaderInList = numberedHeaders[numberedHeaders.length - 1];
        if (headerBeforePushToList.depth < lastHeaderInList.depth) {
            // continue of the parent level
            let previousHeader;
            for (let index = numberedHeaders.length - 1; index >= 0; index--) {
                if (numberedHeaders[index].depth === headerBeforePushToList.depth) {
                    previousHeader = numberedHeaders[index];
                    break;
                }
            }
            if (previousHeader !== undefined) {
                let orderArray = Object.assign([], previousHeader.orderArray);
                orderArray[orderArray.length - 1]++;
                return orderArray;
            }
            else {
                // special case: first header has greater level than second header
                return this.createFirstOrderArray(headerBeforePushToList.depth, rootDepth);
            }
        }
        if (headerBeforePushToList.depth > lastHeaderInList.depth) {
            // child level of previous
            // order start with 1
            let orderArray = Object.assign([], lastHeaderInList.orderArray);
            orderArray.push(1);
            return orderArray;
        }
        if (headerBeforePushToList.depth === lastHeaderInList.depth) {
            // the same level, increase last item in orderArray
            let orderArray = Object.assign([], lastHeaderInList.orderArray);
            orderArray[orderArray.length - 1]++;
            return orderArray;
        }
        return [];
    }
}
exports.HeaderManager = HeaderManager;


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Header = void 0;
const vscode_1 = __webpack_require__(1);
const AnchorMode_1 = __webpack_require__(7);
const Anchor_1 = __webpack_require__(11);
const RegexStrings_1 = __webpack_require__(4);
const AnchorEncoder_1 = __webpack_require__(12);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ANCHOR_MARKDOWN_HEADER = __webpack_require__(13);
class Header {
    constructor(anchorMode, preserveUnicodeAnchors = false) {
        this.headerMark = "";
        this.orderedListString = "";
        // The order the header text already carried ("2.1." in "## 2.1. Title"), as
        // opposed to orderedListString, which HeaderManager recomputes. Empty when
        // the document does not number its headers.
        this.detectedOrderString = "";
        this.dirtyTitle = "";
        this.isIgnored = false;
        this.orderArray = [];
        this.anchorMode = AnchorMode_1.AnchorMode.github;
        this.preserveUnicodeAnchors = false;
        this.anchorMode = anchorMode;
        this.preserveUnicodeAnchors = preserveUnicodeAnchors;
        this.range = new vscode_1.Range(0, 0, 0, 0);
    }
    convertFromSymbol(symbol) {
        let headerTextSplit = symbol.name.match(RegexStrings_1.RegexStrings.Instance.REGEXP_HEADER_META);
        if (headerTextSplit !== null) {
            // Group 2 is optional, so it is undefined for an unnumbered header.
            let detectedOrder = headerTextSplit[2] === undefined ? "" : headerTextSplit[2];
            this.headerMark = headerTextSplit[1];
            this.orderedListString = detectedOrder;
            this.detectedOrderString = detectedOrder;
            this.dirtyTitle = headerTextSplit[3];
        }
        this.range = new vscode_1.Range(symbol.range.start, new vscode_1.Position(symbol.range.start.line, symbol.name.length));
    }
    get depth() {
        return this.headerMark.length;
    }
    get isHeader() {
        return this.headerMark !== "";
    }
    tocRowWithAnchor(tocString) {
        let title = this.cleanUpTitle(tocString);
        let tocRow = ANCHOR_MARKDOWN_HEADER(title, this.anchorMode);
        if (!this.preserveUnicodeAnchors) {
            return tocRow;
        }
        return tocRow.replace(/\]\(#([^)]+)\)$/, function (_match, anchorPart) {
            return "](#" + (0, AnchorEncoder_1.decodeNonAsciiAnchorPart)(anchorPart) + ")";
        });
    }
    /**
     * The anchor the TOC row for `tocString` points at, or undefined when that
     * row carries no link. `tocString` has to be the very same string the row
     * was generated from, numbering included, or the anchor lands on a slug
     * nothing links to.
     */
    anchorFor(tocString) {
        let anchorMatches = this.tocRowWithAnchor(tocString).match(RegexStrings_1.RegexStrings.Instance.REGEXP_ANCHOR);
        if (anchorMatches === null) {
            return undefined;
        }
        return new Anchor_1.Anchor(anchorMatches[1]);
    }
    get tocWithoutOrder() {
        return this.dirtyTitle;
    }
    get tocWithOrder() {
        // A header above the numbering root (depth < depthFrom) takes no number.
        // Without this guard it would be rewritten as "# . Title".
        if (this.orderArray.length === 0) {
            return this.tocWithoutOrder;
        }
        return this.orderArray.join('.') + ". " + this.tocWithoutOrder;
    }
    get fullHeaderWithOrder() {
        return this.headerMark + " " + this.tocWithOrder;
    }
    get fullHeaderWithoutOrder() {
        return this.headerMark + " " + this.tocWithoutOrder;
    }
    cleanUpTitle(dirtyTitle) {
        // #67 - an image in a heading renders as a picture and contributes no
        // text, so its alt text must not reach the TOC row. Images go first so
        // that a badge wrapped in a link, "[![alt](image)](href)", collapses to
        // an empty link that the link rule below then removes outright.
        let title = dirtyTitle.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
        // The link text is what renders, so keep it and drop the target. The
        // text group accepts the empty string, otherwise a link emptied by the
        // image rule would survive as a literal "[](href)". Matching the text
        // with [^\]]* rather than .+ also keeps two links on one line from
        // being swallowed by a single greedy match.
        title = title.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
        title = title.replace(/<!--.+-->/gi, ""); // replace comment
        // #69 - parentheses used to be stripped here, which turned
        // "bar (info)" into "bar info". They are ordinary title text;
        // anchor-markdown-header already drops them when it builds the slug.
        title = title.replace(/#*`/g, ""); // replace special char
        // Removing an image or a comment from the middle of a title leaves the
        // whitespace that surrounded it behind.
        return title.replace(/\s+/g, " ").trim();
    }
}
exports.Header = Header;


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Anchor = void 0;
const vscode_1 = __webpack_require__(1);
class Anchor {
    /**
     * `slug` is the href of the TOC row that links here, without the leading
     * "#". Building the anchor out of that slug rather than re-deriving one
     * from the header text is what keeps the link and its target in agreement:
     * two independent slug algorithms disagreed for any title with punctuation
     * (#33) and for every numbered row (#10).
     */
    constructor(slug) {
        this.id = "";
        this.name = "";
        this.range = new vscode_1.Range(0, 0, 0, 0);
        this.id = "markdown-" + slug;
        this.name = slug;
    }
}
exports.Anchor = Anchor;


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.decodeNonAsciiAnchorPart = decodeNonAsciiAnchorPart;
function isHexByte(value, index) {
    return value[index] === "%" && /^[0-9a-fA-F]{2}$/.test(value.slice(index + 1, index + 3));
}
function getUtf8SequenceLength(firstByte) {
    if (firstByte >= 0xC2 && firstByte <= 0xDF) {
        return 2;
    }
    if (firstByte >= 0xE0 && firstByte <= 0xEF) {
        return 3;
    }
    if (firstByte >= 0xF0 && firstByte <= 0xF4) {
        return 4;
    }
    return 0;
}
function decodeNonAsciiAnchorPart(value) {
    let result = "";
    for (let index = 0; index < value.length;) {
        if (!isHexByte(value, index)) {
            result += value[index];
            index++;
            continue;
        }
        let encodedByte = value.slice(index, index + 3);
        let firstByte = parseInt(encodedByte.slice(1), 16);
        let sequenceLength = getUtf8SequenceLength(firstByte);
        if (sequenceLength === 0) {
            result += encodedByte;
            index += 3;
            continue;
        }
        let encodedSequence = encodedByte;
        let sequenceEnd = index + 3;
        for (let byteIndex = 1; byteIndex < sequenceLength; byteIndex++) {
            if (!isHexByte(value, sequenceEnd)) {
                encodedSequence = "";
                break;
            }
            encodedSequence += value.slice(sequenceEnd, sequenceEnd + 3);
            sequenceEnd += 3;
        }
        if (encodedSequence === "") {
            result += encodedByte;
            index += 3;
            continue;
        }
        try {
            result += decodeURIComponent(encodedSequence).toLocaleLowerCase();
            index = sequenceEnd;
        }
        catch {
            result += encodedByte;
            index += 3;
        }
    }
    return result;
}


/***/ }),
/* 13 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var emojiRegex = __webpack_require__(14);
var removeMd = __webpack_require__(15);

// https://github.com/joyent/node/blob/192192a09e2d2e0d6bdd0934f602d2dbbf10ed06/tools/doc/html.js#L172-L183
function getNodejsId(text, repetition) {
  text = text.replace(/[^a-z0-9]+/g, '_');
  text = text.replace(/^_+|_+$/, '');
  text = text.replace(/^([^a-z])/, '_$1');

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '_' and the number.
  // An example may be found here: http://nodejs.org/api/domain.html#domain_example_1
  if (repetition) {
    text += '_' + repetition;
  }

  return text;
}

function basicGithubId(text) {
  return text.replace(/ /g,'-')
    // escape codes
    .replace(/%([abcdef]|\d){2,2}/ig, '')
    // single chars that are removed
    .replace(/[\/\\?!%:\[\]`.,()*"';{}+=<>~\$|#@&–—]/g,'')
    // CJK punctuations that are removed
    .replace(/[。？！，、；：“”【】（）〔〕［］﹃﹄“ ”‘’﹁﹂—…－～《》〈〉「」]/g, '')
    // latin-1 supplement chars that are removed
    .replace(/[¡¢£¤¥¦§¨©«¬®¯°±²³´¶·¸¹»¼½¾¿]/g, '')
    ;

}

function getGithubId(text, repetition) {
  text = basicGithubId(text);

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '-' and the number.
  if (repetition) {
    text += '-' + repetition;
  }

  // Strip emojis
  text = text.replace(emojiRegex(), '')

  // Strip embedded markdown formatting
  text = removeMd(text)

  return text;
}

function getBitbucketId(text, repetition) {
  text = 'markdown-header-' + basicGithubId(text);

  // BitBucket condenses consecutive hyphens (GitHub doesn't)
  text = text.replace(/--+/g, '-');

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '_' and the number.
  // https://groups.google.com/d/msg/bitbucket-users/XnEWbbzs5wU/Fat0UdIecZkJ
  if (repetition) {
    text += '_' + repetition;
  }

  return text;
}

function basicGhostId(text) {
  return text.replace(/ /g,'')
    // escape codes are not removed
    // single chars that are removed
    .replace(/[\/?:\[\]`.,()*"';{}\-+=<>!@#%^&\\\|]/g,'')
    // $ replaced with d
    .replace(/\$/g, 'd')
    // ~ replaced with t
    .replace(/~/g, 't')
    ;
}

function getGhostId(text, repetition) {
  text = basicGhostId(text);

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '-' and the number.
  if (repetition) {
    text += '-' + repetition;
  }

  return text;
}

// see: https://github.com/gitlabhq/gitlabhq/blob/master/doc/user/markdown.md#header-ids-and-links
function getGitlabId(text, repetition) {
  text = text
    .replace(/<(.*)>(.*)<\/\1>/g,"$2") // html tags
    .replace(/!\[.*\]\(.*\)/g,'')      // image tags
    .replace(/\[(.*)\]\(.*\)/,"$1")    // url
    .replace(/\s+/g, '-')              // All spaces are converted to hyphens
    .replace(/[\/?!:\[\]`.,()*"';{}+=<>~\$|#@]/g,'') // All non-word text (e.g., punctuation, HTML) is removed
    .replace(/[。？！，、；：“”【】（）〔〕［］﹃﹄“ ”‘’﹁﹂—…－～《》〈〉「」]/g, '') // remove CJK punctuations
    .replace(/[¹²³]/g, '') // remove snall subset of latin-1 supplement chars
    .replace(/[-]+/g,'-')              // duplicated hyphen
    .replace(/^-/,'')                  // ltrim hyphen
    .replace(/-$/,'');                 // rtrim hyphen
  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '-' and the number.
  if (repetition) {
    text += '-' + repetition;
  }
  return text;
}


/**
 * Generates an anchor for the given header and mode.
 *
 * @name anchorMarkdownHeader
 * @function
 * @param header      {String} The header to be anchored.
 * @param mode        {String} The anchor mode (github.com|nodejs.org|bitbucket.org|ghost.org|gitlab.com).
 * @param repetition  {Number} The nth occurrence of this header text, starting with 0. Not required for the 0th instance.
 * @param href        {String} The href to be used in the anchor.
 * @return            {String} The header anchor that is compatible with the given mode.
 */
module.exports = function anchorMarkdownHeader(header, mode, repetition, href) {
  mode = mode || 'github.com';
  var replace;
  var customEncodeURI = encodeURI;
  var customCasing = asciiOnlyToLowerCase;

  // Extended Markdown heading IDs: `Header text {#id}` or kramdown's `{:#id}` at end of line.
  // See https://www.markdownlang.com/extended/heading-ids.html
  var idMatch = header.match(/^(.*?)[ \t]*\{:?#([^\s}]+)\}[ \t]*$/);
  if (idMatch) {
    header = idMatch[1];
    href = idMatch[2];
  }

  switch(mode) {
    case 'github.com':
      replace = getGithubId;
      customEncodeURI = function(uri) {
        var newURI = encodeURI(uri);

        // encodeURI replaces the zero width joiner character
        // (used to generate emoji sequences, e.g.Female Construction Worker 👷🏼‍♀️)
        // github doesn't URL encode them, so we replace them after url encoding to preserve the zwj character.
        return newURI.replace(/%E2%80%8D/g, '\u200D');
      };
      customCasing = function(input) {
        // GitHub prefers to lowercase all characters, not just ASCII ones. Previously this was not the case.
        return input.toLowerCase();
      }
      break;
    case 'bitbucket.org':
      replace = getBitbucketId;
      break;
    case 'gitlab.com':
      replace = getGitlabId;
      break;
    case 'nodejs.org':
      replace = getNodejsId;
      break;
    case 'ghost.org':
      replace = getGhostId;
      break;
    case 'custom':
      if(href === undefined){
        throw new Error('Missing href');
      }
      break;
    default:
      throw new Error('Unknown mode: ' + mode);
  }

  function asciiOnlyToLowerCase(input) {
    var result = '';
    for (var i = 0; i < input.length; ++i) {
      if (input[i] >= 'A' && input[i] <= 'Z') {
        result += input[i].toLowerCase();
      } else {
        result += input[i];
      }
    }
    return result;
  }

  href = href || replace(customCasing(header.trim()), repetition);

  return '[' + header + '](#' + customEncodeURI(href) + ')';
};


/***/ }),
/* 14 */
/***/ ((module) => {

module.exports = () => {
	// https://mths.be/emoji
	return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};


/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = function(md, options) {
  options = options || {};
  options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
  options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
  options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
  options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;
  options.abbr = options.hasOwnProperty('abbr') ? options.abbr : false;
  options.replaceLinksWithURL = options.hasOwnProperty('replaceLinksWithURL') ? options.replaceLinksWithURL : false;
  options.separateLinksAndTexts = options.hasOwnProperty('separateLinksAndTexts') ? options.separateLinksAndTexts : null;
  options.htmlTagsToSkip = options.hasOwnProperty('htmlTagsToSkip') ? options.htmlTagsToSkip : [];
  options.throwError = options.hasOwnProperty('throwError') ? options.throwError : false;

  var output = md || '';

  // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
  output = output.replace(/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm, '');

  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar)
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
      else
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
    }
    if (options.gfm) {
      output = output
      // Header
        .replace(/\n={2,}/g, '\n')
        // Fenced codeblocks
        .replace(/~{3}.*\n/g, '')
        // Strikethrough
        .replace(/~~/g, '')
        // Fenced codeblocks with backticks
        .replace(/```(?:.*)\n([\s\S]*?)```/g, (_, code) => code.trim());
    }
    if (options.abbr) {
      // Remove abbreviations
      output = output.replace(/\*\[.*\]:.*\n/, '');
    }

    let htmlReplaceRegex = /<[^>]*>/g
    if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
      // Create a regex that matches tags not in htmlTagsToSkip
      const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join('|')
      htmlReplaceRegex = new RegExp(
        `<(?!\/?(${joinedHtmlTagsToSkip})(?=>|\s[^>]*>))[^>]*>`,
        'g',
      )
    }

    if (options.separateLinksAndTexts) {
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1' + options.separateLinksAndTexts + '$2');
    }

    output = output
      // Remove HTML tags
      .replace(htmlReplaceRegex, '')
      // Remove setext-style headers
      .replace(/^[=\-]{2,}\s*$/g, '')
      // Remove footnotes?
      .replace(/\[\^.+?\](\: .*?$)?/g, '')
      .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
      // Remove images
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
      // Remove inline links
      .replace(/\[([\s\S]*?)\]\s*[\(\[].*?[\)\]]/g, options.replaceLinksWithURL ? '$2' : '$1')
      // Remove blockquotes
      .replace(/^(\n)?\s{0,3}>\s?/gm, '$1')
      // .replace(/(^|\n)\s{0,3}>\s?/g, '\n\n')
      // Remove reference-style links?
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
      // Remove atx-style headers
      .replace(/^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm, '$1$3$4$6')
      // Remove * emphasis
      .replace(/([\*]+)(\S)(.*?\S)??\1/g, '$2$3')
      // Remove _ emphasis. Unlike *, _ emphasis gets rendered only if
      //   1. Either there is a whitespace character before opening _ and after closing _.
      //   2. Or _ is at the start/end of the string.
      .replace(/(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, '$1$3$4$5')
      // Remove single-line code blocks (already handled multiline above in gfm section)
      .replace(/(`{3,})(.*?)\1/gm, '$2')
      // Remove inline code
      .replace(/`(.+?)`/g, '$1')
      // // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
      // .replace(/\n{2,}/g, '\n\n')
      // // Remove newlines in a paragraph
      // .replace(/(\S+)\n\s*(\S+)/g, '$1 $2')
      // Replace strike through
      .replace(/~(.*?)~/g, '$1');
  } catch(e) {
    if (options.throwError) throw e;

    console.error("remove-markdown encountered error: %s", e);
    return md;
  }
  return output;
};


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TocManager = void 0;
const vscode_1 = __webpack_require__(1);
const RegexStrings_1 = __webpack_require__(4);
const Utilities_1 = __webpack_require__(17);
class TocManager {
    constructor() {
        // this.configManager = configManager;
    }
    scanForTocRange() {
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            this.tocRange = new vscode_1.Range(0, 0, 0, 0);
            return;
        }
        let doc = editor.document;
        let start, end;
        for (let index = 0; index < doc.lineCount; index++) {
            if (Utilities_1.Utilities.isLineStartOrEndOfCodeBlock(index, doc)) {
                index = Utilities_1.Utilities.getNextLineIndexIsNotInCode(index, doc);
            }
            if (index >= doc.lineCount) {
                break;
            }
            let lineText = doc.lineAt(index).text;
            if (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_STOP)) {
                // A stop marker only closes a block that has been opened. A
                // stray <!-- /TOC --> above the real block used to end the scan
                // with no start, which dropped the update at the cursor instead.
                if (start !== undefined) {
                    end = new vscode_1.Position(index, lineText.length);
                    break;
                }
                continue;
            }
            if (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_START) && !lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_IGNORE_TITLE)) {
                // The LAST start marker before the stop marker wins. Keeping
                // the first one meant an unclosed <!-- TOC --> earlier in the
                // document - such as the two-line block suggested as a
                // workaround in #40 - swallowed everything down to the real
                // block's <!-- /TOC -->, deleting the headers in between.
                start = new vscode_1.Position(index, 0);
            }
        }
        if ((start === undefined) || (end === undefined)) {
            start = editor.selection.active;
            end = editor.selection.active;
        }
        this.tocRange = new vscode_1.Range(start, end);
    }
    /**
     * Get TOC range, in case of no TOC, return the active line
     * In case of the editor is not available, return the first line
    */
    getTocRange() {
        this.scanForTocRange();
        if (this.tocRange === undefined) {
            this.tocRange = new vscode_1.Range(0, 0, 0, 0);
        }
        return this.tocRange;
    }
    updateTocRange(contentChanges) {
        for (let index = 0; index < contentChanges.length; index++) {
            if (this.tocRange === undefined ||
                contentChanges[index].range.start.line === this.tocRange?.start.line ||
                contentChanges[index].range.end.line === this.tocRange?.end.line) {
                this.scanForTocRange();
            }
        }
    }
}
exports.TocManager = TocManager;


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Utilities = void 0;
const RegexStrings_1 = __webpack_require__(4);
class Utilities {
    /**
     * Find the first line after the code block that starts at `index`.
     * Returns `doc.lineCount` when the code block runs to the end of the
     * document (closing fence on the last line, or no closing fence at all),
     * so callers must range-check the result before passing it to `lineAt`.
     */
    static getNextLineIndexIsNotInCode(index, doc) {
        for (let currentLineIndex = index + 1; currentLineIndex < doc.lineCount; currentLineIndex++) {
            if (this.isLineStartOrEndOfCodeBlock(currentLineIndex, doc)) {
                return currentLineIndex + 1;
            }
        }
        return doc.lineCount;
    }
    static isLineStartOrEndOfCodeBlock(lineNumber, doc) {
        let nextLine = doc.lineAt(lineNumber).text;
        let isCodeStyle1 = nextLine.match(RegexStrings_1.RegexStrings.Instance.REGEXP_CODE_BLOCK1) !== null;
        let isCodeStyle2 = nextLine.match(RegexStrings_1.RegexStrings.Instance.REGEXP_CODE_BLOCK2) !== null;
        return isCodeStyle1 || isCodeStyle2;
    }
}
exports.Utilities = Utilities;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode_1 = __webpack_require__(1);
const AutoMarkdownToc_1 = __webpack_require__(2);
function activate(context) {
    // create a AutoMarkdownToc
    let autoMarkdownToc = new AutoMarkdownToc_1.AutoMarkdownToc();
    let updateMarkdownToc = vscode_1.commands.registerCommand('extension.updateMarkdownToc', async () => { await autoMarkdownToc.updateMarkdownToc(); });
    let deleteMarkdownToc = vscode_1.commands.registerCommand('extension.deleteMarkdownToc', () => { autoMarkdownToc.deleteMarkdownToc(); });
    let updateMarkdownSections = vscode_1.commands.registerCommand('extension.updateMarkdownSections', () => { autoMarkdownToc.updateMarkdownSections(); });
    let deleteMarkdownSections = vscode_1.commands.registerCommand('extension.deleteMarkdownSections', () => { autoMarkdownToc.deleteMarkdownSections(); });
    // Events
    let saveMarkdownToc = vscode_1.workspace.onDidSaveTextDocument(async () => {
        await autoMarkdownToc.onDidSaveTextDocument();
    });
    let changedTextDocument = vscode_1.workspace.onDidChangeTextDocument((event) => {
        autoMarkdownToc.onDidChangeTextDocument(event);
    });
    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(updateMarkdownToc);
    context.subscriptions.push(deleteMarkdownToc);
    context.subscriptions.push(updateMarkdownSections);
    context.subscriptions.push(deleteMarkdownSections);
    context.subscriptions.push(saveMarkdownToc);
    context.subscriptions.push(changedTextDocument);
}
// this method is called when your extension is deactivated
function deactivate() { }

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map