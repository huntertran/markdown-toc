import { Range } from "vscode";

export class Anchor {
    id: string = "";
    name: string = "";

    range: Range = new Range(0, 0, 0, 0);

    /**
     * `slug` is the href of the TOC row that links here, without the leading
     * "#". Building the anchor out of that slug rather than re-deriving one
     * from the header text is what keeps the link and its target in agreement:
     * two independent slug algorithms disagreed for any title with punctuation
     * (#33) and for every numbered row (#10).
     */
    constructor(slug: string) {
        this.id = "markdown-" + slug;
        this.name = slug;
    }
}
