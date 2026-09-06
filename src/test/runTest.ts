import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { TextDocument } from 'vscode';
import { decodeNonAsciiAnchorPart } from '../models/AnchorEncoder';
import { RegexStrings } from '../models/RegexStrings';
import { Utilities } from '../Utilities';

const anchorMarkdownHeader = require('anchor-markdown-header');

function unicodeHref(header: string) {
    let tocRow = anchorMarkdownHeader(header, 'github.com') as string;
    let match = tocRow.match(/\]\(#([^)]+)\)$/);

    if (match === null) {
        throw new Error("Unable to extract anchor href from " + tocRow);
    }

    return decodeNonAsciiAnchorPart(match[1]);
}

assert.strictEqual(
    unicodeHref('Доступ к локальному серверу с других устройств в локальной сети'),
    'доступ-к-локальному-серверу-с-других-устройств-в-локальной-сети'
);

assert.strictEqual(unicodeHref('🚀 тест 100% (ok)!'), '-тест-100-ok');
assert.strictEqual(unicodeHref("What's New?"), 'whats-new');
assert.strictEqual(unicodeHref('存在，【中文】；《标点》、符号！的标题？'), '存在中文标点符号的标题');
assert.strictEqual(decodeNonAsciiAnchorPart('plain-ascii-100%25'), 'plain-ascii-100%25');

// Mirrors the vscode TextDocument surface Utilities touches. lineAt throws the
// same way ExtHostDocumentData._lineAt does, so an out-of-range index fails loudly.
function fakeDoc(lines: string[]) {
    return {
        lineCount: lines.length,
        lineAt(line: number) {
            if (line < 0 || line >= lines.length) {
                throw new Error('Illegal value for `line`');
            }

            return { text: lines[line] };
        }
    } as unknown as TextDocument;
}

// Walks the document the way TocManager.scanForTocRange does, so the guard there
// stays honest about what getNextLineIndexIsNotInCode can return.
function scanLines(lines: string[]) {
    let doc = fakeDoc(lines);
    let visited: number[] = [];

    for (let index = 0; index < doc.lineCount; index++) {
        if (Utilities.isLineStartOrEndOfCodeBlock(index, doc)) {
            index = Utilities.getNextLineIndexIsNotInCode(index, doc);
        }

        if (index >= doc.lineCount) {
            break;
        }

        doc.lineAt(index);
        visited.push(index);
    }

    return visited;
}

// A closed code block hands back the line right after the closing fence.
assert.strictEqual(
    Utilities.getNextLineIndexIsNotInCode(1, fakeDoc(['# a', '```', 'code', '```', '<!-- TOC -->'])),
    4
);

// Fix #56: a closing fence on the last line has no following line, so the helper
// reports doc.lineCount and leaves the range check to the caller.
assert.strictEqual(
    Utilities.getNextLineIndexIsNotInCode(1, fakeDoc(['# a', '```', 'code', '```'])),
    4
);

// An unclosed code block runs to the end of the document, same sentinel.
assert.strictEqual(
    Utilities.getNextLineIndexIsNotInCode(1, fakeDoc(['# a', '```', 'code'])),
    3
);

// Fix #56 end to end: scanning a document whose last line is a closing fence used
// to throw "Illegal value for `line`" out of lineAt.
assert.deepStrictEqual(scanLines(['<!-- TOC -->', '```', 'code', '```']), [0]);
assert.deepStrictEqual(scanLines(['<!-- TOC -->', '~~~', 'code', '~~~']), [0]);
assert.deepStrictEqual(scanLines(['```', 'code', '```', '<!-- TOC -->']), [3]);
assert.deepStrictEqual(scanLines(['```']), []);

// The on-disk fixture has to keep reproducing issue #56, so pin the properties that
// make it work. An editor adding a final newline, or anyone putting TOC markers back
// in, would otherwise disarm it silently while this suite still passed.
let fixtureText = fs.readFileSync(
    path.resolve(__dirname, '../../test/code_block_at_end_test.md'),
    'utf8'
);
let fixtureLines = fixtureText.split(/\r?\n/);

assert.ok(
    !fixtureText.endsWith('\n'),
    'code_block_at_end_test.md must not end with a newline'
);

assert.ok(
    Utilities.isLineStartOrEndOfCodeBlock(fixtureLines.length - 1, fakeDoc(fixtureLines)),
    'the last line of code_block_at_end_test.md must be a closing code fence'
);

assert.ok(
    fixtureLines.every(line => line.match(RegexStrings.Instance.REGEXP_TOC_STOP) === null),
    'code_block_at_end_test.md must not contain a TOC stop marker, or the scan breaks out early'
);

// Without the range check this walk throws "Illegal value for `line`" on the fixture.
assert.doesNotThrow(() => scanLines(fixtureLines));

// The ignore marker shipped misspelled as "ingore". Both spellings have to
// match, or documents written against either release lose the opt out.
assert.ok('<!-- TOC ignore:true -->'.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE) !== null);
assert.ok('<!-- TOC ingore:true -->'.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE) !== null);
assert.ok('<!--    TOC   IgNoRe:true   -->'.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE) !== null);

// Anything else stays a plain TOC comment, including the start marker itself.
assert.strictEqual('<!-- TOC -->'.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE), null);
assert.strictEqual('<!-- TOC ignore:false -->'.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE), null);
assert.strictEqual('<!-- TOC innore:true -->'.match(RegexStrings.Instance.REGEXP_IGNORE_TITLE), null);

console.log('Anchor encoding tests passed.');
console.log('Code fence scanning tests passed.');
console.log('Ignore marker tests passed.');
