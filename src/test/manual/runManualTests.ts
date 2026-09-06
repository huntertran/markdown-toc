/**
 * Runs the manual markdown fixtures in `test/*.md` through the real extension
 * code with a stubbed vscode module, so "open the file and press Ctrl+M T" can
 * be checked without launching an editor.
 *
 * For every fixture it:
 *   - reports the headers the symbol provider hands the extension,
 *   - runs Insert/Update three times (run 1 can legitimately differ, for
 *     example when the fixture has no TOC markers yet, so convergence is
 *     judged on run 2 vs. run 3),
 *   - compares the run 1 result with the snapshot in `test/expected/`.
 *
 * `npm run test:manual -- --update` rewrites the snapshots.
 */

import * as fs from 'fs';
import * as path from 'path';
import { installVscodeStub } from './vscodeStub';

installVscodeStub();

import { buildSymbols, describeSymbols } from './markdownSymbolProvider';
import { configuration, state, TextDocument, TextEditor } from './vscodeStub';

// Loaded through require so the stub is installed before the extension asks
// for 'vscode'.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/naming-convention
const { AutoMarkdownToc } = require('../../AutoMarkdownToc');

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const FIXTURE_DIRECTORY = path.join(REPOSITORY_ROOT, 'test');
const SNAPSHOT_DIRECTORY = path.join(FIXTURE_DIRECTORY, 'expected');

const updateSnapshots = process.argv.indexOf('--update') !== -1;

function detectEol(text: string): string {
    return text.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
}

function openDocument(file: string): { doc: TextDocument, original: string, eol: string } {
    let original = fs.readFileSync(file, 'utf8');
    let eol = detectEol(original);
    let doc = new TextDocument(file, original, eol);

    state.activeTextEditor = new TextEditor(doc);
    state.symbolProvider = () => buildSymbols(doc);
    state.messages = [];
    configuration['files']['eol'] = eol;

    return { doc: doc, original: original, eol: eol };
}

function diffLines(before: string, after: string, eol: string): string[] {
    let left = before.split(eol);
    let right = after.split(eol);
    let rows: string[] = [];

    for (let index = 0; index < Math.max(left.length, right.length); index++) {
        if (left[index] === right[index]) {
            continue;
        }

        if (left[index] !== undefined) {
            rows.push('  -' + (index + 1) + ': ' + JSON.stringify(left[index]));
        }

        if (right[index] !== undefined) {
            rows.push('  +' + (index + 1) + ': ' + JSON.stringify(right[index]));
        }
    }

    return rows;
}

function extractToc(text: string, eol: string): string | undefined {
    let lines = text.split(eol);
    let start = -1;
    let end = -1;

    for (let index = 0; index < lines.length; index++) {
        let isStop = /<!--\s*\/TOC/i.test(lines[index]);

        if (start === -1 && !isStop && /<!--\s*TOC/i.test(lines[index])) {
            start = index;
            continue;
        }

        if (start !== -1 && isStop) {
            end = index;
            break;
        }
    }

    if (start === -1 || end === -1) {
        return undefined;
    }

    return lines.slice(start, end + 1).join(eol);
}

function indentBlock(text: string, eol: string): string {
    return text.split(eol).map(line => '  ' + line).join('\n');
}

async function runFixture(file: string): Promise<string[]> {
    let name = path.basename(file);
    let failures: string[] = [];

    console.log('='.repeat(72));
    console.log('FIXTURE: ' + name);
    console.log('='.repeat(72));

    let opened = openDocument(file);
    let doc = opened.doc;
    let eol = opened.eol;

    console.log('eol: ' + JSON.stringify(eol) + '   lines: ' + doc.lineCount);

    console.log('\n-- headers handed to the extension --');
    let outline = describeSymbols(buildSymbols(doc));
    console.log(outline.length > 0 ? outline.map(row => '  ' + row).join('\n') : '  (none)');

    let extension = new AutoMarkdownToc();
    let results: string[] = [];

    for (let pass = 1; pass <= 3; pass++) {
        try {
            await extension.updateMarkdownToc();
        } catch (error) {
            let message = error instanceof Error ? error.message : String(error);
            console.log('\n  RUN ' + pass + ' THREW: ' + message);
            failures.push(name + ': Insert/Update run ' + pass + ' threw "' + message + '"');
            return failures;
        }

        results.push(doc.getText());
    }

    state.messages.forEach(entry => console.log('\n  ' + entry.level + ': ' + entry.message));

    let toc = extractToc(results[0], eol);
    console.log('\n-- TOC after Insert/Update --');
    console.log(toc === undefined ? '  (no TOC produced)' : indentBlock(toc, eol));

    if (toc === undefined && state.messages.length === 0) {
        failures.push(name + ': no TOC written and no message shown');
    }

    console.log('\n-- diff against the fixture on disk --');
    let fixtureDiff = diffLines(opened.original, results[0], eol);
    console.log(fixtureDiff.length > 0 ? fixtureDiff.join('\n') : '  (unchanged)');

    console.log('\n-- repeat runs --');
    if (results[1] === results[0]) {
        console.log('  run 2 == run 1 (stable immediately)');
    } else {
        console.log('  run 2 differs from run 1 (expected where the fixture has no TOC markers yet):');
        console.log(diffLines(results[0], results[1], eol).join('\n'));
    }

    if (results[2] === results[1]) {
        console.log('  run 3 == run 2 (converged)');
    } else {
        console.log('  NOT CONVERGED, run 3 differs from run 2:');
        console.log(diffLines(results[1], results[2], eol).join('\n'));
        failures.push(name + ': repeated Insert/Update keeps changing the document');
    }

    let snapshotFile = path.join(SNAPSHOT_DIRECTORY, name);

    console.log('\n-- snapshot --');
    if (updateSnapshots || !fs.existsSync(snapshotFile)) {
        fs.mkdirSync(SNAPSHOT_DIRECTORY, { recursive: true });
        fs.writeFileSync(snapshotFile, results[0]);
        console.log('  written: ' + path.relative(REPOSITORY_ROOT, snapshotFile));
    } else {
        let expected = fs.readFileSync(snapshotFile, 'utf8');

        if (expected === results[0]) {
            console.log('  matches ' + path.relative(REPOSITORY_ROOT, snapshotFile));
        } else {
            console.log('  DIFFERS from ' + path.relative(REPOSITORY_ROOT, snapshotFile) + ':');
            console.log(diffLines(expected, results[0], eol).join('\n'));
            failures.push(name + ': output no longer matches its snapshot');
        }
    }

    return failures;
}

async function main(): Promise<void> {
    let fixtures = fs.readdirSync(FIXTURE_DIRECTORY)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(FIXTURE_DIRECTORY, file));

    let failures: string[] = [];

    for (let fixture of fixtures) {
        failures = failures.concat(await runFixture(fixture));
        console.log('');
    }

    console.log('='.repeat(72));
    console.log('Manual fixture run: ' + fixtures.length + ' fixture(s), ' + failures.length + ' problem(s)');
    failures.forEach(entry => console.log('  FAIL ' + entry));

    if (failures.length > 0) {
        process.exitCode = 1;
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
