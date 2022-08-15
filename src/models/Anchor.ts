import { Position, Range } from "vscode";

export class Anchor {
    id: string = "";
    name: string = "";

    range: Range = new Range(0, 0, 0, 0);

    constructor(headerText: string) {
        headerText = headerText.toLowerCase().replace(/\s/gi, "-");
        this.id = "markdown-" + encodeURIComponent(headerText);
        this.name = encodeURIComponent(headerText);
    }
}