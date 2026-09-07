import { RegexStrings } from './models/RegexStrings';
import { Options } from './models/Options';
import {
    workspace,
    window
} from 'vscode';

export class ConfigManager {

    options = new Options();

    public updateOptions() {
        this.loadConfigurations();
        this.loadCustomOptions();
    }

    public loadConfigurations() {
        this.options.DEPTH_FROM.workspaceValue = <number>workspace.getConfiguration(this.options.extensionName).get(this.options.DEPTH_FROM.key);
        this.options.DEPTH_TO.workspaceValue = <number>workspace.getConfiguration(this.options.extensionName).get(this.options.DEPTH_TO.key);
        this.options.INSERT_ANCHOR.workspaceValue = <boolean>workspace.getConfiguration(this.options.extensionName).get(this.options.INSERT_ANCHOR.key);
        this.options.WITH_LINKS.workspaceValue = <boolean>workspace.getConfiguration(this.options.extensionName).get(this.options.WITH_LINKS.key);
        this.options.ORDERED_LIST.workspaceValue = <boolean>workspace.getConfiguration(this.options.extensionName).get(this.options.ORDERED_LIST.key);
        this.options.UPDATE_ON_SAVE.workspaceValue = <boolean>workspace.getConfiguration(this.options.extensionName).get(this.options.UPDATE_ON_SAVE.key);
        this.options.ANCHOR_MODE.workspaceValue = <string>workspace.getConfiguration(this.options.extensionName).get(this.options.ANCHOR_MODE.key);
        this.options.UNICODE_ANCHORS.workspaceValue = <boolean>workspace.getConfiguration(this.options.extensionName).get(this.options.UNICODE_ANCHORS.key);
        this.options.BULLET_CHAR.workspaceValue = <string>workspace.getConfiguration(this.options.extensionName).get(this.options.BULLET_CHAR.key);
        this.options.DETECT_AUTO_SET_SECTION.workspaceValue = <boolean>workspace.getConfiguration(this.options.extensionName).get(this.options.DETECT_AUTO_SET_SECTION.key);

        this.options.lineEnding = <string>workspace.getConfiguration("files", null).get("eol");
        if (this.options.lineEnding === 'auto') {
            this.options.lineEnding = <string>this.options.EOL;
        }

        this.loadIndentation();

        if (<string>workspace.getConfiguration("files", null).get("autoSave") !== "off") {
            this.options.autoSave = true;
        }
    }

    /**
     * Resolves the indentation one TOC nesting level is written with.
     *
     * #55 - only the *configured* settings were consulted, so a document whose
     * effective indentation came from anywhere else was indented by the
     * configured default instead. Both `editor.detectIndentation` (on by
     * default, and it infers the width from the file itself) and the
     * EditorConfig extension work by setting the open editor's own options, not
     * the settings. Those options are what the status bar reports and what a
     * user means by "my indent setting", so the active editor is asked first
     * and the settings are the fallback for when there is no editor.
     */
    private loadIndentation() {
        let editorOptions = window.activeTextEditor === undefined
            ? undefined
            : window.activeTextEditor.options;

        // Language scoped settings, "[markdown]": { "editor.tabSize": 2 }, are
        // read as plain keys off the section rather than through get().
        let markdownScope = workspace.getConfiguration("[markdown]", null);

        this.options.tabSize = this.firstNumber(
            [
                editorOptions === undefined ? undefined : editorOptions.tabSize,
                markdownScope["editor.tabSize"],
                workspace.getConfiguration("editor", null).get("tabSize")
            ],
            this.options.DEFAULT_TAB_SIZE);

        this.options.insertSpaces = this.firstBoolean(
            [
                editorOptions === undefined ? undefined : editorOptions.insertSpaces,
                markdownScope["editor.insertSpaces"],
                workspace.getConfiguration("editor", null).get("insertSpaces")
            ],
            this.options.DEFAULT_INSERT_SPACES);

        // Assigned on both branches. Only the spaces branch used to write to
        // `tab`, so once a spaces document had been opened the value stuck for
        // the rest of the session and a tab-indented document was still
        // indented with spaces.
        this.options.tab = this.options.insertSpaces && this.options.tabSize > 0
            ? " ".repeat(this.options.tabSize)
            : "\t";
    }

