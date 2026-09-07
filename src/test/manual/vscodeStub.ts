/**
 * Minimal in-process stand-in for the slice of the vscode API the extension
 * touches, so the manual fixtures in `test/*.md` can be exercised headless.
 *
 * `installVscodeStub()` must run before anything that imports 'vscode' is
 * required, which is why the runner pulls the extension in with `require`
 * instead of a top level import.
 */

import * as Module from 'module';

// The stub mirrors vscode's own names, which are PascalCase by design.
/* eslint-disable @typescript-eslint/naming-convention */

export class Position {
    line: number;
    character: number;

    constructor(line: number, character: number) {
        this.line = line;
        this.character = character;
    }

    public isBefore(other: Position): boolean {
        return this.line < other.line || (this.line === other.line && this.character < other.character);
    }
}

export class Range {
    start: Position;
    end: Position;

    constructor(startLineOrPosition: number | Position, startCharacterOrEnd: number | Position, endLine?: number, endCharacter?: number) {
        if (typeof startLineOrPosition === 'number') {
            this.start = new Position(startLineOrPosition, <number>startCharacterOrEnd);
            this.end = new Position(<number>endLine, <number>endCharacter);
        } else {
            this.start = startLineOrPosition;
            this.end = <Position>startCharacterOrEnd;
        }
    }

    public get isSingleLine(): boolean {
        return this.start.line === this.end.line;
    }

    public get isEmpty(): boolean {
        return this.isSingleLine && this.start.character === this.end.character;
    }
}

// Numeric values mirror vscode.SymbolKind, which HeaderManager filters on.
export const SymbolKind = {
    File: 0, Module: 1, Namespace: 2, Package: 3, Class: 4, Method: 5, Property: 6,
    Field: 7, Constructor: 8, Enum: 9, Interface: 10, Function: 11, Variable: 12,
    Constant: 13, String: 14, Number: 15, Boolean: 16, Array: 17, Object: 18,
    Key: 19, Null: 20, EnumMember: 21, Struct: 22, Event: 23, Operator: 24, TypeParameter: 25
};

export class DocumentSymbol {
    name: string;
    detail: string;
    kind: number;
    range: Range;
    selectionRange: Range;
    children: DocumentSymbol[] = [];

    // Not part of the vscode shape; the fake symbol provider uses it while
    // nesting headers and the extension never reads it.
    depth: number = 0;

    constructor(name: string, detail: string, kind: number, range: Range, selectionRange: Range) {
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}

export const Uri = {
    file(fsPath: string) {
        return {
            scheme: 'file',
            fsPath: fsPath,
            path: fsPath,
            toString: () => 'file://' + fsPath
        };
    }
};

export class TextLine {
    lineNumber: number;
    text: string;
    range: Range;

    constructor(lineNumber: number, text: string) {
        this.lineNumber = lineNumber;
        this.text = text;
        this.range = new Range(lineNumber, 0, lineNumber, text.length);
    }

    public get isEmptyOrWhitespace(): boolean {
        return this.text.trim().length === 0;
    }
}

export class TextDocument {
    fileName: string;
    languageId: string = 'markdown';
    eol: string;
    saveCount: number = 0;

    private text: string = '';
    private lines: string[] = [];

    constructor(fileName: string, text: string, eol: string) {
        this.fileName = fileName;
        this.eol = eol;
        this.setText(text);
    }

    public setText(text: string): void {
        this.text = text;
        this.lines = text.split(this.eol);
    }

    public get lineCount(): number {
        return this.lines.length;
    }

    public lineAt(line: number): TextLine {
        // Fails the same way ExtHostDocumentData._lineAt does, so an out of
        // range index surfaces as the error users reported in issue #56.
        if (line < 0 || line >= this.lines.length) {
            throw new Error('Illegal value for `line`');
        }

        return new TextLine(line, this.lines[line]);
    }

    public offsetAt(position: Position): number {
        // vscode validates positions instead of throwing here, so clamp.
        if (position.line >= this.lines.length) {
            return this.text.length;
        }

        let line = Math.max(0, position.line);
        let offset = 0;

        for (let index = 0; index < line; index++) {
            offset += this.lines[index].length + this.eol.length;
        }

        return offset + Math.max(0, Math.min(position.character, this.lines[line].length));
    }

    public getText(): string {
        return this.text;
    }

    public save(): Promise<boolean> {
        this.saveCount++;
        return Promise.resolve(true);
    }
}

interface EditOperation {
    kind: 'insert' | 'delete' | 'replace';
    start: number;
    end: number;
    text: string;
}

export class TextEditorEdit {
    private document: TextDocument;
    private operations: EditOperation[] = [];

    constructor(document: TextDocument) {
        this.document = document;
    }

    public insert(position: Position, text: string): void {
        let offset = this.document.offsetAt(position);
        this.operations.push({ kind: 'insert', start: offset, end: offset, text: text });
    }

    public delete(range: Range): void {
        this.operations.push({
            kind: 'delete',
            start: this.document.offsetAt(range.start),
            end: this.document.offsetAt(range.end),
            text: ''
        });
    }

    public replace(range: Range, text: string): void {
        this.operations.push({
            kind: 'replace',
            start: this.document.offsetAt(range.start),
            end: this.document.offsetAt(range.end),
            text: text
        });
    }

