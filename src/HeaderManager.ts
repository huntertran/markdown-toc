import { Header } from "./models/Header";
import { ConfigManager } from "./ConfigManager";
import { window, DocumentSymbol, commands, Uri } from "vscode";


export class HeaderManager {
    configManager: ConfigManager;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }

    // public getHeader(lineText: string) {
    //     let header = new Header(this.configManager.options.ANCHOR_MODE.value);

    //     let headerTextSplit = lineText.match(RegexStrings.Instance.REGEXP_HEADER_META);

    //     if (headerTextSplit !== null) {
    //         header.headerMark = headerTextSplit[1];
    //         header.orderedListString = headerTextSplit[2];
    //         header.dirtyTitle = headerTextSplit[4];
    //     }

    //     return header;
    // }

    public async GetDocumentSymbols(fileUri: Uri) {
        return <DocumentSymbol[]>await commands.executeCommand("vscode.executeDocumentSymbolProvider", fileUri);
    }

    public async getHeaderList() {
        let headerList: Header[] = [];
        let editor = window.activeTextEditor;

        if (editor !== undefined) {

            let fileUri = Uri.file(editor.document.fileName);

            let symbols = await this.GetDocumentSymbols(fileUri);

            for (let index = 0; index < symbols.length; index++) {

                let header = new Header(this.configManager.options.ANCHOR_MODE.value);

                header.convertFromSymbol(symbols[index]);

                // only level 1
                if (header.depth > 1) {
                    continue;
                }

                header.orderArray = this.calculateHeaderOrder(header, headerList);
                header.orderedListString = header.orderArray.join('.') + ".";

                if (header.depth <= this.configManager.options.DEPTH_TO.value) {
                    headerList.push(header);
                    this.addHeaderChildren(symbols[index], headerList);
                }
            }

            // let doc = editor.document;

            // for (let index = 0; index < doc.lineCount; index++) {
            //     index = this.getNextLineIndexIsNotInCode(index, doc);

            //     if (index === doc.lineCount) {
            //         break;
            //     }

            //     let lineText = doc.lineAt(index).text;

            //     if (RegexStrings.Instance.REGEXP_IGNORE_TITLE.test(lineText)) {
            //         index += 1;
            //         continue;
            //     }

            //     let header = this.getHeader(lineText);

            //     if (header.isHeader) {
            //         header.orderArray = this.calculateHeaderOrder(header, headerList);
            //         header.orderedListString = header.orderArray.join('.') + ".";
            //         header.range = new Range(index, 0, index, lineText.length);
            //         header.anchor = new Anchor(header.dirtyTitle);

            //         if (header.depth <= this.configManager.options.DEPTH_TO.value) {
            //             headerList.push(header);
            //         }
            //     }
            // }

            // violation of clean code
            this.detectAutoOrderedHeader(headerList);
        }

        return headerList;
    }

    private addHeaderChildren(symbol: DocumentSymbol, headerList: Header[]){
        if(symbol.children.length > 0){
            for (let index = 0; index < symbol.children.length; index++) {

                let header = new Header(this.configManager.options.ANCHOR_MODE.value);

                header.convertFromSymbol(symbol.children[index]);

                header.orderArray = this.calculateHeaderOrder(header, headerList);
                header.orderedListString = header.orderArray.join('.') + ".";

                if (header.depth <= this.configManager.options.DEPTH_TO.value) {
                    headerList.push(header);
                    this.addHeaderChildren(symbol.children[index], headerList);
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

    // public getNextLineIndexIsNotInCode(index: number, doc: TextDocument) {

    //     if (this.isLineStartOrEndOfCodeBlock(index, doc) && index < doc.lineCount - 1) {
    //         index = index + 1;

    //         while (this.isLineStartOrEndOfCodeBlock(index, doc) === false && index < doc.lineCount - 1) {
    //             let lineLeft = doc.lineCount - index;

    //             for (let i = 1; i < lineLeft && this.isLineStartOrEndOfCodeBlock(index, doc) === false; i++) {
    //                 index = index + i;
    //             }
    //         }
    //     }

    //     return index;
    // }

    // private isLineStartOrEndOfCodeBlock(lineNumber: number, doc: TextDocument) {
    //     let nextLine = doc.lineAt(lineNumber).text;

    //     let isCodeStyle1 = nextLine.match(RegexStrings.Instance.REGEXP_CODE_BLOCK1) !== null;
    //     let isCodeStyle2 = nextLine.match(RegexStrings.Instance.REGEXP_CODE_BLOCK2) !== null;

    //     return isCodeStyle1 || isCodeStyle2;
    // }

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

            let previousHeader = undefined;

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