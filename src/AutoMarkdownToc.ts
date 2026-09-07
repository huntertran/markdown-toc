import {
    window,
    Position,
    Range,
    TextEditorEdit,
    TextDocument,
    TextDocumentChangeEvent
} from 'vscode';

import { Header } from "./models/Header";
import { ConfigManager } from './ConfigManager';
import { HeaderManager } from './HeaderManager';
import { AnchorMode } from './models/AnchorMode';
import { RegexStrings } from './models/RegexStrings';
import { TocManager } from './TocManager';

interface TocInsertOptions {
    // Numbered TOC rows ("1.1. Title"), either because orderedList is on or
    // because the document already numbers its headers.
    useOrderedToc: boolean;

    // Line endings that keep a freshly inserted TOC off the text around the
    // cursor. Empty when an existing TOC block is being replaced.
    prefix: string;
    suffix: string;
}

export class AutoMarkdownToc {

    configManager = new ConfigManager();
    headerManager = new HeaderManager(this.configManager);
    tocManager = new TocManager();

    public onDidChangeTextDocument(event: TextDocumentChangeEvent) {
        if (event.contentChanges.length > 0) {
            this.tocManager.updateTocRange(event.contentChanges);
        }
    }

    public async onDidSaveTextDocument() {
        // Prevent save loop
        if (this.configManager.options.isProgrammaticallySave) {
            this.configManager.options.isProgrammaticallySave = false;
            return;
        }

        let editor = window.activeTextEditor;
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

    public async updateMarkdownToc() {
        let autoMarkdownToc = this;
        let editor = window.activeTextEditor;

        if (editor === undefined) {
            return;
        }

        let activeEditor = editor;

        autoMarkdownToc.configManager.updateOptions();
        let headerList = await autoMarkdownToc.headerManager.getHeaderList();

        if (headerList.length === 0) {
            window.showWarningMessage("Auto Markdown TOC: no headers detected. TOC was not modified.");
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

            autoMarkdownToc.createToc(
                editBuilder,
                headerList,
                tocRange.start,
                autoMarkdownToc.getTocInsertOptions(tocRange, activeEditor.document));

            autoMarkdownToc.insertAnchors(editBuilder, headerList);
        });
    }

    /**
     * True when the document numbers its headers and the user has left
     * detectAndAutoSetSection on. Only meaningful after getHeaderList() has run,
     * which is what sets isOrderedListDetected.
     */
    private isAutoSetSectionEnabled(): boolean {
        return this.configManager.options.DETECT_AUTO_SET_SECTION.value === true
            && this.configManager.options.isOrderedListDetected;
    }

