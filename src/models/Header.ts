import {
    Range, Position, DocumentSymbol
} from 'vscode';
import { AnchorMode } from './AnchorMode';
import { Anchor } from './Anchor';
import { RegexStrings } from './RegexStrings';
import { decodeNonAsciiAnchorPart } from './AnchorEncoder';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ANCHOR_MARKDOWN_HEADER: (title: string, mode: AnchorMode | string) => string = require('anchor-markdown-header');

export class Header {
    headerMark: string = "";
    orderedListString: string = "";

    // The order the header text already carried ("2.1." in "## 2.1. Title"), as
    // opposed to orderedListString, which HeaderManager recomputes. Empty when
    // the document does not number its headers.
    detectedOrderString: string = "";

    dirtyTitle: string = "";
    range: Range;

    isIgnored: boolean = false;

    orderArray: number[] = [];

    anchorMode: AnchorMode = AnchorMode.github;
    preserveUnicodeAnchors: boolean = false;

    constructor(anchorMode: AnchorMode, preserveUnicodeAnchors: boolean = false) {
        this.anchorMode = anchorMode;
        this.preserveUnicodeAnchors = preserveUnicodeAnchors;
        this.range = new Range(0, 0, 0, 0);
    }

    public convertFromSymbol(symbol: DocumentSymbol) {
        let headerTextSplit = symbol.name.match(RegexStrings.Instance.REGEXP_HEADER_META);

        if (headerTextSplit !== null) {
            // Group 2 is optional, so it is undefined for an unnumbered header.
            let detectedOrder = headerTextSplit[2] === undefined ? "" : headerTextSplit[2];

            this.headerMark = headerTextSplit[1];
            this.orderedListString = detectedOrder;
            this.detectedOrderString = detectedOrder;
            this.dirtyTitle = headerTextSplit[3];
        }

        this.range = new Range(symbol.range.start, new Position(symbol.range.start.line, symbol.name.length));
    }

    public get depth(): number {
        return this.headerMark.length;
    }

    public get isHeader(): boolean {
        return this.headerMark !== "";
    }

    public tocRowWithAnchor(tocString: string): string {
        let title = this.cleanUpTitle(tocString);
        let tocRow = ANCHOR_MARKDOWN_HEADER(title, this.anchorMode);

        if (!this.preserveUnicodeAnchors) {
            return tocRow;
        }

        return tocRow.replace(/\]\(#([^)]+)\)$/, function (_match: string, anchorPart: string) {
            return "](#" + decodeNonAsciiAnchorPart(anchorPart) + ")";
        });
    }

    /**
     * The anchor the TOC row for `tocString` points at, or undefined when that
     * row carries no link. `tocString` has to be the very same string the row
     * was generated from, numbering included, or the anchor lands on a slug
     * nothing links to.
     */
    public anchorFor(tocString: string): Anchor | undefined {
        let anchorMatches = this.tocRowWithAnchor(tocString).match(RegexStrings.Instance.REGEXP_ANCHOR);

        if (anchorMatches === null) {
            return undefined;
        }

        return new Anchor(anchorMatches[1]);
    }

    public get tocWithoutOrder(): string {
        return this.dirtyTitle;
    }

    public get tocWithOrder(): string {
        // A header above the numbering root (depth < depthFrom) takes no number.
        // Without this guard it would be rewritten as "# . Title".
        if (this.orderArray.length === 0) {
            return this.tocWithoutOrder;
        }

        return this.orderArray.join('.') + ". " + this.tocWithoutOrder;
    }

    public get fullHeaderWithOrder(): string {
        return this.headerMark + " " + this.tocWithOrder;
    }

    public get fullHeaderWithoutOrder(): string {
        return this.headerMark + " " + this.tocWithoutOrder;
    }

    private cleanUpTitle(dirtyTitle: string) {
        // #67 - an image in a heading renders as a picture and contributes no
        // text, so its alt text must not reach the TOC row. Images go first so
        // that a badge wrapped in a link, "[![alt](image)](href)", collapses to
        // an empty link that the link rule below then removes outright.
        let title = dirtyTitle.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

        // The link text is what renders, so keep it and drop the target. The
        // text group accepts the empty string, otherwise a link emptied by the
        // image rule would survive as a literal "[](href)". Matching the text
        // with [^\]]* rather than .+ also keeps two links on one line from
        // being swallowed by a single greedy match.
        title = title.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

        title = title.replace(/<!--.+-->/gi, ""); // replace comment

        // #69 - parentheses used to be stripped here, which turned
        // "bar (info)" into "bar info". They are ordinary title text;
        // anchor-markdown-header already drops them when it builds the slug.
        title = title.replace(/#*`/g, ""); // replace special char

        // Removing an image or a comment from the middle of a title leaves the
        // whitespace that surrounded it behind.
        return title.replace(/\s+/g, " ").trim();
    }
}