    /**
     * vscode types `TextEditorOptions.tabSize` as `number | string` and
     * `insertSpaces` as `boolean | string` - "auto" is a legal value to write -
     * and a language scoped setting holds whatever the user typed into their
     * settings file. A candidate of the wrong type is not an answer, so the
     * next source is asked instead of it being coerced into a nonsense value.
     */
    private firstNumber(candidates: unknown[], fallback: number): number {
        for (let candidate of candidates) {
            if (typeof candidate === 'number' && isFinite(candidate) && candidate > 0) {
                return candidate;
            }
        }

        return fallback;
    }

    private firstBoolean(candidates: unknown[], fallback: boolean): boolean {
        for (let candidate of candidates) {
            if (typeof candidate === 'boolean') {
                return candidate;
            }
        }

        return fallback;
    }

    /**
     * DEPRECATED
     * use single line unique options instead
     */
    public loadCustomOptions() {
        this.options.optionsFlag = [];

        // Per document overrides belong to the document they were read from.
        // Without this reset a `<!-- TOC depthFrom:2 -->` in one file kept
        // applying to every other file for the rest of the session, because
        // Dictionary.value prefers uniqueValue whenever it is not undefined.
        this.options.allSettings.forEach(setting => {
            setting.uniqueValue = undefined;
        });

        let editor = window.activeTextEditor;
        if (editor === undefined) {
            return;
        }

        for (let index = 0; index < editor.document.lineCount; index++) {
            let lineText = editor.document.lineAt(index).text;

            if (lineText.match(RegexStrings.Instance.REGEXP_TOC_START)) {
                let options = lineText.match(RegexStrings.Instance.REGEXP_TOC_CONFIG);

                if (options !== null) {
                    options.forEach(element => {
                        let pair = RegexStrings.Instance.REGEXP_TOC_CONFIG_ITEM.exec(element);

                        if (pair !== null) {
                            let key = pair[1].toLocaleLowerCase();
                            let value = pair[2];

                            switch (key) {
                                case this.options.DEPTH_FROM.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DEPTH_FROM.uniqueValue = this.parseValidNumber(value);
                                    break;
                                case this.options.DEPTH_TO.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DEPTH_TO.uniqueValue = Math.max(this.parseValidNumber(value), this.options.DEPTH_FROM.value);
                                    break;
                                case this.options.INSERT_ANCHOR.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.INSERT_ANCHOR.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.WITH_LINKS.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.WITH_LINKS.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.ORDERED_LIST.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.ORDERED_LIST.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.UPDATE_ON_SAVE.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.UPDATE_ON_SAVE.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.ANCHOR_MODE.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.ANCHOR_MODE.uniqueValue = value;
                                    break;
                                case this.options.UNICODE_ANCHORS.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.UNICODE_ANCHORS.uniqueValue = this.parseBool(value);
                                    break;
                                case this.options.BULLET_CHAR.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.BULLET_CHAR.uniqueValue = value;
                                    break;
                                case this.options.DETECT_AUTO_SET_SECTION.lowerCaseKey:
                                    this.options.optionsFlag.push(key);
                                    this.options.DETECT_AUTO_SET_SECTION.uniqueValue = this.parseBool(value);
                                    break;
                            }
                        }
                    });
                }

                break;
            }
        }

        return;
    }


    public getOptionValueByKey(key: string) {
        switch (key.toLowerCase()) {
            case this.options.DEPTH_FROM.lowerCaseKey:
                return this.options.DEPTH_FROM.value;
            case this.options.DEPTH_TO.lowerCaseKey:
                return this.options.DEPTH_TO.value;
            case this.options.INSERT_ANCHOR.lowerCaseKey:
                return this.options.INSERT_ANCHOR.value;
            case this.options.WITH_LINKS.lowerCaseKey:
                return this.options.WITH_LINKS.value;
            case this.options.ORDERED_LIST.lowerCaseKey:
                return this.options.ORDERED_LIST.value;
            case this.options.UPDATE_ON_SAVE.lowerCaseKey:
                return this.options.UPDATE_ON_SAVE.value;
            case this.options.ANCHOR_MODE.lowerCaseKey:
                return this.options.ANCHOR_MODE.value;
            case this.options.UNICODE_ANCHORS.lowerCaseKey:
                return this.options.UNICODE_ANCHORS.value;
            case this.options.BULLET_CHAR.lowerCaseKey:
                return this.options.BULLET_CHAR.value;
            case this.options.DETECT_AUTO_SET_SECTION.lowerCaseKey:
                return this.options.DETECT_AUTO_SET_SECTION.value;
        }
    }

    private parseBool(value: string) {
        return value.toLocaleLowerCase() === 'true';
    }

    private parseValidNumber(value: string) {
        let num = parseInt(value);

        if (num < 1) {
            return 1;
        }

        return num;
    }
}
