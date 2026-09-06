import { DocumentSymbol, Range, SymbolKind, TextDocument } from './vscodeStub';

const REGEXP_FENCE = /^\s{0,3}(```|~~~)/;
const REGEXP_ATX_HEADER = /^(#{1,6})\s+(.*?)\s*$/;

/**
 * Stands in for vscode's built in markdown DocumentSymbolProvider, which is what
 * HeaderManager asks for through `vscode.executeDocumentSymbolProvider`:
 * ATX headers only, fenced code skipped, nested by header level, and the symbol
 * name keeps the leading hash marks (Header.convertFromSymbol parses them).
 */
export function buildSymbols(doc: TextDocument): DocumentSymbol[] {
    let roots: DocumentSymbol[] = [];
    let stack: DocumentSymbol[] = [];
    let flat: DocumentSymbol[] = [];
    let fenceMarker = '';
    let inFence = false;

    for (let index = 0; index < doc.lineCount; index++) {
        let text = doc.lineAt(index).text;
        let fence = text.match(REGEXP_FENCE);

        if (fence !== null) {
            if (!inFence) {
                inFence = true;
                fenceMarker = fence[1];
            } else if (text.trim().startsWith(fenceMarker)) {
                inFence = false;
            }

            continue;
        }

        if (inFence) {
            continue;
        }

        let header = text.match(REGEXP_ATX_HEADER);

        if (header === null) {
            continue;
        }

        let symbol = new DocumentSymbol(
            header[1] + ' ' + header[2],
            '',
            SymbolKind.String,
            new Range(index, 0, index, text.length),
            new Range(index, 0, index, text.length)
        );

        symbol.depth = header[1].length;
        flat.push(symbol);

        while (stack.length > 0 && stack[stack.length - 1].depth >= symbol.depth) {
            stack.pop();
        }

        if (stack.length === 0) {
            roots.push(symbol);
        } else {
            stack[stack.length - 1].children.push(symbol);
        }

        stack.push(symbol);
    }

    // A section runs to the line before the next header of the same or a higher
    // level, the way the real provider reports it.
    for (let index = 0; index < flat.length; index++) {
        let symbol = flat[index];
        let endLine = doc.lineCount - 1;

        for (let next = index + 1; next < flat.length; next++) {
            if (flat[next].depth <= symbol.depth) {
                endLine = flat[next].range.start.line - 1;
                break;
            }
        }

        endLine = Math.max(symbol.range.start.line, endLine);

        symbol.range = new Range(
            symbol.range.start.line,
            0,
            endLine,
            doc.lineAt(endLine).text.length
        );
    }

    return roots;
}

export function describeSymbols(symbols: DocumentSymbol[], indent: number = 0): string[] {
    let rows: string[] = [];

    symbols.forEach(symbol => {
        rows.push('  '.repeat(indent) + 'L' + symbol.range.start.line + ': ' + symbol.name);
        rows = rows.concat(describeSymbols(symbol.children, indent + 1));
    });

    return rows;
}
