import { Dictionary } from './Dictionary';
import { AnchorMode } from './AnchorMode';

export class Options {

    // current document options
    optionsFlag: string[] = [];
    isProgrammaticallySave: boolean = false;
    isOrderedListDetected: boolean = false;

    // workspace settings
    readonly DEPTH_FROM: Dictionary = new Dictionary("depthFrom", 1);
    readonly DEPTH_TO: Dictionary = new Dictionary("depthTo", 6);
    readonly INSERT_ANCHOR: Dictionary = new Dictionary("insertAnchor", false);
    readonly WITH_LINKS: Dictionary = new Dictionary("withLinks", true);
    readonly ORDERED_LIST: Dictionary = new Dictionary("orderedList", false);
    readonly UPDATE_ON_SAVE: Dictionary = new Dictionary("updateOnSave", true);
    readonly ANCHOR_MODE: Dictionary = new Dictionary("anchorMode", AnchorMode.github);
    readonly UNICODE_ANCHORS: Dictionary = new Dictionary("unicodeAnchors", false);
    readonly BULLET_CHAR: Dictionary = new Dictionary("bulletCharacter", "-");
    readonly DETECT_AUTO_SET_SECTION: Dictionary = new Dictionary("detectAndAutoSetSection", true);

    extensionName: string = "markdown-toc";
    readonly EOL = require('os').EOL;

    // language configuration
    lineEnding: string = "";
    tabSize: number = 2;
    insertSpaces: boolean = false;
    autoSave: boolean = false;

    // special characters
    tab = '\t';
}
