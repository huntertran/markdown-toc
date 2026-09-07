/**
 * Behaviour tests that need more than one document, or a save event, and so do
 * not fit the one-fixture-per-file shape of runManualTests.ts.
 *
 * Everything here runs the real extension code against the vscode stub.
 */

import * as assert from 'assert';
import { installVscodeStub } from './vscodeStub';

installVscodeStub();

import { buildSymbols } from './markdownSymbolProvider';
import { configuration, state, TextDocument, TextEditor } from './vscodeStub';

// Loaded through require so the stub is installed before the extension asks
// for 'vscode'.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/naming-convention
const { AutoMarkdownToc } = require('../../AutoMarkdownToc');

const EOL = '\n';

function open(name: string, lines: string[]): TextDocument {
    let doc = new TextDocument(name, lines.join(EOL), EOL);

    state.activeTextEditor = new TextEditor(doc);
    state.symbolProvider = () => buildSymbols(doc);
    state.messages = [];
    configuration['files']['eol'] = EOL;

    return doc;
}

/**
 * Lets any promise the code under test left unawaited run to completion.
 */
function settle(): Promise<void> {
    return new Promise<void>(resolve => setImmediate(resolve));
}

function documentWithToc(suffix: string, startMarker: string = '<!-- TOC -->'): string[] {
    return [
        startMarker,
        '',
        '<!-- /TOC -->',
        '',
        '# Title ' + suffix,
        '',
        '## Section ' + suffix
    ];
}

/**
 * 5.1 - updateOnSave was read before the configuration had ever been loaded.
 *
 * UPDATE_ON_SAVE.workspaceValue starts as the Dictionary constructor default
 * (true), so until some other command happened to call updateOptions() the
 * handler rewrote the document no matter what the user had configured. That is
 * the root cause of issue #53, "can we disable auto update TOC".
 */
async function updateOnSaveIsHonouredOnTheFirstSave(): Promise<void> {
    configuration['markdown-toc']['updateOnSave'] = false;

    let doc = open('update_on_save_off.md', documentWithToc('A'));
    let before = doc.getText();
    let extension = new AutoMarkdownToc();

    // No command has run, so nothing has loaded the configuration yet.
    await extension.onDidSaveTextDocument();

    // The pre-fix handler kicked off updateMarkdownToc() without awaiting it,
    // so let anything it queued finish before the document is inspected.
    await settle();

    assert.strictEqual(
        doc.getText(),
        before,
        'updateOnSave:false must leave the document untouched on the very first save'
    );

    assert.strictEqual(doc.saveCount, 0, 'updateOnSave:false must not trigger a save of its own');

    console.log('  updateOnSave:false is honoured before any other command runs');
}

/**
 * The same path with the setting on: the TOC is written, the document is saved
 * once, and the save the extension itself triggers does not start a save loop.
 */
async function updateOnSaveStillWorks(): Promise<void> {
    configuration['markdown-toc']['updateOnSave'] = true;

    let doc = open('update_on_save_on.md', documentWithToc('B'));
    let extension = new AutoMarkdownToc();

    await extension.onDidSaveTextDocument();

    assert.ok(
        doc.getText().indexOf('- [Title B](#title-b)') !== -1,
        'updateOnSave:true must write the TOC on save'
    );

    assert.strictEqual(doc.saveCount, 1, 'the rewritten document has to be saved exactly once');

    let afterFirstSave = doc.getText();

    // This is the save the handler itself asked for.
    await extension.onDidSaveTextDocument();

    assert.strictEqual(doc.getText(), afterFirstSave, 'the programmatic save must not run another update');
    assert.strictEqual(doc.saveCount, 1, 'the programmatic save must not trigger a further save');

    console.log('  updateOnSave:true writes the TOC once and does not loop');
}

/**
 * A per-document "<!-- TOC updateOnSave:false -->" has to win over a workspace
 * setting of true. It only can if the options are loaded before the value is
 * read, which is the same fix.
 */
