export class RegexStrings {
    REGEXP_TOC_START = /\s*<!--(.*)[^\/]TOC(.*)-->/gi;
    REGEXP_TOC_STOP = /\s*<!--(.*)\/TOC(.*)-->/gi;
    REGEXP_TOC_CONFIG = /\w+[:=][^\s]+/gi;
    REGEXP_TOC_CONFIG_ITEM = /(\w+)[:=]([^\s]+)/;
    REGEXP_MARKDOWN_ANCHOR = /^<a id="markdown-.+" name=".+"><\/a\>/;
    REGEXP_CODE_BLOCK1 = /^\s?```/;
    REGEXP_CODE_BLOCK2 = /^\s?~~~/;
    REGEXP_ANCHOR = /\[.+\]\(#(.+)\)/;
    REGEXP_IGNORE_TITLE = /<!--\s*TOC\s+ingore:true\s*-->/si;

    REGEXP_HEADER_META = /^(\#*)\s*((\d*\.?)*)\s*(.+)/;
    REGEXP_UNIQUE_CONFIG_START = /\s*<!--(.*)[^\/]TOC UNIQUE CONFIGS(.*)-->/gi;
    REGEXP_UNIQUE_CONFIG_STOP = /\s*<!--(.*)\/TOC UNIQUE CONFIGS(.*)-->/gi;
    REGEXP_UNIQUE_CONFIG_LINE = /\s*<!--( *)(\w+)[:](\w+)( *)-->/gi;

    private static _instance: RegexStrings;

    private constructor() { }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}