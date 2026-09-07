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

// A section number is only a section number when whitespace separates it from
// the title. Without that rule "# 1.1.1" parsed as the number "1." plus the
// title "1", and header renumbering then wrote that back over the version.
function headerMeta(headerText: string) {
    let match = headerText.match(RegexStrings.Instance.REGEXP_HEADER_META);

    if (match === null) {
        throw new Error('REGEXP_HEADER_META did not match ' + headerText);
    }

    return {
        mark: match[1],
        order: match[2] === undefined ? '' : match[2],
        title: match[3]
    };
}

assert.deepStrictEqual(headerMeta('# Title'), { mark: '#', order: '', title: 'Title' });
assert.deepStrictEqual(headerMeta('# 1. Section'), { mark: '#', order: '1.', title: 'Section' });
assert.deepStrictEqual(headerMeta('## 1.1. Sub'), { mark: '##', order: '1.1.', title: 'Sub' });
assert.deepStrictEqual(headerMeta('### 1.1 Sub'), { mark: '###', order: '1.1', title: 'Sub' });

// Version headings: no separating whitespace, so the whole thing is the title.
assert.deepStrictEqual(headerMeta('# 1.1.1'), { mark: '#', order: '', title: '1.1.1' });
assert.deepStrictEqual(headerMeta('# 0.1.1'), { mark: '#', order: '', title: '0.1.1' });
assert.deepStrictEqual(headerMeta('# 2020.1'), { mark: '#', order: '', title: '2020.1' });

// Digits with no dot are never a section number.
assert.deepStrictEqual(headerMeta('# 12 Monkeys'), { mark: '#', order: '', title: '12 Monkeys' });
assert.deepStrictEqual(headerMeta('# 1'), { mark: '#', order: '', title: '1' });

// A numbered section whose title starts with a digit still splits correctly.
assert.deepStrictEqual(headerMeta('## 3. 5 Reasons'), { mark: '##', order: '3.', title: '5 Reasons' });

// The TOC markers have to BEGIN with TOC. Matching "TOC" anywhere inside any
// comment made an attribution comment naming the tool register as the start
// marker, so the document between it and <!-- /TOC --> was replaced.
function isTocStart(line: string) {
    return line.match(RegexStrings.Instance.REGEXP_TOC_START) !== null;
}

function isTocStop(line: string) {
    return line.match(RegexStrings.Instance.REGEXP_TOC_STOP) !== null;
}

assert.ok(isTocStart('<!-- TOC -->'));
assert.ok(isTocStart('<!--TOC-->'));
assert.ok(isTocStart('  <!-- TOC depthFrom:2 -->'));
assert.ok(isTocStart('<!-- TOC ignore:true -->'));

assert.ok(!isTocStart('<!-- Generated with auto-markdown-toc -->'));
assert.ok(!isTocStart('<!-- This table of contents was generated by a TOC tool -->'));
assert.ok(!isTocStart('<!-- TOCX is not a marker -->'));
assert.ok(!isTocStart('<!-- /TOC -->'));
assert.ok(!isTocStart('text before <!-- TOC -->'));

assert.ok(isTocStop('<!-- /TOC -->'));
assert.ok(isTocStop('  <!--/TOC-->'));
assert.ok(!isTocStop('<!-- TOC -->'));
assert.ok(!isTocStop('and <!-- /TOC --> inside a sentence'));

// These are used as predicates, so they must not carry the g flag: a shared
// regex object with a sticky lastIndex would answer differently on every other
// call.
assert.strictEqual(RegexStrings.Instance.REGEXP_TOC_START.global, false);
assert.strictEqual(RegexStrings.Instance.REGEXP_TOC_STOP.global, false);

console.log('Anchor encoding tests passed.');
console.log('Code fence scanning tests passed.');
console.log('Ignore marker tests passed.');
console.log('Header meta parsing tests passed.');
console.log('TOC marker tests passed.');
