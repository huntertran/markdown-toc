export class RegexStrings {
    readonly REGEXP_TOC_START = /\s*<!--(.*)[^\/]TOC(.*)-->/gi;
    readonly REGEXP_TOC_STOP = /\s*<!--(.*)\/TOC(.*)-->/gi;
    readonly REGEXP_TOC_CONFIG = /\w+[:=][^\s]+/gi;
    readonly REGEXP_TOC_CONFIG_ITEM = /(\w+)[:=]([^\s]+)/;
    readonly REGEXP_MARKDOWN_ANCHOR = /^<a id="markdown-.+" name=".+"><\/a\>/;
    readonly REGEXP_CODE_BLOCK1 = /^\s?```/;
    readonly REGEXP_CODE_BLOCK2 = /^\s?~~~/;
    readonly REGEXP_ANCHOR = /\[.+\]\(#(.+)\)/;
    // "ingore" is the original typo. Documents in the wild use it, so both
    // spellings have to keep working.
    readonly REGEXP_IGNORE_TITLE = /<!--\s*TOC\s+i(?:gn|ng)ore:true\s*-->/si;

    readonly REGEXP_HEADER_META = /^(\#*)\s*((\d*\.?)*)\s*(.+)/;
    readonly REGEXP_UNIQUE_CONFIG_START = /\s*<!--(.*)[^\/]TOC UNIQUE CONFIGS(.*)-->/gi;
    readonly REGEXP_UNIQUE_CONFIG_STOP = /\s*<!--(.*)\/TOC UNIQUE CONFIGS(.*)-->/gi;
    readonly REGEXP_UNIQUE_CONFIG_LINE = /\s*<!--( *)(\w+)[:](\w+)( *)-->/gi;

    private static _instance: RegexStrings;

    private constructor() { }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}