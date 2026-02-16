import { z } from 'zod/mini';

declare const ALL_TOOL_TARGETS: readonly ["agentsmd", "agentsskills", "antigravity", "augmentcode", "augmentcode-legacy", "claudecode", "claudecode-legacy", "cline", "codexcli", "copilot", "cursor", "factorydroid", "geminicli", "junie", "kilo", "kiro", "opencode", "qwencode", "replit", "roo", "warp", "windsurf", "zed"];
declare const ToolTargetSchema: z.ZodMiniEnum<{
    agentsmd: "agentsmd";
    agentsskills: "agentsskills";
    antigravity: "antigravity";
    augmentcode: "augmentcode";
    "augmentcode-legacy": "augmentcode-legacy";
    claudecode: "claudecode";
    "claudecode-legacy": "claudecode-legacy";
    cline: "cline";
    codexcli: "codexcli";
    copilot: "copilot";
    cursor: "cursor";
    factorydroid: "factorydroid";
    geminicli: "geminicli";
    junie: "junie";
    kilo: "kilo";
    kiro: "kiro";
    opencode: "opencode";
    qwencode: "qwencode";
    replit: "replit";
    roo: "roo";
    warp: "warp";
    windsurf: "windsurf";
    zed: "zed";
}>;
type ToolTarget = z.infer<typeof ToolTargetSchema>;

declare const ALL_FEATURES: readonly ["rules", "ignore", "mcp", "subagents", "commands", "skills", "hooks"];
declare const FeatureSchema: z.ZodMiniEnum<{
    rules: "rules";
    ignore: "ignore";
    mcp: "mcp";
    subagents: "subagents";
    commands: "commands";
    skills: "skills";
    hooks: "hooks";
}>;
type Feature = z.infer<typeof FeatureSchema>;

type ImportResult = {
    rulesCount: number;
    ignoreCount: number;
    mcpCount: number;
    commandsCount: number;
    subagentsCount: number;
    skillsCount: number;
    hooksCount: number;
};

type ValidationResult = {
    success: true;
    error: undefined | null;
} | {
    success: false;
    error: Error;
};
type AiDirFile = {
    relativeFilePathToDirPath: string;
    fileBuffer: Buffer;
};
type AiDirParams = {
    baseDir?: string;
    relativeDirPath: string;
    dirName: string;
    mainFile?: {
        name: string;
        body: string;
        frontmatter?: Record<string, unknown>;
    };
    otherFiles?: AiDirFile[];
    global?: boolean;
};
type AiDirFromDirParams = Pick<AiDirParams, "baseDir" | "relativeDirPath" | "dirName" | "global">;
declare abstract class AiDir {
    /**
     * @example "."
     */
    protected readonly baseDir: string;
    /**
     * @example ".rulesync/skills"
     */
    protected readonly relativeDirPath: string;
    /**
     * @example "my-skill"
     */
    protected readonly dirName: string;
    /**
     * Optional main file with frontmatter support
     */
    protected mainFile?: {
        name: string;
        body: string;
        frontmatter?: Record<string, unknown>;
    };
    /**
     * Additional files in the directory
     */
    protected otherFiles: AiDirFile[];
    /**
     * @example false
     */
    protected readonly global: boolean;
    constructor({ baseDir, relativeDirPath, dirName, mainFile, otherFiles, global, }: AiDirParams);
    static fromDir(_params: AiDirFromDirParams): Promise<AiDir>;
    getBaseDir(): string;
    getRelativeDirPath(): string;
    getDirName(): string;
    getDirPath(): string;
    getMainFile(): {
        name: string;
        body: string;
        frontmatter?: Record<string, unknown>;
    } | undefined;
    getOtherFiles(): AiDirFile[];
    getRelativePathFromCwd(): string;
    getGlobal(): boolean;
    setMainFile(name: string, body: string, frontmatter?: Record<string, unknown>): void;
    /**
     * Recursively collects all files from a directory, excluding the specified main file.
     * This is a common utility for loading additional files alongside the main file.
     *
     * @param baseDir - The base directory path
     * @param relativeDirPath - The relative path to the directory containing the skill
     * @param dirName - The name of the directory
     * @param excludeFileName - The name of the file to exclude (typically the main file)
     * @returns Array of files with their relative paths and buffers
     */
    protected static collectOtherFiles(baseDir: string, relativeDirPath: string, dirName: string, excludeFileName: string): Promise<AiDirFile[]>;
    abstract validate(): ValidationResult;
}