async function documentLevelUpdateOnSaveWins(): Promise<void> {
    configuration['markdown-toc']['updateOnSave'] = true;

    let doc = open('update_on_save_marker.md', documentWithToc('C', '<!-- TOC updateOnSave:false -->'));
    let before = doc.getText();
    let extension = new AutoMarkdownToc();

    await extension.onDidSaveTextDocument();

    assert.strictEqual(doc.getText(), before, 'an in-document updateOnSave:false must win over the workspace setting');
    assert.strictEqual(doc.saveCount, 0, 'an in-document updateOnSave:false must not trigger a save');

    console.log('  in-document updateOnSave:false overrides the workspace setting');
}

/**
 * 5.2 - per-document options leaked into every later document.
 *
 * loadCustomOptions reset optionsFlag but never cleared Dictionary.uniqueValue,
 * and Dictionary.value prefers uniqueValue whenever it is not undefined. So a
 * "<!-- TOC depthFrom:2 -->" read once kept applying to every other document
 * for the rest of the session.
 */
async function perDocumentOptionsDoNotLeak(): Promise<void> {
    configuration['markdown-toc']['updateOnSave'] = true;

    let extension = new AutoMarkdownToc();

    let docA = open('leak_source.md', documentWithToc('A', '<!-- TOC depthFrom:2 bulletCharacter:* -->'));
    await extension.updateMarkdownToc();

    assert.strictEqual(extension.configManager.options.DEPTH_FROM.value, 2, 'document A sets depthFrom:2');
    assert.strictEqual(extension.configManager.options.BULLET_CHAR.value, '*', 'document A sets bulletCharacter:*');

    assert.ok(
        docA.getText().indexOf('* [Section A](#section-a)') !== -1,
        'document A uses its own bullet character'
    );

    assert.strictEqual(
        docA.getText().indexOf('[Title A](#title-a)'),
        -1,
        'depthFrom:2 keeps the "# Title A" header out of document A TOC'
    );

    // Same extension instance, a document that sets no options of its own.
    let docB = open('leak_target.md', documentWithToc('B'));
    await extension.updateMarkdownToc();

    assert.strictEqual(
        extension.configManager.options.DEPTH_FROM.value,
        1,
        'depthFrom must fall back to the workspace value in a document that sets none'
    );

    assert.strictEqual(
        extension.configManager.options.BULLET_CHAR.value,
        '-',
        'bulletCharacter must fall back to the workspace value in a document that sets none'
    );

    assert.ok(
        docB.getText().indexOf('- [Title B](#title-b)') !== -1,
        'document B must render its depth 1 header with the workspace bullet character'
    );

    assert.strictEqual(
        docB.getText().toLowerCase().indexOf('depthfrom'),
        -1,
        'document B must not have document A options written into its TOC start marker'
    );

    console.log('  per-document options do not leak into the next document');
}

/**
 * The reset must not break re-reading the same document: the second run of a
 * document that does carry options has to see those options again.
 */
async function perDocumentOptionsSurviveRepeatedRuns(): Promise<void> {
    let extension = new AutoMarkdownToc();
    let doc = open('leak_repeat.md', documentWithToc('D', '<!-- TOC depthFrom:2 -->'));

    await extension.updateMarkdownToc();
    let firstRun = doc.getText();

    await extension.updateMarkdownToc();

    assert.strictEqual(doc.getText(), firstRun, 'a second run on the same document must be a no-op');
    assert.strictEqual(extension.configManager.options.DEPTH_FROM.value, 2, 'the document still sets depthFrom:2');

    console.log('  document options are re-read on every run');
}


async function main(): Promise<void> {
    let tests = [
        updateOnSaveIsHonouredOnTheFirstSave,
        updateOnSaveStillWorks,
        documentLevelUpdateOnSaveWins,
        perDocumentOptionsDoNotLeak,
        perDocumentOptionsSurviveRepeatedRuns
    ];

    // An optional substring argument runs a subset, which is how each test was
    // checked against the pre-fix code one at a time.
    let filter = process.argv[2];
    let selected = filter === undefined
        ? tests
        : tests.filter(test => test.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1);

    console.log('Behaviour tests:');

    for (let test of selected) {
        await test();
    }

    console.log('Behaviour tests passed.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
