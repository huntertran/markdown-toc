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

            if (index >= doc.lineCount) {
                break;
            }

            let lineText = doc.lineAt(index).text;

            if (lineText.match(RegexStrings.Instance.REGEXP_TOC_STOP)) {
                // A stop marker only closes a block that has been opened. A
                // stray <!-- /TOC --> above the real block used to end the scan
                // with no start, which dropped the update at the cursor instead.
                if (start !== undefined) {
                    end = new Position(index, lineText.length);
                    break;
                }

                continue;
            }

            if (lineText.match(RegexStrings.Instance.REGEXP_TOC_START) && !lineText.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE)) {
                // The LAST start marker before the stop marker wins. Keeping
                // the first one meant an unclosed <!-- TOC --> earlier in the
                // document - such as the two-line block suggested as a
                // workaround in #40 - swallowed everything down to the real
                // block's <!-- /TOC -->, deleting the headers in between.
                start = new Position(index, 0);
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
