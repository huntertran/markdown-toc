import { Position, Range } from "vscode";
import { encodeURIComponentPreservingUnicode } from "./AnchorEncoder";

export class Anchor {
    id: string = "";
    name: string = "";

    range: Range = new Range(0, 0, 0, 0);

    constructor(headerText: string, preserveUnicodeAnchors: boolean = false) {
        headerText = headerText.toLowerCase().replace(/\s/gi, "-");
        let encodedHeaderText = preserveUnicodeAnchors ? encodeURIComponentPreservingUnicode(headerText) : encodeURIComponent(headerText);
        this.id = "markdown-" + encodedHeaderText;
        this.name = encodedHeaderText;
    }
}
