import { TextDocument } from "vscode";
import { RegexStrings } from "./models/RegexStrings";

export class Utilities {
    /**
     * Find the first line after the code block that starts at `index`.
     * Returns `doc.lineCount` when the code block runs to the end of the
     * document (closing fence on the last line, or no closing fence at all),
     * so callers must range-check the result before passing it to `lineAt`.
     */
    public static getNextLineIndexIsNotInCode(index: number, doc: TextDocument) {
        for (let currentLineIndex = index + 1; currentLineIndex < doc.lineCount; currentLineIndex++) {
            if (this.isLineStartOrEndOfCodeBlock(currentLineIndex, doc)) {
                return currentLineIndex + 1;
            }
        }

        return doc.lineCount;
    }

    public static isLineStartOrEndOfCodeBlock(lineNumber: number, doc: TextDocument) {
        let nextLine = doc.lineAt(lineNumber).text;

        let isCodeStyle1 = nextLine.match(RegexStrings.Instance.REGEXP_CODE_BLOCK1) !== null;
        let isCodeStyle2 = nextLine.match(RegexStrings.Instance.REGEXP_CODE_BLOCK2) !== null;

        return isCodeStyle1 || isCodeStyle2;
    }
}