declare const RulesyncSkillFrontmatterSchemaInternal: z.ZodMiniObject<{
    name: z.ZodMiniString<string>;
    description: z.ZodMiniString<string>;
    targets: z.ZodMiniDefault<z.ZodMiniArray<z.ZodMiniEnum<{
        agentsmd: "agentsmd";
        agentsskills: "agentsskills";
        antigravity: "antigravity";
        augmentcode: "augmentcode";
        "augmentcode-legacy": "augmentcode-legacy";
        claudecode: "claudecode";
        "claudecode-legacy": "claudecode-legacy";
        cline: "cline";
        codexcli: "codexcli";
        copilot: "copilot";
        cursor: "cursor";
        factorydroid: "factorydroid";
        geminicli: "geminicli";
        junie: "junie";
        kilo: "kilo";
        kiro: "kiro";
        opencode: "opencode";
        qwencode: "qwencode";
        replit: "replit";
        roo: "roo";
        warp: "warp";
        windsurf: "windsurf";
        zed: "zed";
        "*": "*";
    }>>>;
    claudecode: z.ZodMiniOptional<z.ZodMiniObject<{
        "allowed-tools": z.ZodMiniOptional<z.ZodMiniArray<z.ZodMiniString<string>>>;
    }, z.core.$loose>>;
    codexcli: z.ZodMiniOptional<z.ZodMiniObject<{
        "short-description": z.ZodMiniOptional<z.ZodMiniString<string>>;
    }, z.core.$loose>>;
    opencode: z.ZodMiniOptional<z.ZodMiniObject<{
        "allowed-tools": z.ZodMiniOptional<z.ZodMiniArray<z.ZodMiniString<string>>>;
    }, z.core.$loose>>;
    copilot: z.ZodMiniOptional<z.ZodMiniObject<{
        license: z.ZodMiniOptional<z.ZodMiniString<string>>;
    }, z.core.$loose>>;
    roo: z.ZodMiniOptional<z.ZodMiniObject<{}, z.core.$loose>>;
}, z.core.$loose>;
type RulesyncSkillFrontmatterInput = {
    name: string;
    description: string;
    targets?: ("*" | string)[];
    claudecode?: {
        "allowed-tools"?: string[];
    };
    codexcli?: {
        "short-description"?: string;
    };
    opencode?: {
        "allowed-tools"?: string[];
    };
    copilot?: {
        license?: string;
    };
    roo?: Record<string, unknown>;
};
type RulesyncSkillFrontmatter = z.infer<typeof RulesyncSkillFrontmatterSchemaInternal>;
type RulesyncSkillParams = {
    baseDir?: string;
    relativeDirPath?: string;
    dirName: string;
    frontmatter: RulesyncSkillFrontmatterInput;
    body: string;
    otherFiles?: AiDirFile[];
    validate?: boolean;
    global?: boolean;
};
type RulesyncSkillSettablePaths = {
    relativeDirPath: string;
};
type RulesyncSkillFromDirParams = {
    baseDir?: string;
    relativeDirPath?: string;
    dirName: string;
    global?: boolean;
};
/**
 * Represents a Rulesync skill directory with SKILL.md and optional additional files.
 * Extends AiDir to inherit directory management and security features.
 */
declare class RulesyncSkill extends AiDir {
    constructor({ baseDir, relativeDirPath, dirName, frontmatter, body, otherFiles, validate, global, }: RulesyncSkillParams);
    static getSettablePaths(): RulesyncSkillSettablePaths;
    getFrontmatter(): RulesyncSkillFrontmatter;
    getBody(): string;
    validate(): ValidationResult;
    static fromDir({ baseDir, relativeDirPath, dirName, global, }: RulesyncSkillFromDirParams): Promise<RulesyncSkill>;
}

type GenerateResult = {
    rulesCount: number;
    rulesPaths: string[];
    ignoreCount: number;
    ignorePaths: string[];
    mcpCount: number;
    mcpPaths: string[];
    commandsCount: number;
    commandsPaths: string[];
    subagentsCount: number;
    subagentsPaths: string[];
    skillsCount: number;
    skillsPaths: string[];
    hooksCount: number;
    hooksPaths: string[];
    skills: RulesyncSkill[];
    hasDiff: boolean;
};

type GenerateOptions = {
    targets?: ToolTarget[];
    features?: Feature[];
    baseDirs?: string[];
    configPath?: string;
    verbose?: boolean;
    silent?: boolean;
    delete?: boolean;
    global?: boolean;
    simulateCommands?: boolean;
    simulateSubagents?: boolean;
    simulateSkills?: boolean;
    dryRun?: boolean;
    check?: boolean;
};
type ImportOptions = {
    target: ToolTarget;
    features?: Feature[];
    configPath?: string;
    verbose?: boolean;
    silent?: boolean;
    global?: boolean;
};
declare function generate(options?: GenerateOptions): Promise<GenerateResult>;
declare function importFromTool(options: ImportOptions): Promise<ImportResult>;

export { ALL_FEATURES, ALL_TOOL_TARGETS, type Feature, type GenerateOptions, type GenerateResult, type ImportOptions, type ImportResult, type ToolTarget, generate, importFromTool };
