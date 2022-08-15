/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AutoMarkdownToc = void 0;
const vscode_1 = __webpack_require__(1);
const ConfigManager_1 = __webpack_require__(3);
const HeaderManager_1 = __webpack_require__(9);
const AnchorMode_1 = __webpack_require__(7);
const RegexStrings_1 = __webpack_require__(4);
const Utilities_1 = __webpack_require__(14);
class AutoMarkdownToc {
    constructor() {
        this.configManager = new ConfigManager_1.ConfigManager();
        this.headerManager = new HeaderManager_1.HeaderManager(this.configManager);
    }
    onDidSaveTextDocument() {
        if (!this.configManager.options.UPDATE_ON_SAVE.value) {
            return;
        }
        // Prevent save loop
        if (this.configManager.options.isProgrammaticallySave) {
            this.configManager.options.isProgrammaticallySave = false;
            return;
        }
        let editor = vscode_1.window.activeTextEditor;
        if (editor !== undefined) {
            let doc = editor.document;
            if (doc.languageId !== 'markdown') {
                return;
            }
            let tocRange = this.getTocRange();
            if (!tocRange.isSingleLine) {
                this.updateMarkdownToc();
                this.configManager.options.isProgrammaticallySave = true;
                doc.save();
            }
        }
    }
    async updateMarkdownToc() {
        let autoMarkdownToc = this;
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        autoMarkdownToc.configManager.updateOptions();
        let tocRange = autoMarkdownToc.getTocRange();
        let headerList = await autoMarkdownToc.headerManager.getHeaderList();
        let document = editor.document;
        editor.edit(async (editBuilder) => {
            if (!tocRange.isSingleLine) {
                editBuilder.delete(tocRange);
                autoMarkdownToc.deleteAnchors(editBuilder);
            }
            // TODO: need to go back to this
            // if (this.configManager.options.DETECT_AUTO_SET_SECTION.value) { // } && this.configManager.options.isOrderedListDetected) {
            //     autoMarkdownToc.updateHeadersWithSections(editBuilder, headerList, document);
            //     //rebuild header list, because headers have changed
            //     headerList = await autoMarkdownToc.headerManager.getHeaderList();
            // }
            autoMarkdownToc.createToc(editBuilder, headerList, tocRange.start);
            autoMarkdownToc.insertAnchors(editBuilder, headerList);
        });
    }
    deleteMarkdownToc() {
        let autoMarkdownToc = this;
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        editor.edit(function (editBuilder) {
            let tocRange = autoMarkdownToc.getTocRange();
            if (tocRange.isSingleLine) {
                return;
            }
            editBuilder.delete(tocRange);
            autoMarkdownToc.deleteAnchors(editBuilder);
        });
    }
    updateHeadersWithSections(editBuilder, headerList, document) {
        headerList.forEach(header => {
            if (header.range.start.line !== 0 && !document.lineAt(header.range.start.line - 1).isEmptyOrWhitespace) {
                editBuilder.insert(new vscode_1.Position(header.range.start.line, 0), this.configManager.options.lineEnding);
            }
            if (this.configManager.options.ORDERED_LIST.value) {
                editBuilder.replace(header.range, header.fullHeaderWithOrder);
            }
            else {
                editBuilder.replace(header.range, header.fullHeaderWithoutOrder);
            }
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
     * Get TOC range, in case of no TOC, return the active line
     * In case of the editor is not available, return the first line
     */
    getTocRange() {
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return new vscode_1.Range(0, 0, 0, 0);
        }
        let doc = editor.document;
        let start, end;
        for (let index = 0; index < doc.lineCount; index++) {
            if (Utilities_1.Utilities.isLineStartOrEndOfCodeBlock(index, doc)) {
                index = Utilities_1.Utilities.getNextLineIndexIsNotInCode(index, doc);
            }
            let lineText = doc.lineAt(index).text;
            if ((start === undefined) && (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_START) && !lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_IGNORE_TITLE))) {
                start = new vscode_1.Position(index, 0);
            }
            else if (lineText.match(RegexStrings_1.RegexStrings.Instance.REGEXP_TOC_STOP)) {
                end = new vscode_1.Position(index, lineText.length);
                break;
            }
        }
        if ((start === undefined) || (end === undefined)) {
            if (start !== undefined) {
                end = start;
            }
            else if (end !== undefined) {
                start = end;
            }
            else {
                start = editor.selection.active;
                end = editor.selection.active;
            }
        }
        // at this point, end will not undefined,
        // but we add declaration here for passing typescript lint
        if (end === undefined) {
            return new vscode_1.Range(start, new vscode_1.Position(0, 0));
        }
        return new vscode_1.Range(start, end);
    }
    /**
     * insert anchor for a header
     * @param editBuilder
     * @param header
     */
    insertAnchor(editBuilder, header) {
        let anchorMatches = header.tocRowWithAnchor(header.tocWithoutOrder).match(RegexStrings_1.RegexStrings.Instance.REGEXP_ANCHOR);
        if (anchorMatches !== null) {
            // let name = anchorMatches[1];
            let text = [
                this.configManager.options.lineEnding,
                '<a id="',
                header.anchor.id,
                '" name="',
                header.anchor.name,
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
    }
    insertAnchors(editBuilder, headerList) {
        if (!this.configManager.options.INSERT_ANCHOR.value) {
            return;
        }
        headerList.forEach(header => {
            this.insertAnchor(editBuilder, header);
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
    createToc(editBuilder, headerList, insertPosition) {
        let text = [];
        //// TOC STAT: the custom option IS inside the toc start.
        text = text.concat(this.generateTocStartIndicator());
        //// HEADERS
        let minimumRenderedDepth = headerList[0].depth;
        headerList.forEach(header => {
            minimumRenderedDepth = Math.min(minimumRenderedDepth, header.depth);
        });
        let tocRows = [];
        headerList.forEach(header => {
            if (header.depth >= this.configManager.options.DEPTH_FROM.value && !header.isIgnored) {
                let row = this.generateTocRow(header, minimumRenderedDepth);
                tocRows.push(row);
            }
        });
        text.push(tocRows.join(this.configManager.options.lineEnding));
        //// TOC END
        text.push(this.configManager.options.lineEnding + "<!-- /TOC -->");
        // insert
        editBuilder.insert(insertPosition, text.join(this.configManager.options.lineEnding));
    }
    generateTocRow(header, minimumRenderedDepth) {
        let row = [];
        // Indentation
        let indentRepeatTime = header.depth - Math.max(this.configManager.options.DEPTH_FROM.value, minimumRenderedDepth);
        row.push(this.configManager.options.tab.repeat(indentRepeatTime));
        row.push(this.configManager.options.BULLET_CHAR.value);
        row.push(' ');
        // TOC with or without link and order
        if (this.configManager.options.WITH_LINKS.value) {
            row.push(header.tocRowWithAnchor(this.getTocString(header)));
        }
        else {
            row.push(this.getTocString(header));
        }
        return row.join('');
    }
    getTocString(header) {
        if (this.configManager.options.ORDERED_LIST.value) {
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
        this.options.BULLET_CHAR.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.BULLET_CHAR.key);
        this.options.DETECT_AUTO_SET_SECTION.workspaceValue = vscode_1.workspace.getConfiguration(this.options.extensionName).get(this.options.DETECT_AUTO_SET_SECTION.key);
        this.options.lineEnding = vscode_1.workspace.getConfiguration("files", null).get("eol");
        if (this.options.lineEnding === 'auto') {
            this.options.lineEnding = this.options.EOL;
        }
        this.options.tabSize = vscode_1.workspace.getConfiguration("[markdown]", null)["editor.tabSize"];
        if (this.options.tabSize === undefined || this.options.tabSize === null) {
            this.options.tabSize = vscode_1.workspace.getConfiguration("editor", null).get("tabSize");
        }
        this.options.insertSpaces = vscode_1.workspace.getConfiguration("[markdown]", null)["editor.insertSpaces"];
        if (this.options.insertSpaces === undefined || this.options.insertSpaces === null) {
            this.options.insertSpaces = vscode_1.workspace.getConfiguration("editor", null).get("insertSpaces");
        }
        if (this.options.insertSpaces && this.options.tabSize > 0) {
            this.options.tab = " ".repeat(this.options.tabSize);
        }
        if (vscode_1.workspace.getConfiguration("files", null).get("autoSave") !== "off") {
            this.options.autoSave = true;
        }
    }
    /**
     * DEPRECATED
     * use single line unique options instead
     */
    loadCustomOptions() {
        this.options.optionsFlag = [];
        let editor = vscode_1.window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        for (let index = 0; index < editor.document.lineCount; index++) {
            let lineText = editor.document.lineAt(index).text;
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
                                case this.options.BULLET_CHAR.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.BULLET_CHAR.uniqueValue = value;
                                    break;
                                case this.options.DETECT_AUTO_SET_SECTION.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DETECT_AUTO_SET_SECTION.uniqueValue = value;
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


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RegexStrings = void 0;
class RegexStrings {
    constructor() {
        this.REGEXP_TOC_START = /\s*<!--(.*)[^\/]TOC(.*)-->/gi;
        this.REGEXP_TOC_STOP = /\s*<!--(.*)\/TOC(.*)-->/gi;
        this.REGEXP_TOC_CONFIG = /\w+[:=][^\s]+/gi;
        this.REGEXP_TOC_CONFIG_ITEM = /(\w+)[:=]([^\s]+)/;
        this.REGEXP_MARKDOWN_ANCHOR = /^<a id="markdown-.+" name=".+"><\/a\>/;
        this.REGEXP_CODE_BLOCK1 = /^\s?```/;
        this.REGEXP_CODE_BLOCK2 = /^\s?~~~/;
        this.REGEXP_ANCHOR = /\[.+\]\(#(.+)\)/;
        this.REGEXP_IGNORE_TITLE = /<!-- TOC ignore:true -->/;
        this.REGEXP_HEADER_META = /^(\#*)\s*((\d*\.?)*)\s*(.+)/;
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
        this.BULLET_CHAR = new Dictionary_1.Dictionary("bulletCharacter", "-");
        this.DETECT_AUTO_SET_SECTION = new Dictionary_1.Dictionary("detectAndAutoSetSection", false);
        this.extensionName = "markdown-toc";
        this.EOL = (__webpack_require__(8).EOL);
        // language configuration
        this.lineEnding = "";
        this.tabSize = 2;
        this.insertSpaces = false;
        this.autoSave = false;
        // special characters
        this.tab = '\t';
    }
}
exports.Options = Options;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports) => {


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


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AnchorMode = void 0;
var AnchorMode;
(function (AnchorMode) {
    AnchorMode["github"] = "github.com";
    AnchorMode["bitbucket"] = "bitbucket.org";
    AnchorMode["ghost"] = "ghost.org";
    AnchorMode["gitlab"] = "gitlab.com";
})(AnchorMode = exports.AnchorMode || (exports.AnchorMode = {}));


/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("os");

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


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
        return await vscode_1.commands.executeCommand("vscode.executeDocumentSymbolProvider", fileUri);
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
                header.orderedListString = header.orderArray.join('.') + ".";
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
        if (previousLine > 0) {
            if (editor.document.lineAt(previousLine).text.match(RegexStrings_1.RegexStrings.Instance.REGEXP_IGNORE_TITLE)) {
                return true;
            }
        }
        return false;
    }
    getMostPopularHeaderDepth(headerLevels) {
        let mostPopularHeaderDepth = 0;
        let mostPopularHeaderDepthCount = 0;
        headerLevels.forEach((value, key) => {
            if (value >= mostPopularHeaderDepth) {
                mostPopularHeaderDepthCount = value;
                mostPopularHeaderDepth = key;
            }
        });
        return mostPopularHeaderDepth;
    }
    convertAllFirstLevelHeader(symbols, allHeaders, headerLevels) {
        for (let index = 0; index < symbols.length; index++) {
            let header = new Header_1.Header(this.configManager.options.ANCHOR_MODE.value);
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
                let header = new Header_1.Header(this.configManager.options.ANCHOR_MODE.value);
                header.convertFromSymbol(symbol.children[index]);
                header.isIgnored = this.getIsHeaderIgnored(header, editor);
                header.orderArray = this.calculateHeaderOrder(header, headerList);
                header.orderedListString = header.orderArray.join('.') + ".";
                if (header.depth <= this.configManager.options.DEPTH_TO.value) {
                    headerList.push(header);
                    this.addHeaderChildren(symbol.children[index], headerList, editor);
                }
            }
        }
    }
    detectAutoOrderedHeader(headerList) {
        this.configManager.options.isOrderedListDetected = false;
        for (let index = 0; index < headerList.length; index++) {
            if (headerList[index].orderedListString !== undefined && headerList[index].orderedListString !== '') {
                this.configManager.options.isOrderedListDetected = true;
                break;
            }
        }
    }
    calculateHeaderOrder(headerBeforePushToList, headerList) {
        if (headerList.length === 0) {
            // special case: First header
            let orderArray = new Array(headerBeforePushToList.depth);
            orderArray[headerBeforePushToList.depth - 1] = 1;
            return orderArray;
        }
        let lastHeaderInList = headerList[headerList.length - 1];
        if (headerBeforePushToList.depth < lastHeaderInList.depth) {
            // continue of the parent level
            let previousHeader;
            for (let index = headerList.length - 1; index >= 0; index--) {
                if (headerList[index].depth === headerBeforePushToList.depth) {
                    previousHeader = headerList[index];
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
                let orderArray = new Array(headerBeforePushToList.depth);
                orderArray[headerBeforePushToList.depth - 1] = 1;
                return orderArray;
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


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Header = void 0;
const vscode_1 = __webpack_require__(1);
const AnchorMode_1 = __webpack_require__(7);
const Anchor_1 = __webpack_require__(11);
const RegexStrings_1 = __webpack_require__(4);
class Header {
    constructor(anchorMode) {
        this.headerMark = "";
        this.orderedListString = "";
        this.dirtyTitle = "";
        this.isIgnored = false;
        this.orderArray = [];
        this.anchorMode = AnchorMode_1.AnchorMode.github;
        this.anchorMode = anchorMode;
        this.range = new vscode_1.Range(0, 0, 0, 0);
        this.anchor = new Anchor_1.Anchor("");
    }
    convertFromSymbol(symbol) {
        let headerTextSplit = symbol.name.match(RegexStrings_1.RegexStrings.Instance.REGEXP_HEADER_META);
        if (headerTextSplit !== null) {
            this.headerMark = headerTextSplit[1];
            this.orderedListString = headerTextSplit[2];
            this.dirtyTitle = headerTextSplit[4];
        }
        this.range = new vscode_1.Range(symbol.range.start, new vscode_1.Position(symbol.range.start.line, symbol.name.length));
        this.anchor = new Anchor_1.Anchor(this.cleanUpTitle(this.dirtyTitle));
    }
    get depth() {
        return this.headerMark.length;
    }
    get isHeader() {
        return this.headerMark !== "";
    }
    tocRowWithAnchor(tocString) {
        let title = this.cleanUpTitle(tocString);
        let ANCHOR_MARKDOWN_HEADER = __webpack_require__(12);
        return ANCHOR_MARKDOWN_HEADER(title, this.anchorMode);
    }
    get tocWithoutOrder() {
        return this.dirtyTitle;
    }
    get tocWithOrder() {
        return this.orderArray.join('.') + ". " + this.tocWithoutOrder;
    }
    get fullHeaderWithOrder() {
        return this.headerMark + " " + this.tocWithOrder;
    }
    get fullHeaderWithoutOrder() {
        return this.headerMark + " " + this.tocWithoutOrder;
    }
    cleanUpTitle(dirtyTitle) {
        let title = dirtyTitle.replace(/\[(.+)]\([^)]*\)/gi, "$1"); // replace link
        title = title.replace(/<!--.+-->/gi, ""); // replace comment
        title = title.replace(/\#*`|\(|\)/gi, "").trim(); // replace special char
        return title;
    }
}
exports.Header = Header;


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Anchor = void 0;
class Anchor {
    constructor(headerText) {
        this.id = "";
        this.name = "";
        headerText = headerText.toLowerCase().replace(/\s/gi, "-");
        this.id = "markdown-" + encodeURIComponent(headerText);
        this.name = encodeURIComponent(headerText);
    }
}
exports.Anchor = Anchor;


/***/ }),
/* 12 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var emojiRegex = __webpack_require__(13);

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
    .replace(/[\/?!:\[\]`.,()*"';{}+=<>~\$|#@&–—]/g,'')
    // CJK punctuations that are removed
    .replace(/[。？！，、；：“”【】（）〔〕［］﹃﹄“ ”‘’﹁﹂—…－～《》〈〉「」]/g, '')
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

function getGhostId(text) {
  text = basicGhostId(text);

  // Repetitions not supported

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
 * @param moduleName  {String} The name of the module of the given header (required only for 'nodejs.org' mode).
 * @return            {String} The header anchor that is compatible with the given mode.
 */
module.exports = function anchorMarkdownHeader(header, mode, repetition, moduleName) {
  mode = mode || 'github.com';
  var replace;

  switch(mode) {
    case 'github.com':
      replace = getGithubId;
      break;
    case 'bitbucket.org':
      replace = getBitbucketId;
      break;
    case 'gitlab.com':
      replace = getGitlabId;
      break;
    case 'nodejs.org':
      if (!moduleName) throw new Error('Need module name to generate proper anchor for ' + mode);
      replace = function (hd, repetition) {
          return getNodejsId(moduleName + '.' + hd, repetition);
      };
      break;
    case 'ghost.org':
      replace = getGhostId;
      break;
    default:
      throw new Error('Unknown mode: ' + mode);
  }

  var href = replace(header.trim().toLowerCase(), repetition);

  return '[' + header + '](#' + encodeURI(href) + ')';
};


/***/ }),
/* 13 */
/***/ ((module) => {



module.exports = function () {
	// https://mathiasbynens.be/notes/es-unicode-property-escapes#emoji
	return (/(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC69\uDC6E\uDC70-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD26\uDD30-\uDD39\uDD3D\uDD3E\uDDD1-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])?|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDEEB\uDEEC\uDEF4-\uDEF8]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4C\uDD50-\uDD6B\uDD80-\uDD97\uDDC0\uDDD0-\uDDE6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEF8]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4C\uDD50-\uDD6B\uDD80-\uDD97\uDDC0\uDDD0-\uDDE6])\uFE0F/g
	);
};

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Utilities = void 0;
const RegexStrings_1 = __webpack_require__(4);
class Utilities {
    static getNextLineIndexIsNotInCode(index, doc) {
        for (let currentLineIndex = index + 1; currentLineIndex < doc.lineCount; currentLineIndex++) {
            if (this.isLineStartOrEndOfCodeBlock(currentLineIndex, doc)) {
                return currentLineIndex + 1;
            }
        }
        return doc.lineCount - 1;
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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
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
    let saveMarkdownToc = vscode_1.workspace.onDidSaveTextDocument(() => { autoMarkdownToc.onDidSaveTextDocument(); });
    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(updateMarkdownToc);
    context.subscriptions.push(deleteMarkdownToc);
    context.subscriptions.push(updateMarkdownSections);
    context.subscriptions.push(deleteMarkdownSections);
    context.subscriptions.push(saveMarkdownToc);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map