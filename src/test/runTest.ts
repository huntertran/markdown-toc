import * as assert from 'assert';
import { decodeNonAsciiAnchorPart } from '../models/AnchorEncoder';

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

console.log('Anchor encoding tests passed.');
