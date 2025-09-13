import {
    Position,
    Range,
    TextDocumentContentChangeEvent,
    window
} from "vscode";

import { RegexStrings } from "./models/RegexStrings";
import { Utilities } from "./Utilities";

export class TocManager {
    // private configManager: ConfigManager;

    private tocRange: Range | undefined;

    constructor() {
        // this.configManager = configManager;
    }

    private scanForTocRange(): void {
        let editor = window.activeTextEditor;

        if (editor === undefined) {
            this.tocRange = new Range(0, 0, 0, 0);
            return;
        }

        let doc = editor.document;
        let start, end: Position | undefined;

        for (let index = 0; index < doc.lineCount; index++) {

            if (Utilities.isLineStartOrEndOfCodeBlock(index, doc)) {
                index = Utilities.getNextLineIndexIsNotInCode(index, doc);
            }

            let lineText = doc.lineAt(index).text;

            if ((start === undefined) && (lineText.match(RegexStrings.Instance.REGEXP_TOC_START) && !lineText.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE))) {
                start = new Position(index, 0);
            }
            else if (lineText.match(RegexStrings.Instance.REGEXP_TOC_STOP)) {
                end = new Position(index, lineText.length);
                break;
            }
        }

        if ((start === undefined) || (end === undefined)) {
            start = editor.selection.active;
            end = editor.selection.active;
        }

        this.tocRange = new Range(start, end);
    }

    /**
     * Get TOC range, in case of no TOC, return the active line
     * In case of the editor is not available, return the first line
    */
    public getTocRange(): Range {
        this.scanForTocRange();

        if (this.tocRange === undefined) {
            this.tocRange = new Range(0, 0, 0, 0);
        }

        return this.tocRange;
    }

    public updateTocRange(contentChanges: readonly TextDocumentContentChangeEvent[]): void {
        for (let index = 0; index < contentChanges.length; index++) {
            if (this.tocRange === undefined ||
                contentChanges[index].range.start.line === this.tocRange?.start.line ||
                contentChanges[index].range.end.line === this.tocRange?.end.line) {
                this.scanForTocRange();
            }
        }
    }
}