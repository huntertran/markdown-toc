import { Header } from "./models/Header";
import { ConfigManager } from "./ConfigManager";
import { window, DocumentSymbol, commands, Uri, TextEditor, SymbolKind } from "vscode";
import { RegexStrings } from "./models/RegexStrings";


export class HeaderManager {
    configManager: ConfigManager;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }
     
    private async getDocumentSymbols(fileUri: Uri) {                
        let allSymbols = <DocumentSymbol[]>await commands.executeCommand("vscode.executeDocumentSymbolProvider", fileUri);

        // Markdown headers can only be strings. Exclude all other symbols.
        // #60: With plantuml code blocks, the @startmindmap/@endmindmap sentinels
        // cause getDocumentSymbols to return Object kinds as well which results in empty TOCs
        return allSymbols.filter(function(sym){
            return sym.kind === SymbolKind.String;
        });
    }

    public async getHeaderList() {
        let headerList: Header[] = [];
        let editor = window.activeTextEditor;

        if (editor !== undefined) {

            let fileUri = Uri.file(editor.document.fileName);
           
            let symbols = await this.getDocumentSymbols(fileUri);            

            let headerLevels = new Map<number, number>();
            let allHeaders = new Array<Header>();

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

    private getIsHeaderIgnored(header: Header, editor: TextEditor) {
        let previousLine = header.range.start.line - 1;
        if (previousLine > 0) {
            if (editor.document.lineAt(previousLine).text.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE)) {
                return true;
            }
        }

        return false;
    }

    private getMostPopularHeaderDepth(headerLevels: Map<number, number>) {
        let mostPopularHeaderDepth = 0;
        let mostPopularHeaderDepthCount = 0;

        headerLevels.forEach((value: number, key: number) => {
            if (value >= mostPopularHeaderDepth) {
                mostPopularHeaderDepthCount = value;
                mostPopularHeaderDepth = key;
            }
        });

        return mostPopularHeaderDepth;
    }

    private convertAllFirstLevelHeader(symbols: DocumentSymbol[], allHeaders: Header[], headerLevels: Map<number, number>) {
        for (let index = 0; index < symbols.length; index++) {            
            let header = new Header(this.configManager.options.ANCHOR_MODE.value);
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

    private addHeaderChildren(symbol: DocumentSymbol, headerList: Header[], editor: TextEditor) {
        if (symbol.children.length > 0) {
            for (let index = 0; index < symbol.children.length; index++) {

                let header = new Header(this.configManager.options.ANCHOR_MODE.value);

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

    private detectAutoOrderedHeader(headerList: Header[]) {

        this.configManager.options.isOrderedListDetected = false;

        for (let index = 0; index < headerList.length; index++) {
            if (headerList[index].orderedListString !== undefined && headerList[index].orderedListString !== '') {
                this.configManager.options.isOrderedListDetected = true;
                break;
            }
        }
    }

    public calculateHeaderOrder(headerBeforePushToList: Header, headerList: Header[]) {

        if (headerList.length === 0) {
            // special case: First header
            let orderArray = new Array(headerBeforePushToList.depth);
            orderArray[headerBeforePushToList.depth - 1] = 1;
            return orderArray;
        }

        let lastHeaderInList = headerList[headerList.length - 1];

        if (headerBeforePushToList.depth < lastHeaderInList.depth) {
            // continue of the parent level

            let previousHeader: Header | undefined;

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
            } else {
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