    public apply(): void {
        // vscode resolves every edit of one edit() call against the original
        // document, so apply them back to front. Where an insert shares an
        // offset with a delete the delete has to run first, otherwise the
        // deleted range swallows the freshly inserted text.
        let rank = (operation: EditOperation) => operation.kind === 'insert' ? 0 : 1;

        let ordered = this.operations
            .map((operation, index) => ({ operation: operation, index: index }))
            .sort((left, right) => {
                if (left.operation.start !== right.operation.start) {
                    return left.operation.start - right.operation.start;
                }

                if (rank(left.operation) !== rank(right.operation)) {
                    return rank(left.operation) - rank(right.operation);
                }

                return left.index - right.index;
            })
            .map(entry => entry.operation);

        let text = this.document.getText();

        for (let index = ordered.length - 1; index >= 0; index--) {
            let operation = ordered[index];
            text = text.slice(0, operation.start) + operation.text + text.slice(operation.end);
        }

        this.document.setText(text);
    }
}

export class TextEditor {
    document: TextDocument;
    selection: { active: Position, anchor: Position };

    // The open editor's own indentation, which is where editor.detectIndentation
    // and the EditorConfig extension put their answer. Empty by default, so a
    // test that does not set it falls back to `configuration` the way a real
    // editor falls back to the settings.
    options: { tabSize?: number | string, insertSpaces?: boolean | string } = {};

    constructor(document: TextDocument) {
        this.document = document;
        this.selection = { active: new Position(0, 0), anchor: new Position(0, 0) };
    }

    public edit(callback: (editBuilder: TextEditorEdit) => void): Promise<boolean> {
        let builder = new TextEditorEdit(this.document);
        callback(builder);
        builder.apply();
        return Promise.resolve(true);
    }
}

export interface StubMessage {
    level: string;
    message: string;
}

export interface StubState {
    activeTextEditor: TextEditor | undefined;
    symbolProvider: ((fileUri: unknown) => DocumentSymbol[]) | undefined;
    messages: StubMessage[];
}

export const state: StubState = {
    activeTextEditor: undefined,
    symbolProvider: undefined,
    messages: []
};

type ConfigurationSection = { [key: string]: unknown };

// package.json defaults plus the files/editor settings ConfigManager reads.
// Section names carry markdown/vscode syntax, hence the quoted keys.
export const configuration: { [section: string]: ConfigurationSection } = {
    'markdown-toc': {
        'depthFrom': 1,
        'depthTo': 6,
        'insertAnchor': false,
        'withLinks': true,
        'orderedList': false,
        'bulletCharacter': '-',
        'updateOnSave': true,
        'anchorMode': 'github.com',
        'unicodeAnchors': false,
        'detectAndAutoSetSection': true
    },
    'files': {
        'eol': 'auto',
        'autoSave': 'off'
    },
    'editor': {
        'tabSize': 4,
        'insertSpaces': true
    },
    '[markdown]': {}
};

export const workspace = {
    getConfiguration(section: string): ConfigurationSection {
        let values = configuration[section] || {};
        let config: ConfigurationSection = Object.assign({}, values);

        config['get'] = (key: string) => values[key];
        config['has'] = (key: string) => Object.prototype.hasOwnProperty.call(values, key);

        return config;
    },
    onDidChangeConfiguration() { return { dispose() { } }; },
    onDidSaveTextDocument() { return { dispose() { } }; },
    onDidChangeTextDocument() { return { dispose() { } }; }
};

export const window = {
    get activeTextEditor(): TextEditor | undefined {
        return state.activeTextEditor;
    },
    showWarningMessage(message: string) {
        state.messages.push({ level: 'warning', message: message });
        return Promise.resolve(undefined);
    },
    showErrorMessage(message: string) {
        state.messages.push({ level: 'error', message: message });
        return Promise.resolve(undefined);
    },
    showInformationMessage(message: string) {
        state.messages.push({ level: 'info', message: message });
        return Promise.resolve(undefined);
    }
};

export const commands = {
    registerCommand() { return { dispose() { } }; },
    executeCommand(command: string, ...args: unknown[]) {
        if (command === 'vscode.executeDocumentSymbolProvider' && state.symbolProvider !== undefined) {
            return Promise.resolve(state.symbolProvider(args[0]));
        }

        return Promise.resolve(undefined);
    }
};

export const languages = {
    registerDocumentSymbolProvider() { return { dispose() { } }; }
};

const stubModule = {
    Position: Position,
    Range: Range,
    Uri: Uri,
    SymbolKind: SymbolKind,
    DocumentSymbol: DocumentSymbol,
    TextDocument: TextDocument,
    TextEditor: TextEditor,
    TextEditorEdit: TextEditorEdit,
    EndOfLine: { LF: 1, CRLF: 2 },
    workspace: workspace,
    window: window,
    commands: commands,
    languages: languages
};

let installed = false;

/**
 * Route every require('vscode') at the stub above.
 */
export function installVscodeStub(): void {
    if (installed) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let moduleInternals = Module as any;
    let originalLoad = moduleInternals._load;

    moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
        if (request === 'vscode') {
            return stubModule;
        }

        return originalLoad.apply(this, [request, parent, isMain]);
    };

    installed = true;
}