    /**
     * A TOC replacing an existing block needs no padding: the block it replaces
     * already sits on its own lines. A TOC inserted at the cursor does, or it
     * ends up glued to whatever shares that line.
     */
    private getTocInsertOptions(tocRange: Range, document: TextDocument): TocInsertOptions {
        let options: TocInsertOptions = {
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

    public deleteMarkdownToc() {
        let autoMarkdownToc = this;
        let editor = window.activeTextEditor;

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

    public updateHeadersWithSections(editBuilder: TextEditorEdit, headerList: Header[], document: TextDocument, insertSpacing: boolean = true) {
        headerList.forEach(header => {

            // The Sections command separates a header from the text above it.
            // A TOC update must not reflow the document, so it opts out.
            if (insertSpacing && header.range.start.line !== 0 && !document.lineAt(header.range.start.line - 1).isEmptyOrWhitespace) {
                editBuilder.insert(new Position(header.range.start.line, 0), this.configManager.options.lineEnding);
            }

            // Writing sections always means writing the numbers. Gating this on
            // orderedList turned "Sections: Insert/Update" into a delete
            // whenever that option was off; removal has its own command,
            // deleteMarkdownSections.
            editBuilder.replace(header.range, header.fullHeaderWithOrder);
        });
    }

    public async updateMarkdownSections() {
        this.configManager.updateOptions();

        let headerList = await this.headerManager.getHeaderList();
        let editor = window.activeTextEditor;
        let config = this.configManager;

        if (editor !== undefined) {
            config.options.isOrderedListDetected = true;
            let document = editor.document;
            editor.edit(editBuilder => {
                this.updateHeadersWithSections(editBuilder, headerList, document);
            });
        }
    }

    public async deleteMarkdownSections() {
        this.configManager.updateOptions();
        let headerList = await this.headerManager.getHeaderList();
        let editor = window.activeTextEditor;
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
     * insert anchor for a header
     * @param editBuilder
     * @param header
     */
    private insertAnchor(editBuilder: TextEditorEdit, header: Header) {
        let anchorMatches = header.tocRowWithAnchor(header.tocWithoutOrder).match(RegexStrings.Instance.REGEXP_ANCHOR);
        if (anchorMatches !== null) {
            // let name = anchorMatches[1];
            let text = [
                this.configManager.options.lineEnding,
                '<a id="',
                header.anchor.id,
                '" name="',
                header.anchor.name,
                '"></a>'];

            let insertPosition = new Position(header.range.end.line, header.range.end.character);

            if (this.configManager.options.ANCHOR_MODE.value === AnchorMode.bitbucket) {
                text = text.slice(1);
                text.push(this.configManager.options.lineEnding);
                text.push(this.configManager.options.lineEnding);
                insertPosition = new Position(header.range.start.line, 0);
            }

            editBuilder.insert(insertPosition, text.join(''));
        }
    }

    private insertAnchors(editBuilder: TextEditorEdit, headerList: Header[]) {
        if (!this.configManager.options.INSERT_ANCHOR.value) {
            return;
        }

        headerList.forEach(header => {
            this.insertAnchor(editBuilder, header);
        });
    }

    private deleteAnchors(editBuilder: TextEditorEdit) {
        let editor = window.activeTextEditor;
        if (editor !== undefined) {
            let doc = editor.document;
            for (let index = 0; index < doc.lineCount; index++) {
                let lineText = doc.lineAt(index).text;
                if (lineText.match(RegexStrings.Instance.REGEXP_MARKDOWN_ANCHOR) === null) {
                    continue;
                }

                let startPosition = this.getStartPositionOfAnchorLine(index, doc);

                let range = new Range(startPosition, new Position(startPosition.line + 1, 0));
                editBuilder.delete(range);
            }
        }
    }

    private getStartPositionOfAnchorLine(index: number, doc: TextDocument) {
        // To ensure the anchor will not insert an extra empty line
        let startPosition = new Position(index, 0);

        if (this.configManager.options.ANCHOR_MODE.value === AnchorMode.bitbucket) {
            if (index > 0 && doc.lineAt(index - 1).text.length === 0) {
                startPosition = new Position(index - 2, 0);
            }
        }

        return startPosition;
    }

    private createToc(editBuilder: TextEditorEdit, headerList: Header[], insertPosition: Position, options: TocInsertOptions) {

        let text: string[] = [];

        //// TOC STAT: the custom option IS inside the toc start.
        text = text.concat(this.generateTocStartIndicator());

        //// HEADERS
        let minimumRenderedDepth = headerList[0].depth;
        headerList.forEach(header => {
            minimumRenderedDepth = Math.min(minimumRenderedDepth, header.depth);
        });

        let tocRows: string[] = [];

        headerList.forEach(header => {
            if (header.depth >= this.configManager.options.DEPTH_FROM.value && !header.isIgnored) {
                let row = this.generateTocRow(header, minimumRenderedDepth, options.useOrderedToc);
                tocRows.push(row);
            }
        });

        text.push(tocRows.join(this.configManager.options.lineEnding));

        //// TOC END
        text.push(this.configManager.options.lineEnding + "<!-- /TOC -->");

        // insert
        editBuilder.insert(insertPosition, options.prefix + text.join(this.configManager.options.lineEnding) + options.suffix);
    }

    private generateTocRow(header: Header, minimumRenderedDepth: number, useOrderedToc: boolean) {
        let row: string[] = [];

        // Indentation
        let indentRepeatTime = header.depth - Math.max(this.configManager.options.DEPTH_FROM.value, minimumRenderedDepth);
        row.push(this.configManager.options.tab.repeat(indentRepeatTime));

        row.push(this.configManager.options.BULLET_CHAR.value);

        row.push(' ');

        // TOC with or without link and order
        if (this.configManager.options.WITH_LINKS.value) {
            row.push(header.tocRowWithAnchor(this.getTocString(header, useOrderedToc)));
        } else {
            row.push(this.getTocString(header, useOrderedToc));
        }

        return row.join('');
    }

    private getTocString(header: Header, useOrderedToc: boolean) {
        if (useOrderedToc) {
            return header.tocWithOrder;
        } else {
            return header.tocWithoutOrder;
        }
    }

    private generateTocStartIndicator() {
        let tocStartIndicator: string[] = [];

        tocStartIndicator.push('<!-- TOC ');

        this.generateCustomOptionsInTocStart(tocStartIndicator);

        tocStartIndicator.push('-->' + this.configManager.options.lineEnding);

        return tocStartIndicator.join('');
    }

    private generateCustomOptionsInTocStart(tocStartIndicator: string[]) {
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