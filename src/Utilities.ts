import { TextDocument } from "vscode";
import { RegexStrings } from "./models/RegexStrings";

export class Utilities {
    public static getNextLineIndexIsNotInCode(index: number, doc: TextDocument) {
        for (let currentLineIndex = index + 1; currentLineIndex < doc.lineCount; currentLineIndex++) {
            if (this.isLineStartOrEndOfCodeBlock(currentLineIndex, doc)) {
                return Math.min(currentLineIndex + 1, doc.lineCount - 1);
            }
        }

        return doc.lineCount - 1;
    }

    public static isLineStartOrEndOfCodeBlock(lineNumber: number, doc: TextDocument) {
        let nextLine = doc.lineAt(lineNumber).text;

        let isCodeStyle1 = nextLine.match(RegexStrings.Instance.REGEXP_CODE_BLOCK1) !== null;
        let isCodeStyle2 = nextLine.match(RegexStrings.Instance.REGEXP_CODE_BLOCK2) !== null;

        return isCodeStyle1 || isCodeStyle2;
    }
}
