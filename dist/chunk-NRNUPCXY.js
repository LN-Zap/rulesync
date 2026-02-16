// src/utils/error.ts
import { ZodError } from "zod";
function isZodErrorLike(error) {
  return error !== null && typeof error === "object" && "issues" in error && Array.isArray(error.issues) && error.issues.every(
    (issue) => issue !== null && typeof issue === "object" && "path" in issue && Array.isArray(issue.path) && "message" in issue && typeof issue.message === "string"
  );
}
function formatError(error) {
  if (error instanceof ZodError || isZodErrorLike(error)) {
    return `Zod raw error: ${JSON.stringify(error.issues)}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

// src/utils/logger.ts
import { consola } from "consola";

// src/utils/vitest.ts
var isEnvTest = process.env.NODE_ENV === "test";

// src/utils/logger.ts
var Logger = class {
  _verbose = false;
  _silent = false;
  console = consola.withDefaults({
    tag: "rulesync"
  });
  /**
   * Configure logger with verbose and silent mode settings.
   * Handles conflicting flags where silent takes precedence.
   * @param verbose - Enable verbose logging
   * @param silent - Enable silent mode (suppresses all output except errors)
   */
  configure({ verbose, silent }) {
    if (verbose && silent) {
      this._silent = false;
      this.warn("Both --verbose and --silent specified; --silent takes precedence");
    }
    this._silent = silent;
    this._verbose = verbose && !silent;
  }
  get verbose() {
    return this._verbose;
  }
  get silent() {
    return this._silent;
  }
  info(message, ...args) {
    if (isEnvTest || this._silent) return;
    this.console.info(message, ...args);
  }
  // Success (always shown unless silent)
  success(message, ...args) {
    if (isEnvTest || this._silent) return;
    this.console.success(message, ...args);
  }
  // Warning (always shown unless silent)
  warn(message, ...args) {
    if (isEnvTest || this._silent) return;
    this.console.warn(message, ...args);
  }
  // Error (always shown, even in silent mode)
  error(message, ...args) {
    if (isEnvTest) return;
    this.console.error(message, ...args);
  }
  // Debug level (shown only in verbose mode)
  debug(message, ...args) {
    if (isEnvTest || this._silent) return;
    if (this._verbose) {
      this.console.info(message, ...args);
    }
  }
};
var logger = new Logger();

// src/types/features.ts
import { z } from "zod/mini";
var ALL_FEATURES = [
  "rules",
  "ignore",
  "mcp",
  "subagents",
  "commands",
  "skills",
  "hooks"
];
var ALL_FEATURES_WITH_WILDCARD = [...ALL_FEATURES, "*"];
var FeatureSchema = z.enum(ALL_FEATURES);
var FeaturesSchema = z.array(FeatureSchema);
var RulesyncFeaturesSchema = z.union([
  z.array(z.enum(ALL_FEATURES_WITH_WILDCARD)),
  z.record(z.string(), z.array(z.enum(ALL_FEATURES_WITH_WILDCARD)))
]);

// src/types/tool-targets.ts
import { z as z2 } from "zod/mini";
var ALL_TOOL_TARGETS = [
  "agentsmd",
  "agentsskills",
  "antigravity",
  "augmentcode",
  "augmentcode-legacy",
  "claudecode",
  "claudecode-legacy",
  "cline",
  "codexcli",
  "copilot",
  "cursor",
  "factorydroid",
  "geminicli",
  "junie",
  "kilo",
  "kiro",
  "opencode",
  "qwencode",
  "replit",
  "roo",
  "warp",
  "windsurf",
  "zed"
];
var ALL_TOOL_TARGETS_WITH_WILDCARD = [...ALL_TOOL_TARGETS, "*"];
var ToolTargetSchema = z2.enum(ALL_TOOL_TARGETS);
var ToolTargetsSchema = z2.array(ToolTargetSchema);
var RulesyncTargetsSchema = z2.array(z2.enum(ALL_TOOL_TARGETS_WITH_WILDCARD));

// src/config/config-resolver.ts
import { parse as parseJsonc } from "jsonc-parser";
import { dirname as dirname2, join as join3, resolve as resolve2 } from "path";

// src/constants/rulesync-paths.ts
import { join } from "path";
var RULESYNC_CONFIG_RELATIVE_FILE_PATH = "rulesync.jsonc";
var RULESYNC_LOCAL_CONFIG_RELATIVE_FILE_PATH = "rulesync.local.jsonc";
var RULESYNC_RELATIVE_DIR_PATH = ".rulesync";
var RULESYNC_RULES_RELATIVE_DIR_PATH = join(RULESYNC_RELATIVE_DIR_PATH, "rules");
var RULESYNC_COMMANDS_RELATIVE_DIR_PATH = join(RULESYNC_RELATIVE_DIR_PATH, "commands");
var RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH = join(RULESYNC_RELATIVE_DIR_PATH, "subagents");
var RULESYNC_MCP_RELATIVE_FILE_PATH = join(RULESYNC_RELATIVE_DIR_PATH, "mcp.json");
var RULESYNC_HOOKS_RELATIVE_FILE_PATH = join(RULESYNC_RELATIVE_DIR_PATH, "hooks.json");
var RULESYNC_AIIGNORE_FILE_NAME = ".aiignore";
var RULESYNC_AIIGNORE_RELATIVE_FILE_PATH = join(RULESYNC_RELATIVE_DIR_PATH, ".aiignore");
var RULESYNC_IGNORE_RELATIVE_FILE_PATH = ".rulesyncignore";
var RULESYNC_OVERVIEW_FILE_NAME = "overview.md";
var RULESYNC_SKILLS_RELATIVE_DIR_PATH = join(RULESYNC_RELATIVE_DIR_PATH, "skills");
var RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH = join(
  RULESYNC_SKILLS_RELATIVE_DIR_PATH,
  ".curated"
);
var RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH = "rulesync.lock";
var RULESYNC_MCP_FILE_NAME = "mcp.json";
var RULESYNC_HOOKS_FILE_NAME = "hooks.json";
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var FETCH_CONCURRENCY_LIMIT = 10;

// src/utils/file.ts
import { kebabCase } from "es-toolkit";
import { globbySync } from "globby";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import os from "os";
import { dirname, join as join2, relative, resolve } from "path";
async function ensureDir(dirPath) {
  try {
    await stat(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}
async function readOrInitializeFileContent(filePath, initialContent = "") {
  if (await fileExists(filePath)) {
    return await readFileContent(filePath);
  } else {
    await ensureDir(dirname(filePath));
    await writeFileContent(filePath, initialContent);
    return initialContent;
  }
}
function checkPathTraversal({
  relativePath,
  intendedRootDir
}) {
  const segments = relativePath.split(/[/\\]/);
  if (segments.includes("..")) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
  const resolved = resolve(intendedRootDir, relativePath);
  const rel = relative(intendedRootDir, resolved);
  if (rel.startsWith("..") || resolve(resolved) !== resolved) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
}
function resolvePath(relativePath, baseDir) {
  if (!baseDir) return relativePath;
  checkPathTraversal({ relativePath, intendedRootDir: baseDir });
  return resolve(baseDir, relativePath);
}
async function directoryExists(dirPath) {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
async function readFileContent(filepath) {
  logger.debug(`Reading file: ${filepath}`);
  return readFile(filepath, "utf-8");
}
async function readFileContentOrNull(filepath) {
  if (await fileExists(filepath)) {
    return readFileContent(filepath);
  }
  return null;
}
async function readFileBuffer(filepath) {
  logger.debug(`Reading file buffer: ${filepath}`);
  return readFile(filepath);
}
function addTrailingNewline(content) {
  if (!content) {
    return "\n";
  }
  return content.trimEnd() + "\n";
}
async function writeFileContent(filepath, content) {
  logger.debug(`Writing file: ${filepath}`);
  await ensureDir(dirname(filepath));
  await writeFile(filepath, content, "utf-8");
}
async function fileExists(filepath) {
  try {
    await stat(filepath);
    return true;
  } catch {
    return false;
  }
}
async function listDirectoryFiles(dir) {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
async function findFilesByGlobs(globs, options = {}) {
  const { type = "all" } = options;
  const globbyOptions = type === "file" ? { onlyFiles: true, onlyDirectories: false } : type === "dir" ? { onlyFiles: false, onlyDirectories: true } : { onlyFiles: false, onlyDirectories: false };
  const normalizedGlobs = Array.isArray(globs) ? globs.map((g) => g.replaceAll("\\", "/")) : globs.replaceAll("\\", "/");
  const results = globbySync(normalizedGlobs, { absolute: true, ...globbyOptions });
  return results.toSorted();
}
async function removeDirectory(dirPath) {
  const dangerousPaths = [".", "/", "~", "src", "node_modules"];
  if (dangerousPaths.includes(dirPath) || dirPath === "") {
    logger.warn(`Skipping deletion of dangerous path: ${dirPath}`);
    return;
  }
  try {
    if (await fileExists(dirPath)) {
      await rm(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    logger.warn(`Failed to remove directory ${dirPath}:`, error);
  }
}
async function removeFile(filepath) {
  logger.debug(`Removing file: ${filepath}`);
  try {
    if (await fileExists(filepath)) {
      await rm(filepath);
    }
  } catch (error) {
    logger.warn(`Failed to remove file ${filepath}:`, error);
  }
}
function getHomeDirectory() {
  if (isEnvTest) {
    throw new Error("getHomeDirectory() must be mocked in test environment");
  }
  return os.homedir();
}
function validateBaseDir(baseDir) {
  if (baseDir.trim() === "") {
    throw new Error("baseDir cannot be an empty string");
  }
  checkPathTraversal({ relativePath: baseDir, intendedRootDir: process.cwd() });
}
function toKebabCaseFilename(filename) {
  const lastDotIndex = filename.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? filename.slice(lastDotIndex) : "";
  const nameWithoutExt = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  const kebabName = kebabCase(nameWithoutExt);
  return kebabName + extension;
}
async function createTempDirectory(prefix = "rulesync-fetch-") {
  return mkdtemp(join2(os.tmpdir(), prefix));
}
async function removeTempDirectory(tempDir) {
  try {
    await rm(tempDir, { recursive: true, force: true });
    logger.debug(`Removed temp directory: ${tempDir}`);
  } catch {
    logger.debug(`Failed to clean up temp directory: ${tempDir}`);
  }
}

// src/config/config.ts
import { minLength, optional, z as z3 } from "zod/mini";
var SourceEntrySchema = z3.object({
  source: z3.string().check(minLength(1, "source must be a non-empty string")),
  skills: optional(z3.array(z3.string()))
});
var ConfigParamsSchema = z3.object({
  baseDirs: z3.array(z3.string()),
  targets: RulesyncTargetsSchema,
  features: RulesyncFeaturesSchema,
  verbose: z3.boolean(),
  delete: z3.boolean(),
  // New non-experimental options
  global: optional(z3.boolean()),
  silent: optional(z3.boolean()),
  simulateCommands: optional(z3.boolean()),
  simulateSubagents: optional(z3.boolean()),
  simulateSkills: optional(z3.boolean()),
  dryRun: optional(z3.boolean()),
  check: optional(z3.boolean()),
  // Declarative skill sources
  sources: optional(z3.array(SourceEntrySchema))
});
var PartialConfigParamsSchema = z3.partial(ConfigParamsSchema);
var ConfigFileSchema = z3.object({
  $schema: optional(z3.string()),
  ...z3.partial(ConfigParamsSchema).shape
});
var RequiredConfigParamsSchema = z3.required(ConfigParamsSchema);
var CONFLICTING_TARGET_PAIRS = [
  ["augmentcode", "augmentcode-legacy"],
  ["claudecode", "claudecode-legacy"]
];
var LEGACY_TARGETS = ["augmentcode-legacy", "claudecode-legacy"];
var Config = class {
  baseDirs;
  targets;
  features;
  verbose;
  delete;
  global;
  silent;
  simulateCommands;
  simulateSubagents;
  simulateSkills;
  dryRun;
  check;
  sources;
  constructor({
    baseDirs,
    targets,
    features,
    verbose,
    delete: isDelete,
    global,
    silent,
    simulateCommands,
    simulateSubagents,
    simulateSkills,
    dryRun,
    check,
    sources
  }) {
    this.validateConflictingTargets(targets);
    if (dryRun && check) {
      throw new Error("--dry-run and --check cannot be used together");
    }
    this.baseDirs = baseDirs;
    this.targets = targets;
    this.features = features;
    this.verbose = verbose;
    this.delete = isDelete;
    this.global = global ?? false;
    this.silent = silent ?? false;
    this.simulateCommands = simulateCommands ?? false;
    this.simulateSubagents = simulateSubagents ?? false;
    this.simulateSkills = simulateSkills ?? false;
    this.dryRun = dryRun ?? false;
    this.check = check ?? false;
    this.sources = sources ?? [];
  }
  validateConflictingTargets(targets) {
    for (const [target1, target2] of CONFLICTING_TARGET_PAIRS) {
      const hasTarget1 = targets.includes(target1);
      const hasTarget2 = targets.includes(target2);
      if (hasTarget1 && hasTarget2) {
        throw new Error(
          `Conflicting targets: '${target1}' and '${target2}' cannot be used together. Please choose one.`
        );
      }
    }
  }
  getBaseDirs() {
    return this.baseDirs;
  }
  getTargets() {
    if (this.targets.includes("*")) {
      return ALL_TOOL_TARGETS.filter(
        // eslint-disable-next-line no-type-assertion/no-type-assertion
        (target) => !LEGACY_TARGETS.includes(target)
      );
    }
    return this.targets.filter((target) => target !== "*");
  }
  getFeatures(target) {
    if (!Array.isArray(this.features)) {
      const perTargetFeatures = this.features;
      if (target) {
        const targetFeatures = perTargetFeatures[target];
        if (!targetFeatures || targetFeatures.length === 0) {
          return [];
        }
        if (targetFeatures.includes("*")) {
          return [...ALL_FEATURES];
        }
        return targetFeatures.filter((feature) => feature !== "*");
      }
      const allFeatures = [];
      for (const features of Object.values(perTargetFeatures)) {
        if (features && features.length > 0) {
          if (features.includes("*")) {
            return [...ALL_FEATURES];
          }
          for (const feature of features) {
            if (feature !== "*" && !allFeatures.includes(feature)) {
              allFeatures.push(feature);
            }
          }
        }
      }
      return allFeatures;
    }
    if (this.features.includes("*")) {
      return [...ALL_FEATURES];
    }
    return this.features.filter((feature) => feature !== "*");
  }
  /**
   * Check if per-target features configuration is being used.
   */
  hasPerTargetFeatures() {
    return !Array.isArray(this.features);
  }
  getVerbose() {
    return this.verbose;
  }
  getDelete() {
    return this.delete;
  }
  getGlobal() {
    return this.global;
  }
  getSilent() {
    return this.silent;
  }
  getSimulateCommands() {
    return this.simulateCommands;
  }
  getSimulateSubagents() {
    return this.simulateSubagents;
  }
  getSimulateSkills() {
    return this.simulateSkills;
  }
  getDryRun() {
    return this.dryRun;
  }
  getCheck() {
    return this.check;
  }
  getSources() {
    return this.sources;
  }
  /**
   * Returns true if either dry-run or check mode is enabled.
   * In both modes, no files should be written.
   */
  isPreviewMode() {
    return this.dryRun || this.check;
  }
};

// src/config/config-resolver.ts
var getDefaults = () => ({
  targets: ["agentsmd"],
  features: ["rules"],
  verbose: false,
  delete: false,
  baseDirs: [process.cwd()],
  configPath: RULESYNC_CONFIG_RELATIVE_FILE_PATH,
  global: false,
  silent: false,
  simulateCommands: false,
  simulateSubagents: false,
  simulateSkills: false,
  dryRun: false,
  check: false,
  sources: []
});
var loadConfigFromFile = async (filePath) => {
  if (!await fileExists(filePath)) {
    return {};
  }
  try {
    const fileContent = await readFileContent(filePath);
    const jsonData = parseJsonc(fileContent);
    const parsed = ConfigFileSchema.parse(jsonData);
    const { $schema: _schema, ...configParams } = parsed;
    return configParams;
  } catch (error) {
    logger.error(`Failed to load config file "${filePath}": ${formatError(error)}`);
    throw error;
  }
};
var mergeConfigs = (baseConfig, localConfig) => {
  return {
    targets: localConfig.targets ?? baseConfig.targets,
    features: localConfig.features ?? baseConfig.features,
    verbose: localConfig.verbose ?? baseConfig.verbose,
    delete: localConfig.delete ?? baseConfig.delete,
    baseDirs: localConfig.baseDirs ?? baseConfig.baseDirs,
    global: localConfig.global ?? baseConfig.global,
    silent: localConfig.silent ?? baseConfig.silent,
    simulateCommands: localConfig.simulateCommands ?? baseConfig.simulateCommands,
    simulateSubagents: localConfig.simulateSubagents ?? baseConfig.simulateSubagents,
    simulateSkills: localConfig.simulateSkills ?? baseConfig.simulateSkills,
    dryRun: localConfig.dryRun ?? baseConfig.dryRun,
    check: localConfig.check ?? baseConfig.check,
    sources: localConfig.sources ?? baseConfig.sources
  };
};
var ConfigResolver = class {
  static async resolve({
    targets,
    features,
    verbose,
    delete: isDelete,
    baseDirs,
    configPath = getDefaults().configPath,
    global,
    silent,
    simulateCommands,
    simulateSubagents,
    simulateSkills,
    dryRun,
    check
  }) {
    const validatedConfigPath = resolvePath(configPath, process.cwd());
    const baseConfig = await loadConfigFromFile(validatedConfigPath);
    const configDir = dirname2(validatedConfigPath);
    const localConfigPath = join3(configDir, RULESYNC_LOCAL_CONFIG_RELATIVE_FILE_PATH);
    const localConfig = await loadConfigFromFile(localConfigPath);
    const configByFile = mergeConfigs(baseConfig, localConfig);
    const resolvedGlobal = global ?? configByFile.global ?? getDefaults().global;
    const resolvedSimulateCommands = simulateCommands ?? configByFile.simulateCommands ?? getDefaults().simulateCommands;
    const resolvedSimulateSubagents = simulateSubagents ?? configByFile.simulateSubagents ?? getDefaults().simulateSubagents;
    const resolvedSimulateSkills = simulateSkills ?? configByFile.simulateSkills ?? getDefaults().simulateSkills;
    const configParams = {
      targets: targets ?? configByFile.targets ?? getDefaults().targets,
      features: features ?? configByFile.features ?? getDefaults().features,
      verbose: verbose ?? configByFile.verbose ?? getDefaults().verbose,
      delete: isDelete ?? configByFile.delete ?? getDefaults().delete,
      baseDirs: getBaseDirsInLightOfGlobal({
        baseDirs: baseDirs ?? configByFile.baseDirs ?? getDefaults().baseDirs,
        global: resolvedGlobal
      }),
      global: resolvedGlobal,
      silent: silent ?? configByFile.silent ?? getDefaults().silent,
      simulateCommands: resolvedSimulateCommands,
      simulateSubagents: resolvedSimulateSubagents,
      simulateSkills: resolvedSimulateSkills,
      dryRun: dryRun ?? configByFile.dryRun ?? getDefaults().dryRun,
      check: check ?? configByFile.check ?? getDefaults().check,
      sources: configByFile.sources ?? getDefaults().sources
    };
    return new Config(configParams);
  }
};
function getBaseDirsInLightOfGlobal({
  baseDirs,
  global
}) {
  if (global) {
    return [getHomeDirectory()];
  }
  const resolvedBaseDirs = baseDirs.map((baseDir) => resolve2(baseDir));
  resolvedBaseDirs.forEach((baseDir) => {
    validateBaseDir(baseDir);
  });
  return resolvedBaseDirs;
}

// src/lib/generate.ts
import { intersection } from "es-toolkit";
import { join as join109 } from "path";

// src/features/commands/commands-processor.ts
import { basename as basename16, join as join19 } from "path";
import { z as z12 } from "zod/mini";

// src/types/feature-processor.ts
var FeatureProcessor = class {
  baseDir;
  dryRun;
  constructor({ baseDir = process.cwd(), dryRun = false }) {
    this.baseDir = baseDir;
    this.dryRun = dryRun;
  }
  /**
   * Return tool targets that this feature supports.
   */
  static getToolTargets(_params = {}) {
    throw new Error("Not implemented");
  }
  /**
   * Once converted to rulesync/tool files, write them to the filesystem.
   * Returns the count and paths of files written.
   */
  async writeAiFiles(aiFiles) {
    let changedCount = 0;
    const changedPaths = [];
    for (const aiFile of aiFiles) {
      const filePath = aiFile.getFilePath();
      const contentWithNewline = addTrailingNewline(aiFile.getFileContent());
      const existingContent = await readFileContentOrNull(filePath);
      if (existingContent === contentWithNewline) {
        continue;
      }
      if (this.dryRun) {
        logger.info(`[DRY RUN] Would write: ${filePath}`);
      } else {
        await writeFileContent(filePath, contentWithNewline);
      }
      changedCount++;
      changedPaths.push(aiFile.getRelativePathFromCwd());
    }
    return { count: changedCount, paths: changedPaths };
  }
  async removeAiFiles(aiFiles) {
    for (const aiFile of aiFiles) {
      await removeFile(aiFile.getFilePath());
    }
  }
  /**
   * Remove orphan files that exist in the tool directory but not in the generated files.
   * This only deletes files that are no longer in the rulesync source, not files that will be overwritten.
   */
  async removeOrphanAiFiles(existingFiles, generatedFiles) {
    const generatedPaths = new Set(generatedFiles.map((f) => f.getFilePath()));
    const orphanFiles = existingFiles.filter((f) => !generatedPaths.has(f.getFilePath()));
    for (const aiFile of orphanFiles) {
      const filePath = aiFile.getFilePath();
      if (this.dryRun) {
        logger.info(`[DRY RUN] Would delete: ${filePath}`);
      } else {
        await removeFile(filePath);
      }
    }
    return orphanFiles.length;
  }
};

// src/features/commands/agentsmd-command.ts
import { basename as basename2, join as join5 } from "path";

// src/utils/frontmatter.ts
import matter from "gray-matter";
function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function deepRemoveNullishValue(value) {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (Array.isArray(value)) {
    const cleanedArray = value.map((item) => deepRemoveNullishValue(item)).filter((item) => item !== void 0);
    return cleanedArray;
  }
  if (isPlainObject(value)) {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      const cleaned = deepRemoveNullishValue(val);
      if (cleaned !== void 0) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return value;
}
function deepRemoveNullishObject(obj) {
  if (!obj || typeof obj !== "object") {
    return {};
  }
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const cleaned = deepRemoveNullishValue(val);
    if (cleaned !== void 0) {
      result[key] = cleaned;
    }
  }
  return result;
}
function stringifyFrontmatter(body, frontmatter) {
  const cleanFrontmatter = deepRemoveNullishObject(frontmatter);
  return matter.stringify(body, cleanFrontmatter);
}
function parseFrontmatter(content) {
  const { data: frontmatter, content: body } = matter(content);
  const cleanFrontmatter = deepRemoveNullishObject(frontmatter);
  return { frontmatter: cleanFrontmatter, body };
}

// src/features/commands/simulated-command.ts
import { basename, join as join4 } from "path";
import { z as z4 } from "zod/mini";

// src/types/ai-file.ts
import path, { relative as relative2, resolve as resolve3 } from "path";
var AiFile = class {
  /**
   * @example "."
   */
  baseDir;
  /**
   * @example ".claude/agents"
   */
  relativeDirPath;
  /**
   * @example "planner.md"
   */
  relativeFilePath;
  /**
   * Whole raw file content
   */
  fileContent;
  /**
   * @example true
   */
  global;
  constructor({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    fileContent,
    global = false
  }) {
    this.baseDir = baseDir;
    this.relativeDirPath = relativeDirPath;
    this.relativeFilePath = relativeFilePath;
    this.fileContent = fileContent;
    this.global = global;
  }
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  getBaseDir() {
    return this.baseDir;
  }
  getRelativeDirPath() {
    return this.relativeDirPath;
  }
  getRelativeFilePath() {
    return this.relativeFilePath;
  }
  getFilePath() {
    const fullPath = path.join(this.baseDir, this.relativeDirPath, this.relativeFilePath);
    const resolvedFull = resolve3(fullPath);
    const resolvedBase = resolve3(this.baseDir);
    const rel = relative2(resolvedBase, resolvedFull);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error(
        `Path traversal detected: Final path escapes baseDir. baseDir="${this.baseDir}", relativeDirPath="${this.relativeDirPath}", relativeFilePath="${this.relativeFilePath}"`
      );
    }
    return fullPath;
  }
  getFileContent() {
    return this.fileContent;
  }
  getRelativePathFromCwd() {
    return path.join(this.relativeDirPath, this.relativeFilePath);
  }
  setFileContent(newFileContent) {
    this.fileContent = newFileContent;
  }
  /**
   * Returns whether this file can be deleted by rulesync.
   * Override in subclasses that should not be deleted (e.g., user-managed config files).
   */
  isDeletable() {
    return true;
  }
};

// src/features/commands/tool-command.ts
var ToolCommand = class extends AiFile {
  static getSettablePaths() {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Load a command from a tool-specific file path.
   *
   * This method should:
   * 1. Read the file content
   * 2. Parse tool-specific frontmatter format
   * 3. Validate the parsed data
   * 4. Return a concrete ToolCommand instance
   *
   * @param params - Parameters including the file path to load
   * @returns Promise resolving to a concrete ToolCommand instance
   */
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Create a minimal instance for deletion purposes.
   * This method does not read or parse file content, making it safe to use
   * even when files have old/incompatible formats.
   *
   * @param params - Parameters including the file path
   * @returns A concrete ToolCommand instance with minimal data for deletion
   */
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Convert a RulesyncCommand to the tool-specific command format.
   *
   * This method should:
   * 1. Extract relevant data from the RulesyncCommand
   * 2. Transform frontmatter to tool-specific format
   * 3. Transform body content if needed
   * 4. Return a concrete ToolCommand instance
   *
   * @param params - Parameters including the RulesyncCommand to convert
   * @returns A concrete ToolCommand instance
   */
  static fromRulesyncCommand(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Check if this tool is targeted by a RulesyncCommand based on its targets field.
   * Subclasses should override this to provide specific targeting logic.
   *
   * @param rulesyncCommand - The RulesyncCommand to check
   * @returns True if this tool is targeted by the command
   */
  static isTargetedByRulesyncCommand(_rulesyncCommand) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Default implementation for checking if a tool is targeted by a RulesyncCommand.
   * Checks if the command's targets include the tool target or a wildcard.
   *
   * @param params - Parameters including the RulesyncCommand and tool target
   * @returns True if the tool target is included in the command's targets
   */
  static isTargetedByRulesyncCommandDefault({
    rulesyncCommand,
    toolTarget
  }) {
    const targets = rulesyncCommand.getFrontmatter().targets;
    if (!targets) {
      return true;
    }
    if (targets.includes("*")) {
      return true;
    }
    if (targets.includes(toolTarget)) {
      return true;
    }
    return false;
  }
};

// src/features/commands/simulated-command.ts
var SimulatedCommandFrontmatterSchema = z4.object({
  description: z4.string()
});
var SimulatedCommand = class _SimulatedCommand extends ToolCommand {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = SimulatedCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join4(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncCommand() {
    throw new Error("Not implemented because it is a SIMULATED file.");
  }
  static fromRulesyncCommandDefault({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const claudecodeFrontmatter = {
      description: rulesyncFrontmatter.description
    };
    const body = rulesyncCommand.getBody();
    return {
      baseDir,
      frontmatter: claudecodeFrontmatter,
      body,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    };
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = SimulatedCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join4(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static async fromFileDefault({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const filePath = join4(
      baseDir,
      _SimulatedCommand.getSettablePaths().relativeDirPath,
      relativeFilePath
    );
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = SimulatedCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return {
      baseDir,
      relativeDirPath: _SimulatedCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: basename(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    };
  }
  static forDeletionDefault({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return {
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "" },
      body: "",
      validate: false
    };
  }
};

// src/features/commands/agentsmd-command.ts
var AgentsmdCommand = class _AgentsmdCommand extends SimulatedCommand {
  static getSettablePaths() {
    return {
      relativeDirPath: join5(".agents", "commands")
    };
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    return new _AgentsmdCommand(
      this.fromRulesyncCommandDefault({ baseDir, rulesyncCommand, validate })
    );
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const filePath = join5(
      baseDir,
      _AgentsmdCommand.getSettablePaths().relativeDirPath,
      relativeFilePath
    );
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = SimulatedCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _AgentsmdCommand({
      baseDir,
      relativeDirPath: _AgentsmdCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: basename2(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    });
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "agentsmd"
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _AgentsmdCommand(
      this.forDeletionDefault({ baseDir, relativeDirPath, relativeFilePath })
    );
  }
};

// src/features/commands/antigravity-command.ts
import { basename as basename4, join as join7 } from "path";
import { z as z6 } from "zod/mini";

// src/utils/type-guards.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/features/commands/rulesync-command.ts
import { basename as basename3, join as join6 } from "path";
import { z as z5 } from "zod/mini";

// src/types/rulesync-file.ts
var RulesyncFile = class extends AiFile {
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
};

// src/features/commands/rulesync-command.ts
var RulesyncCommandFrontmatterSchema = z5.looseObject({
  targets: z5._default(RulesyncTargetsSchema, ["*"]),
  description: z5.string()
});
var RulesyncCommand = class _RulesyncCommand extends RulesyncFile {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    const parseResult = RulesyncCommandFrontmatterSchema.safeParse(frontmatter);
    if (!parseResult.success && rest.validate) {
      throw new Error(
        `Invalid frontmatter in ${join6(rest.baseDir ?? process.cwd(), rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(parseResult.error)}`
      );
    }
    const parsedFrontmatter = parseResult.success ? { ...frontmatter, ...parseResult.data } : { ...frontmatter, targets: frontmatter.targets ?? ["*"] };
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, parsedFrontmatter)
    });
    this.frontmatter = parsedFrontmatter;
    this.body = body;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: RULESYNC_COMMANDS_RELATIVE_DIR_PATH
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = RulesyncCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join6(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static async fromFile({
    relativeFilePath
  }) {
    const filePath = join6(
      process.cwd(),
      _RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath
    );
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = RulesyncCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${relativeFilePath}: ${formatError(result.error)}`);
    }
    const filename = basename3(relativeFilePath);
    return new _RulesyncCommand({
      baseDir: process.cwd(),
      relativeDirPath: _RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: filename,
      frontmatter: result.data,
      body: content.trim(),
      fileContent
    });
  }
};

// src/features/commands/antigravity-command.ts
var AntigravityWorkflowFrontmatterSchema = z6.looseObject({
  trigger: z6.optional(z6.string()),
  turbo: z6.optional(z6.boolean())
});
var AntigravityCommandFrontmatterSchema = z6.looseObject({
  description: z6.string(),
  // Support for workflow-specific configuration
  ...AntigravityWorkflowFrontmatterSchema.shape
});
var AntigravityCommand = class _AntigravityCommand extends ToolCommand {
  frontmatter;
  body;
  static getSettablePaths() {
    return {
      relativeDirPath: join7(".agent", "workflows")
    };
  }
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = AntigravityCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join7(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncCommand() {
    const { description, ...restFields } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["antigravity"],
      description,
      // Preserve extra fields in antigravity section
      ...Object.keys(restFields).length > 0 && { antigravity: restFields }
    };
    const fileContent = stringifyFrontmatter(this.body, rulesyncFrontmatter);
    return new RulesyncCommand({
      baseDir: ".",
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent,
      validate: true
    });
  }
  static extractAntigravityConfig(rulesyncCommand) {
    const antigravity = rulesyncCommand.getFrontmatter().antigravity;
    return isRecord(antigravity) ? antigravity : void 0;
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const antigravityConfig = this.extractAntigravityConfig(rulesyncCommand);
    const trigger = this.resolveTrigger(rulesyncCommand, antigravityConfig);
    const turbo = typeof antigravityConfig?.turbo === "boolean" ? antigravityConfig.turbo : true;
    let relativeFilePath = rulesyncCommand.getRelativeFilePath();
    let body = rulesyncCommand.getBody().replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
    const sanitizedTrigger = trigger.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    if (!sanitizedTrigger) {
      throw new Error(`Invalid trigger: sanitization resulted in empty string from "${trigger}"`);
    }
    const validFilename = sanitizedTrigger + ".md";
    relativeFilePath = validFilename;
    const turboDirective = turbo ? "\n\n// turbo" : "";
    body = `# Workflow: ${trigger}

${body}${turboDirective}`;
    const description = rulesyncFrontmatter.description;
    const antigravityFrontmatter = {
      description,
      trigger,
      turbo
    };
    const fileContent = stringifyFrontmatter(body, antigravityFrontmatter);
    return new _AntigravityCommand({
      baseDir,
      frontmatter: antigravityFrontmatter,
      body,
      relativeDirPath: _AntigravityCommand.getSettablePaths().relativeDirPath,
      relativeFilePath,
      fileContent,
      validate
    });
  }
  static resolveTrigger(rulesyncCommand, antigravityConfig) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const antigravityTrigger = antigravityConfig && typeof antigravityConfig.trigger === "string" ? antigravityConfig.trigger : void 0;
    const rootTrigger = typeof rulesyncFrontmatter.trigger === "string" ? rulesyncFrontmatter.trigger : void 0;
    const bodyTriggerMatch = rulesyncCommand.getBody().match(/trigger:\s*(\/[\w-]+)/);
    const filenameTrigger = `/${basename4(rulesyncCommand.getRelativeFilePath(), ".md")}`;
    return antigravityTrigger || rootTrigger || (bodyTriggerMatch ? bodyTriggerMatch[1] : void 0) || filenameTrigger;
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = AntigravityCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join7(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "antigravity"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const filePath = join7(
      baseDir,
      _AntigravityCommand.getSettablePaths().relativeDirPath,
      relativeFilePath
    );
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = AntigravityCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _AntigravityCommand({
      baseDir,
      relativeDirPath: _AntigravityCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: basename4(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _AntigravityCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "" },
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/claudecode-command.ts
import { basename as basename5, join as join8 } from "path";
import { z as z7 } from "zod/mini";
var ClaudecodeCommandFrontmatterSchema = z7.looseObject({
  description: z7.string(),
  "allowed-tools": z7.optional(z7.union([z7.string(), z7.array(z7.string())])),
  "argument-hint": z7.optional(z7.string()),
  model: z7.optional(z7.string()),
  "disable-model-invocation": z7.optional(z7.boolean())
});
var ClaudecodeCommand = class _ClaudecodeCommand extends ToolCommand {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = ClaudecodeCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join8(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join8(".claude", "commands")
    };
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncCommand() {
    const { description, ...restFields } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["*"],
      description,
      // Preserve extra fields in claudecode section
      ...Object.keys(restFields).length > 0 && { claudecode: restFields }
    };
    const fileContent = stringifyFrontmatter(this.body, rulesyncFrontmatter);
    return new RulesyncCommand({
      baseDir: ".",
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent,
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const claudecodeFields = rulesyncFrontmatter.claudecode ?? {};
    const claudecodeFrontmatter = {
      description: rulesyncFrontmatter.description,
      ...claudecodeFields
    };
    const body = rulesyncCommand.getBody();
    const paths = this.getSettablePaths({ global });
    return new _ClaudecodeCommand({
      baseDir,
      frontmatter: claudecodeFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = ClaudecodeCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join8(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "claudecode"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join8(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = ClaudecodeCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _ClaudecodeCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename5(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClaudecodeCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "" },
      body: "",
      validate: false
    });
  }
};

// src/features/commands/cline-command.ts
import { basename as basename6, join as join9 } from "path";
var ClineCommand = class _ClineCommand extends ToolCommand {
  static getSettablePaths({ global } = {}) {
    if (global) {
      return {
        relativeDirPath: join9("Documents", "Cline", "Workflows")
      };
    }
    return {
      relativeDirPath: join9(".clinerules", "workflows")
    };
  }
  toRulesyncCommand() {
    const rulesyncFrontmatter = {
      targets: ["*"],
      description: ""
    };
    return new RulesyncCommand({
      baseDir: process.cwd(),
      frontmatter: rulesyncFrontmatter,
      body: this.getFileContent(),
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: this.getFileContent(),
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _ClineCommand({
      baseDir,
      fileContent: rulesyncCommand.getBody(),
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    return { success: true, error: null };
  }
  getBody() {
    return this.getFileContent();
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "cline"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join9(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { body: content } = parseFrontmatter(fileContent);
    return new _ClineCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename6(relativeFilePath),
      fileContent: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClineCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/codexcli-command.ts
import { basename as basename7, join as join10 } from "path";
var CodexcliCommand = class _CodexcliCommand extends ToolCommand {
  static getSettablePaths({ global } = {}) {
    if (!global) {
      throw new Error("CodexcliCommand only supports global mode. Please pass { global: true }.");
    }
    return {
      relativeDirPath: join10(".codex", "prompts")
    };
  }
  toRulesyncCommand() {
    const rulesyncFrontmatter = {
      targets: ["*"],
      description: ""
    };
    return new RulesyncCommand({
      baseDir: ".",
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.getFileContent(),
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: this.getFileContent(),
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _CodexcliCommand({
      baseDir,
      fileContent: rulesyncCommand.getBody(),
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    return { success: true, error: null };
  }
  getBody() {
    return this.getFileContent();
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "codexcli"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join10(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { body: content } = parseFrontmatter(fileContent);
    return new _CodexcliCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename7(relativeFilePath),
      fileContent: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CodexcliCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/copilot-command.ts
import { basename as basename8, join as join11 } from "path";
import { z as z8 } from "zod/mini";
var CopilotCommandFrontmatterSchema = z8.looseObject({
  mode: z8.optional(z8.string()),
  description: z8.string()
});
var CopilotCommand = class _CopilotCommand extends ToolCommand {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = CopilotCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join11(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: join11(".github", "prompts")
    };
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncCommand() {
    const { mode: _mode, description, ...restFields } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["*"],
      description,
      // Preserve extra fields in copilot section (excluding mode which is fixed)
      ...Object.keys(restFields).length > 0 && { copilot: restFields }
    };
    const originalFilePath = this.relativeFilePath;
    const relativeFilePath = originalFilePath.replace(/\.prompt\.md$/, ".md");
    return new RulesyncCommand({
      baseDir: this.baseDir,
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath,
      fileContent: this.getFileContent(),
      validate: true
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = CopilotCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join11(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const copilotFields = rulesyncFrontmatter.copilot ?? {};
    const copilotFrontmatter = {
      description: rulesyncFrontmatter.description,
      ...copilotFields
    };
    const body = rulesyncCommand.getBody();
    const originalFilePath = rulesyncCommand.getRelativeFilePath();
    const relativeFilePath = originalFilePath.replace(/\.md$/, ".prompt.md");
    return new _CopilotCommand({
      baseDir,
      frontmatter: copilotFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      validate
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const filePath = join11(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = CopilotCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _CopilotCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename8(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    });
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "copilot"
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CopilotCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "" },
      body: "",
      validate: false
    });
  }
};

// src/features/commands/cursor-command.ts
import { basename as basename9, join as join12 } from "path";
var CursorCommand = class _CursorCommand extends ToolCommand {
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join12(".cursor", "commands")
    };
  }
  toRulesyncCommand() {
    const rulesyncFrontmatter = {
      targets: ["*"],
      description: ""
    };
    return new RulesyncCommand({
      baseDir: process.cwd(),
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.getFileContent(),
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: this.getFileContent(),
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _CursorCommand({
      baseDir,
      fileContent: rulesyncCommand.getBody(),
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    return { success: true, error: null };
  }
  getBody() {
    return this.getFileContent();
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "cursor"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join12(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { body: content } = parseFrontmatter(fileContent);
    return new _CursorCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename9(relativeFilePath),
      fileContent: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CursorCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/factorydroid-command.ts
import { basename as basename10, join as join13 } from "path";
var FactorydroidCommand = class _FactorydroidCommand extends SimulatedCommand {
  static getSettablePaths(_options) {
    return {
      relativeDirPath: join13(".factory", "commands")
    };
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    return new _FactorydroidCommand(
      this.fromRulesyncCommandDefault({ baseDir, rulesyncCommand, validate, global })
    );
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = _FactorydroidCommand.getSettablePaths({ global });
    const filePath = join13(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = SimulatedCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _FactorydroidCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename10(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    });
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "factorydroid"
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _FactorydroidCommand(
      this.forDeletionDefault({ baseDir, relativeDirPath, relativeFilePath })
    );
  }
};

// src/features/commands/geminicli-command.ts
import { basename as basename11, join as join14 } from "path";
import { parse as parseToml } from "smol-toml";
import { z as z9 } from "zod/mini";
var GeminiCliCommandFrontmatterSchema = z9.looseObject({
  description: z9.optional(z9.string()),
  prompt: z9.string()
});
var GeminiCliCommand = class _GeminiCliCommand extends ToolCommand {
  frontmatter;
  body;
  constructor(params) {
    super(params);
    const parsed = this.parseTomlContent(this.fileContent);
    this.frontmatter = parsed;
    this.body = parsed.prompt;
  }
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join14(".gemini", "commands")
    };
  }
  parseTomlContent(content) {
    try {
      const parsed = parseToml(content);
      const result = GeminiCliCommandFrontmatterSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join14(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
      return {
        ...result.data,
        description: result.data.description || ""
      };
    } catch (error) {
      throw new Error(
        `Failed to parse TOML command file (${join14(this.relativeDirPath, this.relativeFilePath)}): ${formatError(error)}`,
        { cause: error }
      );
    }
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return {
      description: this.frontmatter.description,
      prompt: this.frontmatter.prompt
    };
  }
  toRulesyncCommand() {
    const { description, prompt: _prompt, ...restFields } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["geminicli"],
      description: description ?? "",
      // Preserve extra fields in geminicli section (excluding prompt which is the body)
      ...Object.keys(restFields).length > 0 && { geminicli: restFields }
    };
    const fileContent = stringifyFrontmatter(this.body, rulesyncFrontmatter);
    return new RulesyncCommand({
      baseDir: process.cwd(),
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent,
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const geminicliFields = rulesyncFrontmatter.geminicli ?? {};
    const geminiFrontmatter = {
      description: rulesyncFrontmatter.description,
      prompt: rulesyncCommand.getBody(),
      ...geminicliFields
    };
    const tomlContent = `description = "${geminiFrontmatter.description}"
prompt = """
${geminiFrontmatter.prompt}
"""`;
    const paths = this.getSettablePaths({ global });
    return new _GeminiCliCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath().replace(".md", ".toml"),
      fileContent: tomlContent,
      validate
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join14(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    return new _GeminiCliCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename11(relativeFilePath),
      fileContent,
      validate
    });
  }
  validate() {
    try {
      this.parseTomlContent(this.fileContent);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "geminicli"
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const placeholderToml = `description = ""
prompt = ""`;
    return new _GeminiCliCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: placeholderToml,
      validate: false
    });
  }
};

// src/features/commands/kilo-command.ts
import { basename as basename12, join as join15 } from "path";
var KiloCommand = class _KiloCommand extends ToolCommand {
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join15(".kilocode", "workflows")
    };
  }
  toRulesyncCommand() {
    const rulesyncFrontmatter = {
      targets: ["*"],
      description: ""
    };
    return new RulesyncCommand({
      baseDir: process.cwd(),
      frontmatter: rulesyncFrontmatter,
      body: this.getFileContent(),
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: this.getFileContent(),
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    return new _KiloCommand({
      baseDir,
      fileContent: rulesyncCommand.getBody(),
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    return { success: true, error: null };
  }
  getBody() {
    return this.getFileContent();
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "kilo"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const filePath = join15(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { body: content } = parseFrontmatter(fileContent);
    return new _KiloCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename12(relativeFilePath),
      fileContent: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiloCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/kiro-command.ts
import { basename as basename13, join as join16 } from "path";
var KiroCommand = class _KiroCommand extends ToolCommand {
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join16(".kiro", "prompts")
    };
  }
  toRulesyncCommand() {
    const rulesyncFrontmatter = {
      targets: ["*"],
      description: ""
    };
    return new RulesyncCommand({
      baseDir: process.cwd(),
      frontmatter: rulesyncFrontmatter,
      body: this.getFileContent(),
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: this.getFileContent(),
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    return new _KiroCommand({
      baseDir,
      fileContent: rulesyncCommand.getBody(),
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    return { success: true, error: null };
  }
  getBody() {
    return this.getFileContent();
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "kiro"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const filePath = join16(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { body: content } = parseFrontmatter(fileContent);
    return new _KiroCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename13(relativeFilePath),
      fileContent: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiroCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/opencode-command.ts
import { basename as basename14, join as join17 } from "path";
import { optional as optional2, z as z10 } from "zod/mini";
var OpenCodeCommandFrontmatterSchema = z10.looseObject({
  description: z10.string(),
  agent: optional2(z10.string()),
  subtask: optional2(z10.boolean()),
  model: optional2(z10.string())
});
var OpenCodeCommand = class _OpenCodeCommand extends ToolCommand {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = OpenCodeCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join17(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths({ global } = {}) {
    return {
      relativeDirPath: global ? join17(".config", "opencode", "command") : join17(".opencode", "command")
    };
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncCommand() {
    const { description, ...restFields } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["*"],
      description,
      ...Object.keys(restFields).length > 0 && { opencode: restFields }
    };
    const fileContent = stringifyFrontmatter(this.body, rulesyncFrontmatter);
    return new RulesyncCommand({
      baseDir: process.cwd(),
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent,
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const opencodeFields = rulesyncFrontmatter.opencode ?? {};
    const opencodeFrontmatter = {
      description: rulesyncFrontmatter.description,
      ...opencodeFields
    };
    const body = rulesyncCommand.getBody();
    const paths = this.getSettablePaths({ global });
    return new _OpenCodeCommand({
      baseDir,
      frontmatter: opencodeFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      validate
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = OpenCodeCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    }
    return {
      success: false,
      error: new Error(
        `Invalid frontmatter in ${join17(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
      )
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join17(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = OpenCodeCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _OpenCodeCommand({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: basename14(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    });
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "opencode"
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _OpenCodeCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "" },
      body: "",
      validate: false
    });
  }
};

// src/features/commands/roo-command.ts
import { basename as basename15, join as join18 } from "path";
import { optional as optional3, z as z11 } from "zod/mini";
var RooCommandFrontmatterSchema = z11.looseObject({
  description: z11.string(),
  "argument-hint": optional3(z11.string())
});
var RooCommand = class _RooCommand extends ToolCommand {
  frontmatter;
  body;
  static getSettablePaths() {
    return {
      relativeDirPath: join18(".roo", "commands")
    };
  }
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = RooCommandFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join18(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncCommand() {
    const { description, ...restFields } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["roo"],
      description,
      // Preserve extra fields in roo section
      ...Object.keys(restFields).length > 0 && { roo: restFields }
    };
    const fileContent = stringifyFrontmatter(this.body, rulesyncFrontmatter);
    return new RulesyncCommand({
      baseDir: ".",
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RulesyncCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent,
      validate: true
    });
  }
  static fromRulesyncCommand({
    baseDir = process.cwd(),
    rulesyncCommand,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncCommand.getFrontmatter();
    const rooFields = rulesyncFrontmatter.roo ?? {};
    const rooFrontmatter = {
      description: rulesyncFrontmatter.description,
      ...rooFields
    };
    const body = rulesyncCommand.getBody();
    const fileContent = stringifyFrontmatter(body, rooFrontmatter);
    return new _RooCommand({
      baseDir,
      frontmatter: rooFrontmatter,
      body,
      relativeDirPath: _RooCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: rulesyncCommand.getRelativeFilePath(),
      fileContent,
      validate
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = RooCommandFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join18(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static isTargetedByRulesyncCommand(rulesyncCommand) {
    return this.isTargetedByRulesyncCommandDefault({
      rulesyncCommand,
      toolTarget: "roo"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const filePath = join18(baseDir, _RooCommand.getSettablePaths().relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = RooCommandFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _RooCommand({
      baseDir,
      relativeDirPath: _RooCommand.getSettablePaths().relativeDirPath,
      relativeFilePath: basename15(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _RooCommand({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "" },
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/commands/commands-processor.ts
var commandsProcessorToolTargetTuple = [
  "agentsmd",
  "antigravity",
  "claudecode",
  "claudecode-legacy",
  "cline",
  "codexcli",
  "copilot",
  "cursor",
  "factorydroid",
  "geminicli",
  "kilo",
  "kiro",
  "opencode",
  "roo"
];
var CommandsProcessorToolTargetSchema = z12.enum(commandsProcessorToolTargetTuple);
var toolCommandFactories = /* @__PURE__ */ new Map([
  [
    "agentsmd",
    {
      class: AgentsmdCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: false, isSimulated: true }
    }
  ],
  [
    "antigravity",
    {
      class: AntigravityCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: false, isSimulated: false }
    }
  ],
  [
    "claudecode",
    {
      class: ClaudecodeCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "claudecode-legacy",
    {
      class: ClaudecodeCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "cline",
    {
      class: ClineCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "codexcli",
    {
      class: CodexcliCommand,
      meta: { extension: "md", supportsProject: false, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "copilot",
    {
      class: CopilotCommand,
      meta: {
        extension: "prompt.md",
        supportsProject: true,
        supportsGlobal: false,
        isSimulated: false
      }
    }
  ],
  [
    "cursor",
    {
      class: CursorCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "factorydroid",
    {
      class: FactorydroidCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: true }
    }
  ],
  [
    "geminicli",
    {
      class: GeminiCliCommand,
      meta: { extension: "toml", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "kilo",
    {
      class: KiloCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "kiro",
    {
      class: KiroCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: false, isSimulated: false }
    }
  ],
  [
    "opencode",
    {
      class: OpenCodeCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: true, isSimulated: false }
    }
  ],
  [
    "roo",
    {
      class: RooCommand,
      meta: { extension: "md", supportsProject: true, supportsGlobal: false, isSimulated: false }
    }
  ]
]);
var defaultGetFactory = (target) => {
  const factory = toolCommandFactories.get(target);
  if (!factory) {
    throw new Error(`Unsupported tool target: ${target}`);
  }
  return factory;
};
var allToolTargetKeys = [...toolCommandFactories.keys()];
var commandsProcessorToolTargets = allToolTargetKeys.filter((target) => {
  const factory = toolCommandFactories.get(target);
  return factory?.meta.supportsProject ?? false;
});
var commandsProcessorToolTargetsSimulated = allToolTargetKeys.filter((target) => {
  const factory = toolCommandFactories.get(target);
  return factory?.meta.isSimulated ?? false;
});
var commandsProcessorToolTargetsGlobal = allToolTargetKeys.filter(
  (target) => {
    const factory = toolCommandFactories.get(target);
    return factory?.meta.supportsGlobal ?? false;
  }
);
var CommandsProcessor = class extends FeatureProcessor {
  toolTarget;
  global;
  getFactory;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    global = false,
    getFactory = defaultGetFactory,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = CommandsProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for CommandsProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.global = global;
    this.getFactory = getFactory;
  }
  async convertRulesyncFilesToToolFiles(rulesyncFiles) {
    const rulesyncCommands = rulesyncFiles.filter(
      (file) => file instanceof RulesyncCommand
    );
    const factory = this.getFactory(this.toolTarget);
    const toolCommands = rulesyncCommands.map((rulesyncCommand) => {
      if (!factory.class.isTargetedByRulesyncCommand(rulesyncCommand)) {
        return null;
      }
      return factory.class.fromRulesyncCommand({
        baseDir: this.baseDir,
        rulesyncCommand,
        global: this.global
      });
    }).filter((command) => command !== null);
    return toolCommands;
  }
  async convertToolFilesToRulesyncFiles(toolFiles) {
    const toolCommands = toolFiles.filter(
      (file) => file instanceof ToolCommand
    );
    const rulesyncCommands = toolCommands.map((toolCommand) => {
      return toolCommand.toRulesyncCommand();
    });
    return rulesyncCommands;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load and parse rulesync command files from .rulesync/commands/ directory
   */
  async loadRulesyncFiles() {
    const rulesyncCommandPaths = await findFilesByGlobs(
      join19(RulesyncCommand.getSettablePaths().relativeDirPath, "*.md")
    );
    const rulesyncCommands = await Promise.all(
      rulesyncCommandPaths.map(
        (path3) => RulesyncCommand.fromFile({ relativeFilePath: basename16(path3) })
      )
    );
    logger.debug(`Successfully loaded ${rulesyncCommands.length} rulesync commands`);
    return rulesyncCommands;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load tool-specific command configurations and parse them into ToolCommand instances
   */
  async loadToolFiles({
    forDeletion = false
  } = {}) {
    const factory = this.getFactory(this.toolTarget);
    const paths = factory.class.getSettablePaths({ global: this.global });
    const commandFilePaths = await findFilesByGlobs(
      join19(this.baseDir, paths.relativeDirPath, `*.${factory.meta.extension}`)
    );
    if (forDeletion) {
      const toolCommands2 = commandFilePaths.map(
        (path3) => factory.class.forDeletion({
          baseDir: this.baseDir,
          relativeDirPath: paths.relativeDirPath,
          relativeFilePath: basename16(path3),
          global: this.global
        })
      ).filter((cmd) => cmd.isDeletable());
      logger.debug(`Successfully loaded ${toolCommands2.length} ${paths.relativeDirPath} commands`);
      return toolCommands2;
    }
    const toolCommands = await Promise.all(
      commandFilePaths.map(
        (path3) => factory.class.fromFile({
          baseDir: this.baseDir,
          relativeFilePath: basename16(path3),
          global: this.global
        })
      )
    );
    logger.debug(`Successfully loaded ${toolCommands.length} ${paths.relativeDirPath} commands`);
    return toolCommands;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Return the tool targets that this processor supports
   */
  static getToolTargets({
    global = false,
    includeSimulated = false
  } = {}) {
    if (global) {
      return [...commandsProcessorToolTargetsGlobal];
    }
    if (!includeSimulated) {
      return commandsProcessorToolTargets.filter(
        (target) => !commandsProcessorToolTargetsSimulated.includes(target)
      );
    }
    return [...commandsProcessorToolTargets];
  }
  static getToolTargetsSimulated() {
    return [...commandsProcessorToolTargetsSimulated];
  }
  /**
   * Get the factory for a specific tool target.
   * This is a static version of the internal getFactory for external use.
   * @param target - The tool target. Must be a valid CommandsProcessorToolTarget.
   * @returns The factory for the target, or undefined if not found.
   */
  static getFactory(target) {
    const result = CommandsProcessorToolTargetSchema.safeParse(target);
    if (!result.success) {
      return void 0;
    }
    return toolCommandFactories.get(result.data);
  }
};

// src/features/hooks/hooks-processor.ts
import { z as z14 } from "zod/mini";

// src/types/hooks.ts
import { z as z13 } from "zod/mini";
var CONTROL_CHARS = ["\n", "\r", "\0"];
var hasControlChars = (val) => CONTROL_CHARS.some((char) => val.includes(char));
var safeString = z13.pipe(
  z13.string(),
  z13.custom(
    (val) => typeof val === "string" && !hasControlChars(val),
    "must not contain newline, carriage return, or NUL characters"
  )
);
var HookDefinitionSchema = z13.looseObject({
  command: z13.optional(safeString),
  type: z13.optional(z13.enum(["command", "prompt"])),
  timeout: z13.optional(z13.number()),
  matcher: z13.optional(safeString),
  prompt: z13.optional(z13.string()),
  loop_limit: z13.optional(z13.nullable(z13.number()))
});
var CURSOR_HOOK_EVENTS = [
  "sessionStart",
  "sessionEnd",
  "preToolUse",
  "postToolUse",
  "beforeSubmitPrompt",
  "stop",
  "subagentStop",
  "preCompact",
  "postToolUseFailure",
  "subagentStart",
  "beforeShellExecution",
  "afterShellExecution",
  "beforeMCPExecution",
  "afterMCPExecution",
  "beforeReadFile",
  "afterFileEdit",
  "afterAgentResponse",
  "afterAgentThought",
  "beforeTabFileRead",
  "afterTabFileEdit"
];
var CLAUDE_HOOK_EVENTS = [
  "sessionStart",
  "sessionEnd",
  "preToolUse",
  "postToolUse",
  "beforeSubmitPrompt",
  "stop",
  "subagentStop",
  "preCompact",
  "permissionRequest",
  "notification",
  "setup"
];
var OPENCODE_HOOK_EVENTS = [
  "sessionStart",
  "preToolUse",
  "postToolUse",
  "stop",
  "afterFileEdit",
  "afterShellExecution",
  "permissionRequest"
];
var FACTORYDROID_HOOK_EVENTS = [
  "sessionStart",
  "sessionEnd",
  "preToolUse",
  "postToolUse",
  "beforeSubmitPrompt",
  "stop",
  "subagentStop",
  "preCompact",
  "permissionRequest",
  "notification",
  "setup"
];
var hooksRecordSchema = z13.record(z13.string(), z13.array(HookDefinitionSchema));
var HooksConfigSchema = z13.looseObject({
  version: z13.optional(z13.number()),
  hooks: hooksRecordSchema,
  cursor: z13.optional(z13.looseObject({ hooks: z13.optional(hooksRecordSchema) })),
  claudecode: z13.optional(z13.looseObject({ hooks: z13.optional(hooksRecordSchema) })),
  opencode: z13.optional(z13.looseObject({ hooks: z13.optional(hooksRecordSchema) })),
  factorydroid: z13.optional(z13.looseObject({ hooks: z13.optional(hooksRecordSchema) }))
});
var CANONICAL_TO_CLAUDE_EVENT_NAMES = {
  sessionStart: "SessionStart",
  sessionEnd: "SessionEnd",
  preToolUse: "PreToolUse",
  postToolUse: "PostToolUse",
  beforeSubmitPrompt: "UserPromptSubmit",
  stop: "Stop",
  subagentStop: "SubagentStop",
  preCompact: "PreCompact",
  permissionRequest: "PermissionRequest",
  notification: "Notification",
  setup: "Setup"
};
var CLAUDE_TO_CANONICAL_EVENT_NAMES = Object.fromEntries(
  Object.entries(CANONICAL_TO_CLAUDE_EVENT_NAMES).map(([k, v]) => [v, k])
);
var CANONICAL_TO_CURSOR_EVENT_NAMES = {
  sessionStart: "sessionStart",
  sessionEnd: "sessionEnd",
  preToolUse: "preToolUse",
  postToolUse: "postToolUse",
  beforeSubmitPrompt: "beforeSubmitPrompt",
  stop: "stop",
  subagentStop: "subagentStop",
  preCompact: "preCompact",
  postToolUseFailure: "postToolUseFailure",
  subagentStart: "subagentStart",
  beforeShellExecution: "beforeShellExecution",
  afterShellExecution: "afterShellExecution",
  beforeMCPExecution: "beforeMCPExecution",
  afterMCPExecution: "afterMCPExecution",
  beforeReadFile: "beforeReadFile",
  afterFileEdit: "afterFileEdit",
  afterAgentResponse: "afterAgentResponse",
  afterAgentThought: "afterAgentThought",
  beforeTabFileRead: "beforeTabFileRead",
  afterTabFileEdit: "afterTabFileEdit"
};
var CURSOR_TO_CANONICAL_EVENT_NAMES = Object.fromEntries(
  Object.entries(CANONICAL_TO_CURSOR_EVENT_NAMES).map(([k, v]) => [v, k])
);
var CANONICAL_TO_FACTORYDROID_EVENT_NAMES = {
  sessionStart: "SessionStart",
  sessionEnd: "SessionEnd",
  preToolUse: "PreToolUse",
  postToolUse: "PostToolUse",
  beforeSubmitPrompt: "UserPromptSubmit",
  stop: "Stop",
  subagentStop: "SubagentStop",
  preCompact: "PreCompact",
  permissionRequest: "PermissionRequest",
  notification: "Notification",
  setup: "Setup"
};
var FACTORYDROID_TO_CANONICAL_EVENT_NAMES = Object.fromEntries(
  Object.entries(CANONICAL_TO_FACTORYDROID_EVENT_NAMES).map(([k, v]) => [v, k])
);
var CANONICAL_TO_OPENCODE_EVENT_NAMES = {
  sessionStart: "session.created",
  preToolUse: "tool.execute.before",
  postToolUse: "tool.execute.after",
  stop: "session.idle",
  afterFileEdit: "file.edited",
  afterShellExecution: "command.executed",
  permissionRequest: "permission.asked"
};

// src/features/hooks/claudecode-hooks.ts
import { join as join21 } from "path";

// src/types/tool-file.ts
var ToolFile = class extends AiFile {
};

// src/features/hooks/rulesync-hooks.ts
import { join as join20 } from "path";
var RulesyncHooks = class _RulesyncHooks extends RulesyncFile {
  json;
  constructor(params) {
    super({ ...params });
    this.json = JSON.parse(this.fileContent);
    if (params.validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths() {
    return {
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: "hooks.json"
    };
  }
  validate() {
    const result = HooksConfigSchema.safeParse(this.json);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, error: null };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const paths = _RulesyncHooks.getSettablePaths();
    const filePath = join20(baseDir, paths.relativeDirPath, paths.relativeFilePath);
    if (!await fileExists(filePath)) {
      throw new Error(`No ${RULESYNC_HOOKS_RELATIVE_FILE_PATH} found.`);
    }
    const fileContent = await readFileContent(filePath);
    return new _RulesyncHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  getJson() {
    return this.json;
  }
};

// src/features/hooks/tool-hooks.ts
var ToolHooks = class extends ToolFile {
  constructor(params) {
    super({
      ...params,
      validate: true
    });
    if (params.validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths(_options) {
    throw new Error("Please implement this method in the subclass.");
  }
  toRulesyncHooksDefault({
    fileContent = void 0
  } = {}) {
    return new RulesyncHooks({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: "hooks.json",
      fileContent: fileContent ?? this.fileContent
    });
  }
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
};

// src/features/hooks/claudecode-hooks.ts
function canonicalToClaudeHooks(config) {
  const claudeSupported = new Set(CLAUDE_HOOK_EVENTS);
  const sharedHooks = {};
  for (const [event, defs] of Object.entries(config.hooks)) {
    if (claudeSupported.has(event)) {
      sharedHooks[event] = defs;
    }
  }
  const effectiveHooks = {
    ...sharedHooks,
    ...config.claudecode?.hooks
  };
  const claude = {};
  for (const [eventName, definitions] of Object.entries(effectiveHooks)) {
    const claudeEventName = CANONICAL_TO_CLAUDE_EVENT_NAMES[eventName] ?? eventName;
    const byMatcher = /* @__PURE__ */ new Map();
    for (const def of definitions) {
      const key = def.matcher ?? "";
      const list = byMatcher.get(key);
      if (list) list.push(def);
      else byMatcher.set(key, [def]);
    }
    const entries = [];
    for (const [matcherKey, defs] of byMatcher) {
      const hooks = defs.map((def) => {
        const command = def.command !== void 0 && def.command !== null && !def.command.startsWith("$") ? `$CLAUDE_PROJECT_DIR/${def.command.replace(/^\.\//, "")}` : def.command;
        return {
          type: def.type ?? "command",
          ...command !== void 0 && command !== null && { command },
          ...def.timeout !== void 0 && def.timeout !== null && { timeout: def.timeout },
          ...def.prompt !== void 0 && def.prompt !== null && { prompt: def.prompt }
        };
      });
      entries.push(matcherKey ? { matcher: matcherKey, hooks } : { hooks });
    }
    claude[claudeEventName] = entries;
  }
  return claude;
}
function isClaudeMatcherEntry(x) {
  if (x === null || typeof x !== "object") {
    return false;
  }
  if ("matcher" in x && typeof x.matcher !== "string") {
    return false;
  }
  if ("hooks" in x && !Array.isArray(x.hooks)) {
    return false;
  }
  return true;
}
function claudeHooksToCanonical(claudeHooks) {
  if (claudeHooks === null || claudeHooks === void 0 || typeof claudeHooks !== "object") {
    return {};
  }
  const canonical = {};
  for (const [claudeEventName, matcherEntries] of Object.entries(claudeHooks)) {
    const eventName = CLAUDE_TO_CANONICAL_EVENT_NAMES[claudeEventName] ?? claudeEventName;
    if (!Array.isArray(matcherEntries)) continue;
    const defs = [];
    for (const rawEntry of matcherEntries) {
      if (!isClaudeMatcherEntry(rawEntry)) continue;
      const entry = rawEntry;
      const hooks = entry.hooks ?? [];
      for (const h of hooks) {
        const cmd = typeof h.command === "string" ? h.command : void 0;
        const command = typeof cmd === "string" && cmd.includes("$CLAUDE_PROJECT_DIR/") ? cmd.replace(/^\$CLAUDE_PROJECT_DIR\/?/, "./") : cmd;
        const hookType = h.type === "command" || h.type === "prompt" ? h.type : "command";
        const timeout = typeof h.timeout === "number" ? h.timeout : void 0;
        const prompt = typeof h.prompt === "string" ? h.prompt : void 0;
        defs.push({
          type: hookType,
          ...command !== void 0 && command !== null && { command },
          ...timeout !== void 0 && timeout !== null && { timeout },
          ...prompt !== void 0 && prompt !== null && { prompt },
          ...entry.matcher !== void 0 && entry.matcher !== null && entry.matcher !== "" && { matcher: entry.matcher }
        });
      }
    }
    if (defs.length > 0) {
      canonical[eventName] = defs;
    }
  }
  return canonical;
}
var ClaudecodeHooks = class _ClaudecodeHooks extends ToolHooks {
  constructor(params) {
    super({
      ...params,
      fileContent: params.fileContent ?? "{}"
    });
  }
  isDeletable() {
    return false;
  }
  static getSettablePaths(_options = {}) {
    return { relativeDirPath: ".claude", relativeFilePath: "settings.json" };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = _ClaudecodeHooks.getSettablePaths({ global });
    const filePath = join21(baseDir, paths.relativeDirPath, paths.relativeFilePath);
    const fileContent = await readFileContentOrNull(filePath) ?? '{"hooks":{}}';
    return new _ClaudecodeHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static async fromRulesyncHooks({
    baseDir = process.cwd(),
    rulesyncHooks,
    validate = true,
    global = false
  }) {
    const paths = _ClaudecodeHooks.getSettablePaths({ global });
    const filePath = join21(baseDir, paths.relativeDirPath, paths.relativeFilePath);
    const existingContent = await readOrInitializeFileContent(
      filePath,
      JSON.stringify({}, null, 2)
    );
    let settings;
    try {
      settings = JSON.parse(existingContent);
    } catch (error) {
      throw new Error(
        `Failed to parse existing Claude settings at ${filePath}: ${formatError(error)}`,
        { cause: error }
      );
    }
    const config = rulesyncHooks.getJson();
    const claudeHooks = canonicalToClaudeHooks(config);
    const merged = { ...settings, hooks: claudeHooks };
    const fileContent = JSON.stringify(merged, null, 2);
    return new _ClaudecodeHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncHooks() {
    let settings;
    try {
      settings = JSON.parse(this.getFileContent());
    } catch (error) {
      throw new Error(
        `Failed to parse Claude hooks content in ${join21(this.getRelativeDirPath(), this.getRelativeFilePath())}: ${formatError(error)}`,
        {
          cause: error
        }
      );
    }
    const hooks = claudeHooksToCanonical(settings.hooks);
    return this.toRulesyncHooksDefault({
      fileContent: JSON.stringify({ version: 1, hooks }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClaudecodeHooks({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: JSON.stringify({ hooks: {} }, null, 2),
      validate: false
    });
  }
};

// src/features/hooks/cursor-hooks.ts
import { join as join22 } from "path";
var CursorHooks = class _CursorHooks extends ToolHooks {
  constructor(params) {
    const { rulesyncHooks: _r, ...rest } = params;
    super({
      ...rest,
      fileContent: rest.fileContent ?? "{}"
    });
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".cursor",
      relativeFilePath: "hooks.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const paths = _CursorHooks.getSettablePaths();
    const fileContent = await readFileContent(
      join22(baseDir, paths.relativeDirPath, paths.relativeFilePath)
    );
    return new _CursorHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncHooks({
    baseDir = process.cwd(),
    rulesyncHooks,
    validate = true
  }) {
    const config = rulesyncHooks.getJson();
    const cursorSupported = new Set(CURSOR_HOOK_EVENTS);
    const sharedHooks = {};
    for (const [event, defs] of Object.entries(config.hooks)) {
      if (cursorSupported.has(event)) {
        sharedHooks[event] = defs;
      }
    }
    const mergedHooks = {
      ...sharedHooks,
      ...config.cursor?.hooks
    };
    const mappedHooks = {};
    for (const [eventName, defs] of Object.entries(mergedHooks)) {
      const cursorEventName = CANONICAL_TO_CURSOR_EVENT_NAMES[eventName] ?? eventName;
      mappedHooks[cursorEventName] = defs;
    }
    const cursorConfig = {
      version: config.version ?? 1,
      hooks: mappedHooks
    };
    const fileContent = JSON.stringify(cursorConfig, null, 2);
    const paths = _CursorHooks.getSettablePaths();
    return new _CursorHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate,
      rulesyncHooks
    });
  }
  toRulesyncHooks() {
    const content = this.getFileContent();
    const parsed = JSON.parse(content);
    const cursorHooks = parsed.hooks ?? {};
    const canonicalHooks = {};
    for (const [cursorEventName, defs] of Object.entries(cursorHooks)) {
      const eventName = CURSOR_TO_CANONICAL_EVENT_NAMES[cursorEventName] ?? cursorEventName;
      canonicalHooks[eventName] = defs;
    }
    const version = parsed.version ?? 1;
    return this.toRulesyncHooksDefault({
      fileContent: JSON.stringify({ version, hooks: canonicalHooks }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CursorHooks({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/hooks/factorydroid-hooks.ts
import { join as join23 } from "path";
function canonicalToFactorydroidHooks(config) {
  const supported = new Set(FACTORYDROID_HOOK_EVENTS);
  const sharedHooks = {};
  for (const [event, defs] of Object.entries(config.hooks)) {
    if (supported.has(event)) {
      sharedHooks[event] = defs;
    }
  }
  const effectiveHooks = {
    ...sharedHooks,
    ...config.factorydroid?.hooks
  };
  const result = {};
  for (const [eventName, definitions] of Object.entries(effectiveHooks)) {
    const pascalEventName = CANONICAL_TO_FACTORYDROID_EVENT_NAMES[eventName] ?? eventName;
    const byMatcher = /* @__PURE__ */ new Map();
    for (const def of definitions) {
      const key = def.matcher ?? "";
      const list = byMatcher.get(key);
      if (list) list.push(def);
      else byMatcher.set(key, [def]);
    }
    const entries = [];
    for (const [matcherKey, defs] of byMatcher) {
      const hooks = defs.map((def) => {
        const command = def.command !== void 0 && def.command !== null && !def.command.startsWith("$") ? `$FACTORY_PROJECT_DIR/${def.command.replace(/^\.\//, "")}` : def.command;
        return {
          type: def.type ?? "command",
          ...command !== void 0 && command !== null && { command },
          ...def.timeout !== void 0 && def.timeout !== null && { timeout: def.timeout },
          ...def.prompt !== void 0 && def.prompt !== null && { prompt: def.prompt }
        };
      });
      entries.push(matcherKey ? { matcher: matcherKey, hooks } : { hooks });
    }
    result[pascalEventName] = entries;
  }
  return result;
}
function isFactorydroidMatcherEntry(x) {
  if (x === null || typeof x !== "object") {
    return false;
  }
  if ("matcher" in x && typeof x.matcher !== "string") {
    return false;
  }
  if ("hooks" in x && !Array.isArray(x.hooks)) {
    return false;
  }
  return true;
}
function factorydroidHooksToCanonical(hooks) {
  if (hooks === null || hooks === void 0 || typeof hooks !== "object") {
    return {};
  }
  const canonical = {};
  for (const [pascalEventName, matcherEntries] of Object.entries(hooks)) {
    const eventName = FACTORYDROID_TO_CANONICAL_EVENT_NAMES[pascalEventName] ?? pascalEventName;
    if (!Array.isArray(matcherEntries)) continue;
    const defs = [];
    for (const rawEntry of matcherEntries) {
      if (!isFactorydroidMatcherEntry(rawEntry)) continue;
      const entry = rawEntry;
      const hookDefs = entry.hooks ?? [];
      for (const h of hookDefs) {
        const cmd = typeof h.command === "string" ? h.command : void 0;
        const command = typeof cmd === "string" && cmd.includes("$FACTORY_PROJECT_DIR/") ? cmd.replace(/^\$FACTORY_PROJECT_DIR\/?/, "./") : cmd;
        const hookType = h.type === "command" || h.type === "prompt" ? h.type : "command";
        const timeout = typeof h.timeout === "number" ? h.timeout : void 0;
        const prompt = typeof h.prompt === "string" ? h.prompt : void 0;
        defs.push({
          type: hookType,
          ...command !== void 0 && command !== null && { command },
          ...timeout !== void 0 && timeout !== null && { timeout },
          ...prompt !== void 0 && prompt !== null && { prompt },
          ...entry.matcher !== void 0 && entry.matcher !== null && entry.matcher !== "" && { matcher: entry.matcher }
        });
      }
    }
    if (defs.length > 0) {
      canonical[eventName] = defs;
    }
  }
  return canonical;
}
var FactorydroidHooks = class _FactorydroidHooks extends ToolHooks {
  constructor(params) {
    super({
      ...params,
      fileContent: params.fileContent ?? "{}"
    });
  }
  isDeletable() {
    return false;
  }
  static getSettablePaths(_options = {}) {
    return { relativeDirPath: ".factory", relativeFilePath: "settings.json" };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = _FactorydroidHooks.getSettablePaths({ global });
    const filePath = join23(baseDir, paths.relativeDirPath, paths.relativeFilePath);
    const fileContent = await readFileContentOrNull(filePath) ?? '{"hooks":{}}';
    return new _FactorydroidHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static async fromRulesyncHooks({
    baseDir = process.cwd(),
    rulesyncHooks,
    validate = true,
    global = false
  }) {
    const paths = _FactorydroidHooks.getSettablePaths({ global });
    const filePath = join23(baseDir, paths.relativeDirPath, paths.relativeFilePath);
    const existingContent = await readOrInitializeFileContent(
      filePath,
      JSON.stringify({}, null, 2)
    );
    let settings;
    try {
      settings = JSON.parse(existingContent);
    } catch (error) {
      throw new Error(
        `Failed to parse existing Factory Droid settings at ${filePath}: ${formatError(error)}`,
        { cause: error }
      );
    }
    const config = rulesyncHooks.getJson();
    const factorydroidHooks = canonicalToFactorydroidHooks(config);
    const merged = { ...settings, hooks: factorydroidHooks };
    const fileContent = JSON.stringify(merged, null, 2);
    return new _FactorydroidHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncHooks() {
    let settings;
    try {
      settings = JSON.parse(this.getFileContent());
    } catch (error) {
      throw new Error(
        `Failed to parse Factory Droid hooks content in ${join23(this.getRelativeDirPath(), this.getRelativeFilePath())}: ${formatError(error)}`,
        {
          cause: error
        }
      );
    }
    const hooks = factorydroidHooksToCanonical(settings.hooks);
    return this.toRulesyncHooksDefault({
      fileContent: JSON.stringify({ version: 1, hooks }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _FactorydroidHooks({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: JSON.stringify({ hooks: {} }, null, 2),
      validate: false
    });
  }
};

// src/features/hooks/opencode-hooks.ts
import { join as join24 } from "path";
var NAMED_HOOKS = /* @__PURE__ */ new Set(["tool.execute.before", "tool.execute.after"]);
function escapeForTemplateLiteral(command) {
  return command.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
function validateAndSanitizeMatcher(matcher) {
  let sanitized = matcher;
  for (const char of CONTROL_CHARS) {
    sanitized = sanitized.replaceAll(char, "");
  }
  try {
    new RegExp(sanitized);
  } catch {
    throw new Error(`Invalid regex pattern in hook matcher: ${sanitized}`);
  }
  return sanitized.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function groupByOpencodeEvent(config) {
  const opencodeSupported = new Set(OPENCODE_HOOK_EVENTS);
  const configHooks = { ...config.hooks, ...config.opencode?.hooks };
  const effectiveHooks = {};
  for (const [event, defs] of Object.entries(configHooks)) {
    if (opencodeSupported.has(event)) {
      effectiveHooks[event] = defs;
    }
  }
  const namedEventHandlers = {};
  const genericEventHandlers = {};
  for (const [canonicalEvent, definitions] of Object.entries(effectiveHooks)) {
    const opencodeEvent = CANONICAL_TO_OPENCODE_EVENT_NAMES[canonicalEvent];
    if (!opencodeEvent) continue;
    const handlers = [];
    for (const def of definitions) {
      if (def.type === "prompt") continue;
      if (!def.command) continue;
      handlers.push({
        command: def.command,
        matcher: def.matcher ? def.matcher : void 0
      });
    }
    if (handlers.length > 0) {
      const grouped = NAMED_HOOKS.has(opencodeEvent) ? namedEventHandlers : genericEventHandlers;
      const existing = grouped[opencodeEvent];
      if (existing) {
        existing.push(...handlers);
      } else {
        grouped[opencodeEvent] = handlers;
      }
    }
  }
  return { namedEventHandlers, genericEventHandlers };
}
function generatePluginCode(config) {
  const { namedEventHandlers, genericEventHandlers } = groupByOpencodeEvent(config);
  const lines = [];
  lines.push("export const RulesyncHooksPlugin = async ({ $ }) => {");
  lines.push("  return {");
  if (Object.keys(genericEventHandlers).length > 0) {
    lines.push("    event: async ({ event }) => {");
    for (const [eventName, handlers] of Object.entries(genericEventHandlers)) {
      lines.push(`      if (event.type === "${eventName}") {`);
      for (const handler of handlers) {
        const escapedCommand = escapeForTemplateLiteral(handler.command);
        lines.push(`        await $\`${escapedCommand}\``);
      }
      lines.push("      }");
    }
    lines.push("    },");
  }
  for (const [eventName, handlers] of Object.entries(namedEventHandlers)) {
    lines.push(`    "${eventName}": async (input) => {`);
    for (const handler of handlers) {
      const escapedCommand = escapeForTemplateLiteral(handler.command);
      if (handler.matcher) {
        const safeMatcher = validateAndSanitizeMatcher(handler.matcher);
        lines.push(`      if (new RegExp("${safeMatcher}").test(input.tool)) {`);
        lines.push(`        await $\`${escapedCommand}\``);
        lines.push("      }");
      } else {
        lines.push(`      await $\`${escapedCommand}\``);
      }
    }
    lines.push("    },");
  }
  lines.push("  }");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}
var OpencodeHooks = class _OpencodeHooks extends ToolHooks {
  constructor(params) {
    super({
      ...params,
      fileContent: params.fileContent ?? ""
    });
  }
  static getSettablePaths(options) {
    return {
      relativeDirPath: options?.global ? join24(".config", "opencode", "plugins") : join24(".opencode", "plugins"),
      relativeFilePath: "rulesync-hooks.js"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = _OpencodeHooks.getSettablePaths({ global });
    const fileContent = await readFileContent(
      join24(baseDir, paths.relativeDirPath, paths.relativeFilePath)
    );
    return new _OpencodeHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncHooks({
    baseDir = process.cwd(),
    rulesyncHooks,
    validate = true,
    global = false
  }) {
    const config = rulesyncHooks.getJson();
    const fileContent = generatePluginCode(config);
    const paths = _OpencodeHooks.getSettablePaths({ global });
    return new _OpencodeHooks({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncHooks() {
    throw new Error("Not implemented because OpenCode hooks are generated as a plugin file.");
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _OpencodeHooks({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/hooks/hooks-processor.ts
var hooksProcessorToolTargetTuple = ["cursor", "claudecode", "opencode", "factorydroid"];
var HooksProcessorToolTargetSchema = z14.enum(hooksProcessorToolTargetTuple);
var toolHooksFactories = /* @__PURE__ */ new Map([
  [
    "cursor",
    {
      class: CursorHooks,
      meta: { supportsProject: true, supportsGlobal: false, supportsImport: true },
      supportedEvents: CURSOR_HOOK_EVENTS,
      supportedHookTypes: ["command", "prompt"]
    }
  ],
  [
    "claudecode",
    {
      class: ClaudecodeHooks,
      meta: { supportsProject: true, supportsGlobal: true, supportsImport: true },
      supportedEvents: CLAUDE_HOOK_EVENTS,
      supportedHookTypes: ["command", "prompt"]
    }
  ],
  [
    "opencode",
    {
      class: OpencodeHooks,
      meta: { supportsProject: true, supportsGlobal: true, supportsImport: false },
      supportedEvents: OPENCODE_HOOK_EVENTS,
      supportedHookTypes: ["command"]
    }
  ],
  [
    "factorydroid",
    {
      class: FactorydroidHooks,
      meta: { supportsProject: true, supportsGlobal: true, supportsImport: true },
      supportedEvents: FACTORYDROID_HOOK_EVENTS,
      supportedHookTypes: ["command", "prompt"]
    }
  ]
]);
var hooksProcessorToolTargets = [...toolHooksFactories.keys()];
var hooksProcessorToolTargetsGlobal = [...toolHooksFactories.entries()].filter(([, f]) => f.meta.supportsGlobal).map(([t]) => t);
var hooksProcessorToolTargetsImportable = [...toolHooksFactories.entries()].filter(([, f]) => f.meta.supportsImport).map(([t]) => t);
var hooksProcessorToolTargetsGlobalImportable = [...toolHooksFactories.entries()].filter(([, f]) => f.meta.supportsGlobal && f.meta.supportsImport).map(([t]) => t);
var HooksProcessor = class extends FeatureProcessor {
  toolTarget;
  global;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    global = false,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = HooksProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for HooksProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.global = global;
  }
  async loadRulesyncFiles() {
    try {
      return [
        await RulesyncHooks.fromFile({
          baseDir: this.baseDir,
          validate: true
        })
      ];
    } catch (error) {
      logger.error(
        `Failed to load Rulesync hooks file (${RULESYNC_HOOKS_RELATIVE_FILE_PATH}): ${formatError(error)}`
      );
      return [];
    }
  }
  async loadToolFiles({ forDeletion = false } = {}) {
    try {
      const factory = toolHooksFactories.get(this.toolTarget);
      if (!factory) throw new Error(`Unsupported tool target: ${this.toolTarget}`);
      const paths = factory.class.getSettablePaths({ global: this.global });
      if (forDeletion) {
        const toolHooks2 = factory.class.forDeletion({
          baseDir: this.baseDir,
          relativeDirPath: paths.relativeDirPath,
          relativeFilePath: paths.relativeFilePath,
          global: this.global
        });
        const list = toolHooks2.isDeletable?.() !== false ? [toolHooks2] : [];
        logger.debug(
          `Successfully loaded ${list.length} ${this.toolTarget} hooks files for deletion`
        );
        return list;
      }
      const toolHooks = await factory.class.fromFile({
        baseDir: this.baseDir,
        validate: true,
        global: this.global
      });
      logger.debug(`Successfully loaded 1 ${this.toolTarget} hooks file`);
      return [toolHooks];
    } catch (error) {
      const msg = `Failed to load hooks files for tool target: ${this.toolTarget}: ${formatError(error)}`;
      if (error instanceof Error && error.message.includes("no such file or directory")) {
        logger.debug(msg);
      } else {
        logger.error(msg);
      }
      return [];
    }
  }
  async convertRulesyncFilesToToolFiles(rulesyncFiles) {
    const rulesyncHooks = rulesyncFiles.find((f) => f instanceof RulesyncHooks);
    if (!rulesyncHooks) {
      throw new Error(`No ${RULESYNC_HOOKS_RELATIVE_FILE_PATH} found.`);
    }
    const factory = toolHooksFactories.get(this.toolTarget);
    if (!factory) throw new Error(`Unsupported tool target: ${this.toolTarget}`);
    const config = rulesyncHooks.getJson();
    const sharedHooks = config.hooks;
    const overrideHooks = config[this.toolTarget]?.hooks ?? {};
    const effectiveHooks = { ...sharedHooks, ...overrideHooks };
    {
      const supportedEvents = new Set(factory.supportedEvents);
      const configEventNames = new Set(Object.keys(effectiveHooks));
      const skipped = [...configEventNames].filter((e) => !supportedEvents.has(e));
      if (skipped.length > 0) {
        logger.warn(
          `Skipped hook event(s) for ${this.toolTarget} (not supported): ${skipped.join(", ")}`
        );
      }
    }
    {
      const supportedHookTypes = new Set(factory.supportedHookTypes);
      const unsupportedTypeToEvents = /* @__PURE__ */ new Map();
      for (const [event, defs] of Object.entries(effectiveHooks)) {
        for (const def of defs) {
          const hookType = def.type ?? "command";
          if (!supportedHookTypes.has(hookType)) {
            const events = unsupportedTypeToEvents.get(hookType) ?? /* @__PURE__ */ new Set();
            events.add(event);
            unsupportedTypeToEvents.set(hookType, events);
          }
        }
      }
      for (const [hookType, events] of unsupportedTypeToEvents) {
        logger.warn(
          `Skipped ${hookType}-type hook(s) for ${this.toolTarget} (not supported): ${Array.from(events).join(", ")}`
        );
      }
    }
    const toolHooks = await factory.class.fromRulesyncHooks({
      baseDir: this.baseDir,
      rulesyncHooks,
      validate: true,
      global: this.global
    });
    return [toolHooks];
  }
  async convertToolFilesToRulesyncFiles(toolFiles) {
    const hooks = toolFiles.filter((f) => f instanceof ToolHooks);
    return hooks.map((h) => h.toRulesyncHooks());
  }
  static getToolTargets({
    global = false,
    importOnly = false
  } = {}) {
    if (global) {
      return importOnly ? hooksProcessorToolTargetsGlobalImportable : hooksProcessorToolTargetsGlobal;
    }
    return importOnly ? hooksProcessorToolTargetsImportable : hooksProcessorToolTargets;
  }
};

// src/features/ignore/ignore-processor.ts
import { z as z15 } from "zod/mini";

// src/features/ignore/augmentcode-ignore.ts
import { join as join26 } from "path";

// src/features/ignore/rulesync-ignore.ts
import { join as join25 } from "path";
var RulesyncIgnore = class _RulesyncIgnore extends RulesyncFile {
  validate() {
    return { success: true, error: null };
  }
  static getSettablePaths() {
    return {
      recommended: {
        relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
        relativeFilePath: RULESYNC_AIIGNORE_FILE_NAME
      },
      legacy: {
        relativeDirPath: ".",
        relativeFilePath: RULESYNC_IGNORE_RELATIVE_FILE_PATH
      }
    };
  }
  static async fromFile() {
    const baseDir = process.cwd();
    const paths = this.getSettablePaths();
    const recommendedPath = join25(
      baseDir,
      paths.recommended.relativeDirPath,
      paths.recommended.relativeFilePath
    );
    const legacyPath = join25(baseDir, paths.legacy.relativeDirPath, paths.legacy.relativeFilePath);
    if (await fileExists(recommendedPath)) {
      const fileContent2 = await readFileContent(recommendedPath);
      return new _RulesyncIgnore({
        baseDir,
        relativeDirPath: paths.recommended.relativeDirPath,
        relativeFilePath: paths.recommended.relativeFilePath,
        fileContent: fileContent2
      });
    }
    if (await fileExists(legacyPath)) {
      const fileContent2 = await readFileContent(legacyPath);
      return new _RulesyncIgnore({
        baseDir,
        relativeDirPath: paths.legacy.relativeDirPath,
        relativeFilePath: paths.legacy.relativeFilePath,
        fileContent: fileContent2
      });
    }
    const fileContent = await readFileContent(recommendedPath);
    return new _RulesyncIgnore({
      baseDir,
      relativeDirPath: paths.recommended.relativeDirPath,
      relativeFilePath: paths.recommended.relativeFilePath,
      fileContent
    });
  }
};

// src/features/ignore/tool-ignore.ts
var ToolIgnore = class extends ToolFile {
  patterns;
  constructor(params) {
    super({
      ...params,
      validate: true
    });
    this.patterns = this.fileContent.split(/\r?\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
    if (params.validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths() {
    throw new Error("Please implement this method in the subclass.");
  }
  getPatterns() {
    return this.patterns;
  }
  validate() {
    return { success: true, error: null };
  }
  static fromRulesyncIgnore(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  toRulesyncIgnoreDefault() {
    return new RulesyncIgnore({
      baseDir: ".",
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: RULESYNC_AIIGNORE_FILE_NAME,
      fileContent: this.fileContent
    });
  }
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Create a minimal instance for deletion purposes.
   * This method does not read or parse file content, making it safe to use
   * even when files have old/incompatible formats.
   */
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
};

// src/features/ignore/augmentcode-ignore.ts
var AugmentcodeIgnore = class _AugmentcodeIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".augmentignore"
    };
  }
  /**
   * Convert to RulesyncIgnore format
   */
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  /**
   * Create AugmentcodeIgnore from RulesyncIgnore
   * Supports conversion from unified rulesync format to AugmentCode specific format
   */
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _AugmentcodeIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  /**
   * Create AugmentcodeIgnore from file path
   * Reads and parses .augmentignore file
   */
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join26(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _AugmentcodeIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _AugmentcodeIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/claudecode-ignore.ts
import { uniq } from "es-toolkit";
import { join as join27 } from "path";
var ClaudecodeIgnore = class _ClaudecodeIgnore extends ToolIgnore {
  constructor(params) {
    super(params);
    const jsonValue = JSON.parse(this.fileContent);
    this.patterns = jsonValue.permissions?.deny ?? [];
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".claude",
      relativeFilePath: "settings.local.json"
    };
  }
  /**
   * ClaudecodeIgnore uses settings.local.json which is a user-managed config file.
   * It should not be deleted by rulesync.
   */
  isDeletable() {
    return false;
  }
  toRulesyncIgnore() {
    const rulesyncPatterns = this.patterns.map((pattern) => {
      if (pattern.startsWith("Read(") && pattern.endsWith(")")) {
        return pattern.slice(5, -1);
      }
      return pattern;
    }).filter((pattern) => pattern.length > 0);
    const fileContent = rulesyncPatterns.join("\n");
    return new RulesyncIgnore({
      baseDir: this.baseDir,
      relativeDirPath: RulesyncIgnore.getSettablePaths().recommended.relativeDirPath,
      relativeFilePath: RulesyncIgnore.getSettablePaths().recommended.relativeFilePath,
      fileContent
    });
  }
  static async fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    const fileContent = rulesyncIgnore.getFileContent();
    const patterns = fileContent.split(/\r?\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
    const deniedValues = patterns.map((pattern) => `Read(${pattern})`);
    const filePath = join27(
      baseDir,
      this.getSettablePaths().relativeDirPath,
      this.getSettablePaths().relativeFilePath
    );
    const exists = await fileExists(filePath);
    const existingFileContent = exists ? await readFileContent(filePath) : "{}";
    const existingJsonValue = JSON.parse(existingFileContent);
    const existingDenies = existingJsonValue.permissions?.deny ?? [];
    const preservedDenies = existingDenies.filter((deny) => {
      const isReadPattern = deny.startsWith("Read(") && deny.endsWith(")");
      if (isReadPattern) {
        return deniedValues.includes(deny);
      }
      return true;
    });
    const jsonValue = {
      ...existingJsonValue,
      permissions: {
        ...existingJsonValue.permissions,
        deny: uniq([...preservedDenies, ...deniedValues].toSorted())
      }
    };
    return new _ClaudecodeIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: JSON.stringify(jsonValue, null, 2),
      validate: true
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join27(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _ClaudecodeIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClaudecodeIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/ignore/cline-ignore.ts
import { join as join28 } from "path";
var ClineIgnore = class _ClineIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".clineignore"
    };
  }
  /**
   * Convert ClineIgnore to RulesyncIgnore format
   */
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  /**
   * Create ClineIgnore from RulesyncIgnore
   */
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    const body = rulesyncIgnore.getFileContent();
    return new _ClineIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: body
    });
  }
  /**
   * Load ClineIgnore from .clineignore file
   */
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join28(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _ClineIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClineIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/cursor-ignore.ts
import { join as join29 } from "path";
var CursorIgnore = class _CursorIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".cursorignore"
    };
  }
  toRulesyncIgnore() {
    return new RulesyncIgnore({
      baseDir: ".",
      relativeDirPath: ".",
      relativeFilePath: RULESYNC_AIIGNORE_RELATIVE_FILE_PATH,
      fileContent: this.fileContent
    });
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    const body = rulesyncIgnore.getFileContent();
    return new _CursorIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: body
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join29(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _CursorIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CursorIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/geminicli-ignore.ts
import { join as join30 } from "path";
var GeminiCliIgnore = class _GeminiCliIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".geminiignore"
    };
  }
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _GeminiCliIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join30(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _GeminiCliIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _GeminiCliIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/junie-ignore.ts
import { join as join31 } from "path";
var JunieIgnore = class _JunieIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".aiignore"
    };
  }
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _JunieIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join31(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _JunieIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _JunieIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/kilo-ignore.ts
import { join as join32 } from "path";
var KiloIgnore = class _KiloIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".kilocodeignore"
    };
  }
  /**
   * Convert KiloIgnore to RulesyncIgnore format
   */
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  /**
   * Create KiloIgnore from RulesyncIgnore
   */
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    const body = rulesyncIgnore.getFileContent();
    return new _KiloIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: body
    });
  }
  /**
   * Load KiloIgnore from .kilocodeignore file
   */
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join32(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _KiloIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiloIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/kiro-ignore.ts
import { join as join33 } from "path";
var KiroIgnore = class _KiroIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".aiignore"
    };
  }
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _KiroIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join33(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _KiroIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiroIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/qwencode-ignore.ts
import { join as join34 } from "path";
var QwencodeIgnore = class _QwencodeIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".geminiignore"
    };
  }
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _QwencodeIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join34(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _QwencodeIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _QwencodeIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/roo-ignore.ts
import { join as join35 } from "path";
var RooIgnore = class _RooIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".rooignore"
    };
  }
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _RooIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join35(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _RooIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _RooIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/windsurf-ignore.ts
import { join as join36 } from "path";
var WindsurfIgnore = class _WindsurfIgnore extends ToolIgnore {
  static getSettablePaths() {
    return {
      relativeDirPath: ".",
      relativeFilePath: ".codeiumignore"
    };
  }
  toRulesyncIgnore() {
    return this.toRulesyncIgnoreDefault();
  }
  static fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    return new _WindsurfIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncIgnore.getFileContent()
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join36(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _WindsurfIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _WindsurfIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/ignore/zed-ignore.ts
import { uniq as uniq2 } from "es-toolkit";
import { join as join37 } from "path";
var ZedIgnore = class _ZedIgnore extends ToolIgnore {
  constructor(params) {
    super(params);
    const jsonValue = JSON.parse(this.fileContent);
    this.patterns = jsonValue.private_files ?? [];
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".zed",
      relativeFilePath: "settings.json"
    };
  }
  /**
   * ZedIgnore uses settings.json which is a user-managed config file.
   * It should not be deleted by rulesync.
   */
  isDeletable() {
    return false;
  }
  toRulesyncIgnore() {
    const rulesyncPatterns = this.patterns.filter((pattern) => pattern.length > 0);
    const fileContent = rulesyncPatterns.join("\n");
    return new RulesyncIgnore({
      baseDir: this.baseDir,
      relativeDirPath: RulesyncIgnore.getSettablePaths().recommended.relativeDirPath,
      relativeFilePath: RulesyncIgnore.getSettablePaths().recommended.relativeFilePath,
      fileContent
    });
  }
  static async fromRulesyncIgnore({
    baseDir = process.cwd(),
    rulesyncIgnore
  }) {
    const fileContent = rulesyncIgnore.getFileContent();
    const patterns = fileContent.split(/\r?\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
    const filePath = join37(
      baseDir,
      this.getSettablePaths().relativeDirPath,
      this.getSettablePaths().relativeFilePath
    );
    const exists = await fileExists(filePath);
    const existingFileContent = exists ? await readFileContent(filePath) : "{}";
    const existingJsonValue = JSON.parse(existingFileContent);
    const existingPrivateFiles = existingJsonValue.private_files ?? [];
    const mergedPatterns = uniq2([...existingPrivateFiles, ...patterns].toSorted());
    const jsonValue = {
      ...existingJsonValue,
      private_files: mergedPatterns
    };
    return new _ZedIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: JSON.stringify(jsonValue, null, 2),
      validate: true
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join37(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _ZedIgnore({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ZedIgnore({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/ignore/ignore-processor.ts
var ignoreProcessorToolTargets = [
  "augmentcode",
  "claudecode",
  "claudecode-legacy",
  "cline",
  "cursor",
  "geminicli",
  "junie",
  "kilo",
  "kiro",
  "qwencode",
  "roo",
  "windsurf",
  "zed"
];
var IgnoreProcessorToolTargetSchema = z15.enum(ignoreProcessorToolTargets);
var toolIgnoreFactories = /* @__PURE__ */ new Map([
  ["augmentcode", { class: AugmentcodeIgnore }],
  ["claudecode", { class: ClaudecodeIgnore }],
  ["claudecode-legacy", { class: ClaudecodeIgnore }],
  ["cline", { class: ClineIgnore }],
  ["cursor", { class: CursorIgnore }],
  ["geminicli", { class: GeminiCliIgnore }],
  ["junie", { class: JunieIgnore }],
  ["kilo", { class: KiloIgnore }],
  ["kiro", { class: KiroIgnore }],
  ["qwencode", { class: QwencodeIgnore }],
  ["roo", { class: RooIgnore }],
  ["windsurf", { class: WindsurfIgnore }],
  ["zed", { class: ZedIgnore }]
]);
var defaultGetFactory2 = (target) => {
  const factory = toolIgnoreFactories.get(target);
  if (!factory) {
    throw new Error(`Unsupported tool target: ${target}`);
  }
  return factory;
};
var IgnoreProcessor = class extends FeatureProcessor {
  toolTarget;
  getFactory;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    getFactory = defaultGetFactory2,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = IgnoreProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for IgnoreProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.getFactory = getFactory;
  }
  async writeToolIgnoresFromRulesyncIgnores(rulesyncIgnores) {
    const toolIgnores = await this.convertRulesyncFilesToToolFiles(rulesyncIgnores);
    await this.writeAiFiles(toolIgnores);
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load and parse rulesync ignore files from .rulesync/ignore/ directory
   */
  async loadRulesyncFiles() {
    try {
      return [await RulesyncIgnore.fromFile()];
    } catch (error) {
      logger.error(
        `Failed to load rulesync ignore file (${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH}): ${formatError(error)}`
      );
      return [];
    }
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load tool-specific ignore configurations and parse them into ToolIgnore instances
   */
  async loadToolFiles({
    forDeletion = false
  } = {}) {
    try {
      const factory = this.getFactory(this.toolTarget);
      const paths = factory.class.getSettablePaths();
      if (forDeletion) {
        const toolIgnore = factory.class.forDeletion({
          baseDir: this.baseDir,
          relativeDirPath: paths.relativeDirPath,
          relativeFilePath: paths.relativeFilePath
        });
        const toolIgnores2 = toolIgnore.isDeletable() ? [toolIgnore] : [];
        return toolIgnores2;
      }
      const toolIgnores = await this.loadToolIgnores();
      return toolIgnores;
    } catch (error) {
      const errorMessage = `Failed to load tool files for ${this.toolTarget}: ${formatError(error)}`;
      if (error instanceof Error && error.message.includes("no such file or directory")) {
        logger.debug(errorMessage);
      } else {
        logger.error(errorMessage);
      }
      return [];
    }
  }
  async loadToolIgnores() {
    const factory = this.getFactory(this.toolTarget);
    return [await factory.class.fromFile({ baseDir: this.baseDir })];
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Convert RulesyncFile[] to ToolFile[]
   */
  async convertRulesyncFilesToToolFiles(rulesyncFiles) {
    const rulesyncIgnore = rulesyncFiles.find(
      (file) => file instanceof RulesyncIgnore
    );
    if (!rulesyncIgnore) {
      throw new Error(`No ${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH} found.`);
    }
    const factory = this.getFactory(this.toolTarget);
    const toolIgnore = await factory.class.fromRulesyncIgnore({
      baseDir: this.baseDir,
      rulesyncIgnore
    });
    return [toolIgnore];
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Convert ToolFile[] to RulesyncFile[]
   */
  async convertToolFilesToRulesyncFiles(toolFiles) {
    const toolIgnores = toolFiles.filter((file) => file instanceof ToolIgnore);
    const rulesyncIgnores = toolIgnores.map((toolIgnore) => {
      return toolIgnore.toRulesyncIgnore();
    });
    return rulesyncIgnores;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Return the tool targets that this processor supports
   */
  static getToolTargets({ global = false } = {}) {
    if (global) {
      throw new Error("IgnoreProcessor does not support global mode");
    }
    return ignoreProcessorToolTargets;
  }
};

// src/features/mcp/mcp-processor.ts
import { z as z19 } from "zod/mini";

// src/features/mcp/claudecode-mcp.ts
import { join as join39 } from "path";

// src/features/mcp/rulesync-mcp.ts
import { omit } from "es-toolkit/object";
import { join as join38 } from "path";
import { z as z17 } from "zod/mini";

// src/types/mcp.ts
import { z as z16 } from "zod/mini";
var McpServerSchema = z16.object({
  type: z16.optional(z16.enum(["stdio", "sse", "http"])),
  command: z16.optional(z16.union([z16.string(), z16.array(z16.string())])),
  args: z16.optional(z16.array(z16.string())),
  url: z16.optional(z16.string()),
  httpUrl: z16.optional(z16.string()),
  env: z16.optional(z16.record(z16.string(), z16.string())),
  disabled: z16.optional(z16.boolean()),
  networkTimeout: z16.optional(z16.number()),
  timeout: z16.optional(z16.number()),
  trust: z16.optional(z16.boolean()),
  cwd: z16.optional(z16.string()),
  transport: z16.optional(z16.enum(["stdio", "sse", "http"])),
  alwaysAllow: z16.optional(z16.array(z16.string())),
  tools: z16.optional(z16.array(z16.string())),
  kiroAutoApprove: z16.optional(z16.array(z16.string())),
  kiroAutoBlock: z16.optional(z16.array(z16.string())),
  headers: z16.optional(z16.record(z16.string(), z16.string())),
  enabledTools: z16.optional(z16.array(z16.string())),
  disabledTools: z16.optional(z16.array(z16.string()))
});
var McpServersSchema = z16.record(z16.string(), McpServerSchema);

// src/features/mcp/rulesync-mcp.ts
var RulesyncMcpServerSchema = z17.extend(McpServerSchema, {
  targets: z17.optional(RulesyncTargetsSchema),
  description: z17.optional(z17.string()),
  exposed: z17.optional(z17.boolean())
});
var RulesyncMcpConfigSchema = z17.object({
  mcpServers: z17.record(z17.string(), RulesyncMcpServerSchema)
});
var RulesyncMcp = class _RulesyncMcp extends RulesyncFile {
  json;
  constructor(params) {
    super(params);
    this.json = JSON.parse(this.fileContent);
    if (params.validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths() {
    return {
      recommended: {
        relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
        relativeFilePath: "mcp.json"
      },
      legacy: {
        relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
        relativeFilePath: ".mcp.json"
      }
    };
  }
  validate() {
    const result = RulesyncMcpConfigSchema.safeParse(this.json);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, error: null };
  }
  static async fromFile({ validate = true }) {
    const baseDir = process.cwd();
    const paths = this.getSettablePaths();
    const recommendedPath = join38(
      baseDir,
      paths.recommended.relativeDirPath,
      paths.recommended.relativeFilePath
    );
    const legacyPath = join38(baseDir, paths.legacy.relativeDirPath, paths.legacy.relativeFilePath);
    if (await fileExists(recommendedPath)) {
      const fileContent2 = await readFileContent(recommendedPath);
      return new _RulesyncMcp({
        baseDir,
        relativeDirPath: paths.recommended.relativeDirPath,
        relativeFilePath: paths.recommended.relativeFilePath,
        fileContent: fileContent2,
        validate
      });
    }
    if (await fileExists(legacyPath)) {
      logger.warn(
        `\u26A0\uFE0F  Using deprecated path "${legacyPath}". Please migrate to "${recommendedPath}"`
      );
      const fileContent2 = await readFileContent(legacyPath);
      return new _RulesyncMcp({
        baseDir,
        relativeDirPath: paths.legacy.relativeDirPath,
        relativeFilePath: paths.legacy.relativeFilePath,
        fileContent: fileContent2,
        validate
      });
    }
    const fileContent = await readFileContent(recommendedPath);
    return new _RulesyncMcp({
      baseDir,
      relativeDirPath: paths.recommended.relativeDirPath,
      relativeFilePath: paths.recommended.relativeFilePath,
      fileContent,
      validate
    });
  }
  getMcpServers() {
    const entries = Object.entries(this.json.mcpServers);
    return Object.fromEntries(
      entries.map(([serverName, serverConfig]) => {
        return [serverName, omit(serverConfig, ["targets", "description", "exposed"])];
      })
    );
  }
  /**
   * Create a new RulesyncMcp with specified fields stripped from each server config.
   * Returns the same instance if no fields need stripping.
   */
  stripMcpServerFields(fields) {
    if (fields.length === 0) return this;
    const filteredServers = Object.fromEntries(
      Object.entries(this.json.mcpServers).map(([name, config]) => [name, omit(config, fields)])
    );
    return new _RulesyncMcp({
      baseDir: this.baseDir,
      relativeDirPath: this.relativeDirPath,
      relativeFilePath: this.relativeFilePath,
      fileContent: JSON.stringify({ mcpServers: filteredServers }, null, 2)
    });
  }
  getJson() {
    return this.json;
  }
};

// src/features/mcp/tool-mcp.ts
var ToolMcp = class extends ToolFile {
  constructor({ ...rest }) {
    super({
      ...rest,
      validate: true
      // Skip validation during construction
    });
    if (rest.validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths() {
    throw new Error("Please implement this method in the subclass.");
  }
  static getToolTargetsGlobal() {
    throw new Error("Please implement this method in the subclass.");
  }
  toRulesyncMcpDefault({
    fileContent = void 0
  } = {}) {
    return new RulesyncMcp({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: ".mcp.json",
      fileContent: fileContent ?? this.fileContent
    });
  }
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Create a minimal instance for deletion purposes.
   * This method does not read or parse file content, making it safe to use
   * even when files have old/incompatible formats.
   */
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  static fromRulesyncMcp(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
};

// src/features/mcp/claudecode-mcp.ts
var ClaudecodeMcp = class _ClaudecodeMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = JSON.parse(this.fileContent || "{}");
  }
  getJson() {
    return this.json;
  }
  /**
   * In global mode, ~/.claude/.claude.json should not be deleted
   * as it may contain other user settings.
   * In local mode, .mcp.json can be safely deleted.
   */
  isDeletable() {
    return !this.global;
  }
  static getSettablePaths({ global } = {}) {
    if (global) {
      return {
        relativeDirPath: ".claude",
        relativeFilePath: ".claude.json"
      };
    }
    return {
      relativeDirPath: ".",
      relativeFilePath: ".mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContentOrNull(join39(baseDir, paths.relativeDirPath, paths.relativeFilePath)) ?? '{"mcpServers":{}}';
    const json = JSON.parse(fileContent);
    const newJson = { ...json, mcpServers: json.mcpServers ?? {} };
    return new _ClaudecodeMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify(newJson, null, 2),
      validate
    });
  }
  static async fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readOrInitializeFileContent(
      join39(baseDir, paths.relativeDirPath, paths.relativeFilePath),
      JSON.stringify({ mcpServers: {} }, null, 2)
    );
    const json = JSON.parse(fileContent);
    const mcpJson = { ...json, mcpServers: rulesyncMcp.getMcpServers() };
    return new _ClaudecodeMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify(mcpJson, null, 2),
      validate
    });
  }
  toRulesyncMcp() {
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers: this.json.mcpServers }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    return new _ClaudecodeMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false,
      global
    });
  }
};

// src/features/mcp/cline-mcp.ts
import { join as join40 } from "path";
var ClineMcp = class _ClineMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = this.fileContent !== void 0 ? JSON.parse(this.fileContent) : {};
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".cline",
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join40(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _ClineMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    return new _ClineMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncMcp.getFileContent(),
      validate
    });
  }
  toRulesyncMcp() {
    return this.toRulesyncMcpDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClineMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/codexcli-mcp.ts
import { join as join41 } from "path";
import * as smolToml from "smol-toml";
function convertFromCodexFormat(codexMcp) {
  const result = {};
  for (const [name, config] of Object.entries(codexMcp)) {
    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      continue;
    }
    const converted = {};
    for (const [key, value] of Object.entries(config)) {
      if (key === "enabled") {
        if (value === false) {
          converted["disabled"] = true;
        }
      } else if (key === "enabled_tools") {
        converted["enabledTools"] = value;
      } else if (key === "disabled_tools") {
        converted["disabledTools"] = value;
      } else {
        converted[key] = value;
      }
    }
    result[name] = converted;
  }
  return result;
}
function convertToCodexFormat(mcpServers) {
  const result = {};
  for (const [name, config] of Object.entries(mcpServers)) {
    const converted = {};
    for (const [key, value] of Object.entries(config)) {
      if (key === "disabled") {
        if (value === true) {
          converted["enabled"] = false;
        }
      } else if (key === "enabledTools") {
        converted["enabled_tools"] = value;
      } else if (key === "disabledTools") {
        converted["disabled_tools"] = value;
      } else {
        converted[key] = value;
      }
    }
    result[name] = converted;
  }
  return result;
}
var CodexcliMcp = class _CodexcliMcp extends ToolMcp {
  toml;
  constructor({ ...rest }) {
    super({
      ...rest,
      validate: false
    });
    this.toml = smolToml.parse(this.fileContent);
    if (rest.validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  getToml() {
    return this.toml;
  }
  static getSettablePaths({ global } = {}) {
    if (!global) {
      throw new Error("CodexcliMcp only supports global mode. Please pass { global: true }.");
    }
    return {
      relativeDirPath: ".codex",
      relativeFilePath: "config.toml"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContent(
      join41(baseDir, paths.relativeDirPath, paths.relativeFilePath)
    );
    return new _CodexcliMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static async fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const configTomlFilePath = join41(baseDir, paths.relativeDirPath, paths.relativeFilePath);
    const configTomlFileContent = await readOrInitializeFileContent(
      configTomlFilePath,
      smolToml.stringify({})
    );
    const configToml = smolToml.parse(configTomlFileContent);
    const mcpServers = rulesyncMcp.getJson().mcpServers;
    const converted = convertToCodexFormat(mcpServers);
    const filteredMcpServers = this.removeEmptyEntries(converted);
    configToml["mcp_servers"] = filteredMcpServers;
    return new _CodexcliMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: smolToml.stringify(configToml),
      validate
    });
  }
  toRulesyncMcp() {
    const mcpServers = this.toml.mcp_servers ?? {};
    const converted = convertFromCodexFormat(mcpServers);
    return new RulesyncMcp({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: ".mcp.json",
      fileContent: JSON.stringify({ mcpServers: converted }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static removeEmptyEntries(obj) {
    if (!obj) return {};
    const filtered = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null) continue;
      if (typeof value === "object" && Object.keys(value).length === 0) continue;
      filtered[key] = value;
    }
    return filtered;
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CodexcliMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/mcp/copilot-mcp.ts
import { join as join42 } from "path";
function convertToCopilotFormat(mcpServers) {
  return { servers: mcpServers };
}
function convertFromCopilotFormat(copilotConfig) {
  return copilotConfig.servers ?? {};
}
var CopilotMcp = class _CopilotMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = this.fileContent !== void 0 ? JSON.parse(this.fileContent) : {};
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".vscode",
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join42(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _CopilotMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    const copilotConfig = convertToCopilotFormat(rulesyncMcp.getMcpServers());
    return new _CopilotMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: JSON.stringify(copilotConfig, null, 2),
      validate
    });
  }
  toRulesyncMcp() {
    const mcpServers = convertFromCopilotFormat(this.json);
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CopilotMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/cursor-mcp.ts
import { join as join43 } from "path";
var CURSOR_ENV_VAR_PATTERN = /\$\{env:([^}]+)\}/g;
function isMcpServers(value) {
  return value !== void 0 && value !== null && typeof value === "object";
}
function convertEnvFromCursorFormat(mcpServers) {
  return Object.fromEntries(
    Object.entries(mcpServers).map(([name, config]) => [
      name,
      {
        ...config,
        ...config.env && {
          env: Object.fromEntries(
            Object.entries(config.env).map(([k, v]) => [
              k,
              v.replace(CURSOR_ENV_VAR_PATTERN, "${$1}")
            ])
          )
        }
      }
    ])
  );
}
function convertEnvToCursorFormat(mcpServers) {
  return Object.fromEntries(
    Object.entries(mcpServers).map(([name, config]) => [
      name,
      {
        ...config,
        ...config.env && {
          env: Object.fromEntries(
            Object.entries(config.env).map(([k, v]) => [
              k,
              v.replace(/\$\{(?!env:)([^}:]+)\}/g, "${env:$1}")
            ])
          )
        }
      }
    ])
  );
}
var CursorMcp = class _CursorMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = this.fileContent !== void 0 ? JSON.parse(this.fileContent) : {};
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".cursor",
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join43(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _CursorMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    const json = rulesyncMcp.getJson();
    const mcpServers = isMcpServers(json.mcpServers) ? json.mcpServers : {};
    const transformedServers = convertEnvToCursorFormat(mcpServers);
    const cursorConfig = {
      mcpServers: transformedServers
    };
    const fileContent = JSON.stringify(cursorConfig, null, 2);
    return new _CursorMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncMcp() {
    const mcpServers = isMcpServers(this.json.mcpServers) ? this.json.mcpServers : {};
    const transformedServers = convertEnvFromCursorFormat(mcpServers);
    const transformedJson = {
      ...this.json,
      mcpServers: transformedServers
    };
    return new RulesyncMcp({
      baseDir: this.baseDir,
      relativeDirPath: this.relativeDirPath,
      relativeFilePath: "rulesync.mcp.json",
      fileContent: JSON.stringify(transformedJson),
      validate: true
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CursorMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/factorydroid-mcp.ts
import { join as join44 } from "path";
var FactorydroidMcp = class _FactorydroidMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = this.fileContent !== void 0 ? JSON.parse(this.fileContent) : {};
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".factory",
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join44(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _FactorydroidMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    const json = rulesyncMcp.getJson();
    const factorydroidConfig = {
      mcpServers: json.mcpServers || {}
    };
    const fileContent = JSON.stringify(factorydroidConfig, null, 2);
    return new _FactorydroidMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncMcp() {
    return new RulesyncMcp({
      baseDir: this.baseDir,
      relativeDirPath: this.relativeDirPath,
      relativeFilePath: "rulesync.mcp.json",
      fileContent: JSON.stringify(this.json),
      validate: true
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _FactorydroidMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/geminicli-mcp.ts
import { join as join45 } from "path";
var GeminiCliMcp = class _GeminiCliMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = JSON.parse(this.fileContent || "{}");
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths({ global } = {}) {
    if (global) {
      return {
        relativeDirPath: ".gemini",
        relativeFilePath: "settings.json"
      };
    }
    return {
      relativeDirPath: ".gemini",
      relativeFilePath: "settings.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContentOrNull(join45(baseDir, paths.relativeDirPath, paths.relativeFilePath)) ?? '{"mcpServers":{}}';
    const json = JSON.parse(fileContent);
    const newJson = { ...json, mcpServers: json.mcpServers ?? {} };
    return new _GeminiCliMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify(newJson, null, 2),
      validate
    });
  }
  static async fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readOrInitializeFileContent(
      join45(baseDir, paths.relativeDirPath, paths.relativeFilePath),
      JSON.stringify({ mcpServers: {} }, null, 2)
    );
    const json = JSON.parse(fileContent);
    const newJson = { ...json, mcpServers: rulesyncMcp.getJson().mcpServers };
    return new _GeminiCliMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify(newJson, null, 2),
      validate
    });
  }
  toRulesyncMcp() {
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers: this.json.mcpServers }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  /**
   * settings.json may contain other settings, so it should not be deleted.
   */
  isDeletable() {
    return false;
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    return new _GeminiCliMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false,
      global
    });
  }
};

// src/features/mcp/junie-mcp.ts
import { join as join46 } from "path";
var JunieMcp = class _JunieMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = this.fileContent !== void 0 ? JSON.parse(this.fileContent) : {};
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: join46(".junie", "mcp"),
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join46(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _JunieMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    return new _JunieMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent: rulesyncMcp.getFileContent(),
      validate
    });
  }
  toRulesyncMcp() {
    return this.toRulesyncMcpDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _JunieMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/kilo-mcp.ts
import { join as join47 } from "path";
var KiloMcp = class _KiloMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = JSON.parse(this.fileContent || "{}");
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".kilocode",
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const fileContent = await readFileContentOrNull(join47(baseDir, paths.relativeDirPath, paths.relativeFilePath)) ?? '{"mcpServers":{}}';
    return new _KiloMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const fileContent = JSON.stringify({ mcpServers: rulesyncMcp.getMcpServers() }, null, 2);
    return new _KiloMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncMcp() {
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers: this.json.mcpServers ?? {} }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiloMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/kiro-mcp.ts
import { join as join48 } from "path";
var KiroMcp = class _KiroMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = JSON.parse(this.fileContent || "{}");
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: join48(".kiro", "settings"),
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const fileContent = await readFileContentOrNull(join48(baseDir, paths.relativeDirPath, paths.relativeFilePath)) ?? '{"mcpServers":{}}';
    return new _KiroMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const fileContent = JSON.stringify({ mcpServers: rulesyncMcp.getMcpServers() }, null, 2);
    return new _KiroMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncMcp() {
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers: this.json.mcpServers ?? {} }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiroMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/opencode-mcp.ts
import { join as join49 } from "path";
import { z as z18 } from "zod/mini";
var OpencodeMcpLocalServerSchema = z18.object({
  type: z18.literal("local"),
  command: z18.array(z18.string()),
  environment: z18.optional(z18.record(z18.string(), z18.string())),
  enabled: z18._default(z18.boolean(), true),
  cwd: z18.optional(z18.string())
});
var OpencodeMcpRemoteServerSchema = z18.object({
  type: z18.literal("remote"),
  url: z18.string(),
  headers: z18.optional(z18.record(z18.string(), z18.string())),
  enabled: z18._default(z18.boolean(), true)
});
var OpencodeMcpServerSchema = z18.union([
  OpencodeMcpLocalServerSchema,
  OpencodeMcpRemoteServerSchema
]);
var OpencodeConfigSchema = z18.looseObject({
  $schema: z18.optional(z18.string()),
  mcp: z18.optional(z18.record(z18.string(), OpencodeMcpServerSchema)),
  tools: z18.optional(z18.record(z18.string(), z18.boolean()))
});
function convertFromOpencodeFormat(opencodeMcp, tools) {
  return Object.fromEntries(
    Object.entries(opencodeMcp).map(([serverName, serverConfig]) => {
      const enabledTools = [];
      const disabledTools = [];
      const prefix = `${serverName}_`;
      if (tools) {
        for (const [toolName, enabled] of Object.entries(tools)) {
          if (toolName.startsWith(prefix)) {
            const toolSuffix = toolName.slice(prefix.length);
            if (enabled) {
              enabledTools.push(toolSuffix);
            } else {
              disabledTools.push(toolSuffix);
            }
          }
        }
      }
      if (serverConfig.type === "remote") {
        return [
          serverName,
          {
            type: "sse",
            url: serverConfig.url,
            ...serverConfig.enabled === false && { disabled: true },
            ...serverConfig.headers && { headers: serverConfig.headers },
            ...enabledTools.length > 0 && { enabledTools },
            ...disabledTools.length > 0 && { disabledTools }
          }
        ];
      }
      const [command, ...args] = serverConfig.command;
      if (!command) {
        throw new Error(`Server "${serverName}" has an empty command array`);
      }
      return [
        serverName,
        {
          type: "stdio",
          command,
          ...args.length > 0 && { args },
          ...serverConfig.enabled === false && { disabled: true },
          ...serverConfig.environment && { env: serverConfig.environment },
          ...serverConfig.cwd && { cwd: serverConfig.cwd },
          ...enabledTools.length > 0 && { enabledTools },
          ...disabledTools.length > 0 && { disabledTools }
        }
      ];
    })
  );
}
function convertToOpencodeFormat(mcpServers) {
  const tools = {};
  const mcp = Object.fromEntries(
    Object.entries(mcpServers).map(([serverName, serverConfig]) => {
      const isRemote = serverConfig.type === "sse" || serverConfig.type === "http" || serverConfig.url;
      if (serverConfig.enabledTools) {
        for (const tool of serverConfig.enabledTools) {
          tools[`${serverName}_${tool}`] = true;
        }
      }
      if (serverConfig.disabledTools) {
        for (const tool of serverConfig.disabledTools) {
          tools[`${serverName}_${tool}`] = false;
        }
      }
      if (isRemote) {
        const remoteServer = {
          type: "remote",
          url: serverConfig.url ?? serverConfig.httpUrl ?? "",
          enabled: serverConfig.disabled !== void 0 ? !serverConfig.disabled : true,
          ...serverConfig.headers && { headers: serverConfig.headers }
        };
        return [serverName, remoteServer];
      }
      const commandArray = [];
      if (serverConfig.command) {
        if (Array.isArray(serverConfig.command)) {
          commandArray.push(...serverConfig.command);
        } else {
          commandArray.push(serverConfig.command);
        }
      }
      if (serverConfig.args) {
        commandArray.push(...serverConfig.args);
      }
      const localServer = {
        type: "local",
        command: commandArray,
        enabled: serverConfig.disabled !== void 0 ? !serverConfig.disabled : true,
        ...serverConfig.env && { environment: serverConfig.env },
        ...serverConfig.cwd && { cwd: serverConfig.cwd }
      };
      return [serverName, localServer];
    })
  );
  return { mcp, tools };
}
var OpencodeMcp = class _OpencodeMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = OpencodeConfigSchema.parse(JSON.parse(this.fileContent || "{}"));
  }
  getJson() {
    return this.json;
  }
  /**
   * opencode.json may contain other settings, so it should not be deleted.
   */
  isDeletable() {
    return false;
  }
  static getSettablePaths({ global } = {}) {
    if (global) {
      return {
        relativeDirPath: join49(".config", "opencode"),
        relativeFilePath: "opencode.json"
      };
    }
    return {
      relativeDirPath: ".",
      relativeFilePath: "opencode.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readFileContentOrNull(join49(baseDir, paths.relativeDirPath, paths.relativeFilePath)) ?? '{"mcp":{}}';
    const json = JSON.parse(fileContent);
    const newJson = { ...json, mcp: json.mcp ?? {} };
    return new _OpencodeMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify(newJson, null, 2),
      validate
    });
  }
  static async fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const fileContent = await readOrInitializeFileContent(
      join49(baseDir, paths.relativeDirPath, paths.relativeFilePath),
      JSON.stringify({ mcp: {} }, null, 2)
    );
    const json = JSON.parse(fileContent);
    const { mcp: convertedMcp, tools: mcpTools } = convertToOpencodeFormat(
      rulesyncMcp.getMcpServers()
    );
    const { tools: _existingTools, ...jsonWithoutTools } = json;
    const newJson = {
      ...jsonWithoutTools,
      mcp: convertedMcp,
      ...Object.keys(mcpTools).length > 0 && { tools: mcpTools }
    };
    return new _OpencodeMcp({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: paths.relativeFilePath,
      fileContent: JSON.stringify(newJson, null, 2),
      validate
    });
  }
  toRulesyncMcp() {
    const convertedMcpServers = convertFromOpencodeFormat(this.json.mcp ?? {}, this.json.tools);
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers: convertedMcpServers }, null, 2)
    });
  }
  validate() {
    const json = JSON.parse(this.fileContent || "{}");
    const result = OpencodeConfigSchema.safeParse(json);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    return new _OpencodeMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false,
      global
    });
  }
};

// src/features/mcp/roo-mcp.ts
import { join as join50 } from "path";
function isRooMcpServers(value) {
  return value !== void 0 && value !== null && typeof value === "object";
}
function convertToRooFormat(mcpServers) {
  return Object.fromEntries(
    Object.entries(mcpServers).map(([serverName, serverConfig]) => {
      const converted = { ...serverConfig };
      if (serverConfig.type === "http") {
        converted.type = "streamable-http";
      }
      if (serverConfig.transport === "http") {
        converted.transport = "streamable-http";
      }
      return [serverName, converted];
    })
  );
}
function convertFromRooFormat(mcpServers) {
  return Object.fromEntries(
    Object.entries(mcpServers).map(([serverName, serverConfig]) => {
      const converted = { ...serverConfig };
      if (serverConfig.type === "streamable-http") {
        converted.type = "http";
      }
      if (serverConfig.transport === "streamable-http") {
        converted.transport = "http";
      }
      return [serverName, converted];
    })
  );
}
var RooMcp = class _RooMcp extends ToolMcp {
  json;
  constructor(params) {
    super(params);
    this.json = this.fileContent !== void 0 ? JSON.parse(this.fileContent) : {};
  }
  getJson() {
    return this.json;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: ".roo",
      relativeFilePath: "mcp.json"
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    validate = true
  }) {
    const fileContent = await readFileContent(
      join50(
        baseDir,
        this.getSettablePaths().relativeDirPath,
        this.getSettablePaths().relativeFilePath
      )
    );
    return new _RooMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncMcp({
    baseDir = process.cwd(),
    rulesyncMcp,
    validate = true
  }) {
    const mcpServers = rulesyncMcp.getMcpServers();
    const convertedMcpServers = convertToRooFormat(mcpServers);
    const fileContent = JSON.stringify({ mcpServers: convertedMcpServers }, null, 2);
    return new _RooMcp({
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: this.getSettablePaths().relativeFilePath,
      fileContent,
      validate
    });
  }
  toRulesyncMcp() {
    const rawMcpServers = isRooMcpServers(this.json.mcpServers) ? this.json.mcpServers : {};
    const convertedMcpServers = convertFromRooFormat(rawMcpServers);
    return this.toRulesyncMcpDefault({
      fileContent: JSON.stringify({ mcpServers: convertedMcpServers }, null, 2)
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _RooMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "{}",
      validate: false
    });
  }
};

// src/features/mcp/mcp-processor.ts
var mcpProcessorToolTargetTuple = [
  "claudecode",
  "claudecode-legacy",
  "cline",
  "codexcli",
  "copilot",
  "cursor",
  "factorydroid",
  "geminicli",
  "kilo",
  "kiro",
  "junie",
  "opencode",
  "roo"
];
var McpProcessorToolTargetSchema = z19.enum(mcpProcessorToolTargetTuple);
var toolMcpFactories = /* @__PURE__ */ new Map([
  [
    "claudecode",
    {
      class: ClaudecodeMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: true,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "claudecode-legacy",
    {
      class: ClaudecodeMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: true,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "cline",
    {
      class: ClineMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "codexcli",
    {
      class: CodexcliMcp,
      meta: {
        supportsProject: false,
        supportsGlobal: true,
        supportsEnabledTools: true,
        supportsDisabledTools: true
      }
    }
  ],
  [
    "copilot",
    {
      class: CopilotMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "cursor",
    {
      class: CursorMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "factorydroid",
    {
      class: FactorydroidMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: true,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "geminicli",
    {
      class: GeminiCliMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: true,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "kilo",
    {
      class: KiloMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "kiro",
    {
      class: KiroMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "junie",
    {
      class: JunieMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ],
  [
    "opencode",
    {
      class: OpencodeMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: true,
        supportsEnabledTools: true,
        supportsDisabledTools: true
      }
    }
  ],
  [
    "roo",
    {
      class: RooMcp,
      meta: {
        supportsProject: true,
        supportsGlobal: false,
        supportsEnabledTools: false,
        supportsDisabledTools: false
      }
    }
  ]
]);
var allToolTargetKeys2 = [...toolMcpFactories.keys()];
var mcpProcessorToolTargets = allToolTargetKeys2.filter((target) => {
  const factory = toolMcpFactories.get(target);
  return factory?.meta.supportsProject ?? false;
});
var mcpProcessorToolTargetsGlobal = allToolTargetKeys2.filter((target) => {
  const factory = toolMcpFactories.get(target);
  return factory?.meta.supportsGlobal ?? false;
});
var defaultGetFactory3 = (target) => {
  const factory = toolMcpFactories.get(target);
  if (!factory) {
    throw new Error(`Unsupported tool target: ${target}`);
  }
  return factory;
};
var McpProcessor = class extends FeatureProcessor {
  toolTarget;
  global;
  getFactory;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    global = false,
    getFactory = defaultGetFactory3,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = McpProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for McpProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.global = global;
    this.getFactory = getFactory;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load and parse rulesync MCP files from .rulesync/ directory
   */
  async loadRulesyncFiles() {
    try {
      return [await RulesyncMcp.fromFile({})];
    } catch (error) {
      logger.error(
        `Failed to load a Rulesync MCP file (${RULESYNC_MCP_RELATIVE_FILE_PATH}): ${formatError(error)}`
      );
      return [];
    }
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load tool-specific MCP configurations and parse them into ToolMcp instances
   */
  async loadToolFiles({
    forDeletion = false
  } = {}) {
    try {
      const factory = this.getFactory(this.toolTarget);
      const paths = factory.class.getSettablePaths({ global: this.global });
      if (forDeletion) {
        const toolMcp = factory.class.forDeletion({
          baseDir: this.baseDir,
          relativeDirPath: paths.relativeDirPath,
          relativeFilePath: paths.relativeFilePath,
          global: this.global
        });
        const toolMcps2 = toolMcp.isDeletable() ? [toolMcp] : [];
        logger.debug(`Successfully loaded ${toolMcps2.length} ${this.toolTarget} MCP files`);
        return toolMcps2;
      }
      const toolMcps = [
        await factory.class.fromFile({
          baseDir: this.baseDir,
          validate: true,
          global: this.global
        })
      ];
      logger.debug(`Successfully loaded ${toolMcps.length} ${this.toolTarget} MCP files`);
      return toolMcps;
    } catch (error) {
      const errorMessage = `Failed to load MCP files for tool target: ${this.toolTarget}: ${formatError(error)}`;
      if (error instanceof Error && error.message.includes("no such file or directory")) {
        logger.debug(errorMessage);
      } else {
        logger.error(errorMessage);
      }
      return [];
    }
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Convert RulesyncFile[] to ToolFile[]
   */
  async convertRulesyncFilesToToolFiles(rulesyncFiles) {
    const rulesyncMcp = rulesyncFiles.find(
      (file) => file instanceof RulesyncMcp
    );
    if (!rulesyncMcp) {
      throw new Error(`No ${RULESYNC_MCP_RELATIVE_FILE_PATH} found.`);
    }
    const factory = this.getFactory(this.toolTarget);
    const toolMcps = await Promise.all(
      [rulesyncMcp].map(async (rulesyncMcp2) => {
        const fieldsToStrip = [];
        if (!factory.meta.supportsEnabledTools) fieldsToStrip.push("enabledTools");
        if (!factory.meta.supportsDisabledTools) fieldsToStrip.push("disabledTools");
        const filteredRulesyncMcp = rulesyncMcp2.stripMcpServerFields(fieldsToStrip);
        return await factory.class.fromRulesyncMcp({
          baseDir: this.baseDir,
          rulesyncMcp: filteredRulesyncMcp,
          global: this.global
        });
      })
    );
    return toolMcps;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Convert ToolFile[] to RulesyncFile[]
   */
  async convertToolFilesToRulesyncFiles(toolFiles) {
    const toolMcps = toolFiles.filter((file) => file instanceof ToolMcp);
    const rulesyncMcps = toolMcps.map((toolMcp) => {
      return toolMcp.toRulesyncMcp();
    });
    return rulesyncMcps;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Return the tool targets that this processor supports
   */
  static getToolTargets({ global = false } = {}) {
    if (global) {
      return mcpProcessorToolTargetsGlobal;
    }
    return mcpProcessorToolTargets;
  }
};

// src/features/rules/rules-processor.ts
import { encode } from "@toon-format/toon";
import { basename as basename24, join as join108, relative as relative4 } from "path";
import { z as z49 } from "zod/mini";

// src/constants/general.ts
var SKILL_FILE_NAME = "SKILL.md";

// src/features/skills/agentsmd-skill.ts
import { join as join54 } from "path";

// src/features/skills/simulated-skill.ts
import { join as join53 } from "path";
import { z as z20 } from "zod/mini";

// src/features/skills/tool-skill.ts
import { join as join52 } from "path";

// src/types/ai-dir.ts
import path2, { basename as basename17, join as join51, relative as relative3, resolve as resolve4 } from "path";
var AiDir = class {
  /**
   * @example "."
   */
  baseDir;
  /**
   * @example ".rulesync/skills"
   */
  relativeDirPath;
  /**
   * @example "my-skill"
   */
  dirName;
  /**
   * Optional main file with frontmatter support
   */
  mainFile;
  /**
   * Additional files in the directory
   */
  otherFiles;
  /**
   * @example false
   */
  global;
  constructor({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    mainFile,
    otherFiles = [],
    global = false
  }) {
    if (dirName.includes(path2.sep) || dirName.includes("/") || dirName.includes("\\")) {
      throw new Error(`Directory name cannot contain path separators: dirName="${dirName}"`);
    }
    this.baseDir = baseDir;
    this.relativeDirPath = relativeDirPath;
    this.dirName = dirName;
    this.mainFile = mainFile;
    this.otherFiles = otherFiles;
    this.global = global;
  }
  static async fromDir(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  getBaseDir() {
    return this.baseDir;
  }
  getRelativeDirPath() {
    return this.relativeDirPath;
  }
  getDirName() {
    return this.dirName;
  }
  getDirPath() {
    const fullPath = path2.join(this.baseDir, this.relativeDirPath, this.dirName);
    const resolvedFull = resolve4(fullPath);
    const resolvedBase = resolve4(this.baseDir);
    const rel = relative3(resolvedBase, resolvedFull);
    if (rel.startsWith("..") || path2.isAbsolute(rel)) {
      throw new Error(
        `Path traversal detected: Final path escapes baseDir. baseDir="${this.baseDir}", relativeDirPath="${this.relativeDirPath}", dirName="${this.dirName}"`
      );
    }
    return fullPath;
  }
  getMainFile() {
    return this.mainFile;
  }
  getOtherFiles() {
    return this.otherFiles;
  }
  getRelativePathFromCwd() {
    return path2.join(this.relativeDirPath, this.dirName);
  }
  getGlobal() {
    return this.global;
  }
  setMainFile(name, body, frontmatter) {
    this.mainFile = { name, body, frontmatter };
  }
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
  static async collectOtherFiles(baseDir, relativeDirPath, dirName, excludeFileName) {
    const dirPath = join51(baseDir, relativeDirPath, dirName);
    const glob = join51(dirPath, "**", "*");
    const filePaths = await findFilesByGlobs(glob, { type: "file" });
    const filteredPaths = filePaths.filter((filePath) => basename17(filePath) !== excludeFileName);
    const files = await Promise.all(
      filteredPaths.map(async (filePath) => {
        const fileBuffer = await readFileBuffer(filePath);
        return {
          relativeFilePathToDirPath: relative3(dirPath, filePath),
          fileBuffer
        };
      })
    );
    return files;
  }
};

// src/features/skills/tool-skill.ts
var ToolSkill = class extends AiDir {
  /**
   * Get the settable paths for this tool's skill directories.
   *
   * @param options - Optional configuration including global mode
   * @returns Object containing the relative directory path
   */
  static getSettablePaths(_options) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Load a skill from a tool-specific directory.
   *
   * This method should:
   * 1. Read the SKILL.md file content
   * 2. Parse tool-specific frontmatter format
   * 3. Validate the parsed data
   * 4. Collect other skill files in the directory
   * 5. Return a concrete ToolSkill instance
   *
   * @param params - Parameters including the skill directory name
   * @returns Promise resolving to a concrete ToolSkill instance
   */
  static async fromDir(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Create a minimal instance for deletion purposes.
   * This method does not read or parse directory content, making it safe to use
   * even when skill files have old/incompatible formats.
   */
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Convert a RulesyncSkill to the tool-specific skill format.
   *
   * This method should:
   * 1. Extract relevant data from the RulesyncSkill
   * 2. Transform frontmatter to tool-specific format
   * 3. Transform body content if needed
   * 4. Preserve other skill files
   * 5. Return a concrete ToolSkill instance
   *
   * @param params - Parameters including the RulesyncSkill to convert
   * @returns A concrete ToolSkill instance
   */
  static fromRulesyncSkill(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Check if this tool is targeted by a RulesyncSkill.
   * Since skills don't have targets field like commands/subagents,
   * the default behavior may vary by tool.
   *
   * @param rulesyncSkill - The RulesyncSkill to check
   * @returns True if this tool should use the skill
   */
  static isTargetedByRulesyncSkill(_rulesyncSkill) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Load and parse skill directory content.
   * This is a helper method that handles the common logic of reading SKILL.md,
   * parsing frontmatter, and collecting other files.
   *
   * Subclasses should call this method and then validate the frontmatter
   * against their specific schema.
   *
   * @param params - Parameters including settablePaths callback to get tool-specific paths
   * @returns Parsed skill directory content
   */
  static async loadSkillDirContent({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false,
    getSettablePaths
  }) {
    const settablePaths = getSettablePaths({ global });
    const actualRelativeDirPath = relativeDirPath ?? settablePaths.relativeDirPath;
    const skillDirPath = join52(baseDir, actualRelativeDirPath, dirName);
    const skillFilePath = join52(skillDirPath, SKILL_FILE_NAME);
    if (!await fileExists(skillFilePath)) {
      throw new Error(`${SKILL_FILE_NAME} not found in ${skillDirPath}`);
    }
    const fileContent = await readFileContent(skillFilePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const otherFiles = await this.collectOtherFiles(
      baseDir,
      actualRelativeDirPath,
      dirName,
      SKILL_FILE_NAME
    );
    return {
      baseDir,
      relativeDirPath: actualRelativeDirPath,
      dirName,
      frontmatter,
      body: content.trim(),
      otherFiles,
      global
    };
  }
  requireMainFileFrontmatter() {
    if (!this.mainFile?.frontmatter) {
      throw new Error(`Frontmatter is not defined in ${join52(this.relativeDirPath, this.dirName)}`);
    }
    return this.mainFile.frontmatter;
  }
};

// src/features/skills/simulated-skill.ts
var SimulatedSkillFrontmatterSchema = z20.looseObject({
  name: z20.string(),
  description: z20.string()
});
var SimulatedSkill = class extends ToolSkill {
  frontmatter;
  body;
  constructor({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global: false
      // Simulated skills are project mode only
    });
    if (validate) {
      const result = SimulatedSkillFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join53(relativeDirPath, dirName)}: ${formatError(result.error)}`
        );
      }
    }
    this.frontmatter = frontmatter;
    this.body = body;
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncSkill() {
    throw new Error("Not implemented because it is a SIMULATED skill.");
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = SimulatedSkillFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
  }
  static fromRulesyncSkillDefault({
    rulesyncSkill,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const simulatedFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return {
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: simulatedFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate
    };
  }
  static async fromDirDefault({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName
  }) {
    const settablePaths = this.getSettablePaths();
    const actualRelativeDirPath = relativeDirPath ?? settablePaths.relativeDirPath;
    const skillDirPath = join53(baseDir, actualRelativeDirPath, dirName);
    const skillFilePath = join53(skillDirPath, SKILL_FILE_NAME);
    if (!await fileExists(skillFilePath)) {
      throw new Error(`${SKILL_FILE_NAME} not found in ${skillDirPath}`);
    }
    const fileContent = await readFileContent(skillFilePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = SimulatedSkillFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${skillFilePath}: ${formatError(result.error)}`);
    }
    const otherFiles = await this.collectOtherFiles(
      baseDir,
      actualRelativeDirPath,
      dirName,
      SKILL_FILE_NAME
    );
    return {
      baseDir,
      relativeDirPath: actualRelativeDirPath,
      dirName,
      frontmatter: result.data,
      body: content.trim(),
      otherFiles,
      validate: true
    };
  }
  /**
   * Create minimal params for deletion purposes.
   * This method does not read or parse directory content, making it safe to use
   * even when skill files have old/incompatible formats.
   */
  static forDeletionDefault({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName
  }) {
    return {
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false
    };
  }
  /**
   * Check if a RulesyncSkill should be converted to this simulated skill type.
   * Uses the targets field in the RulesyncSkill frontmatter to determine targeting.
   */
  static isTargetedByRulesyncSkillDefault({
    rulesyncSkill,
    toolTarget
  }) {
    const frontmatter = rulesyncSkill.getFrontmatter();
    const targets = frontmatter.targets;
    if (targets.includes("*")) {
      return true;
    }
    return targets.includes(toolTarget);
  }
  /**
   * Get the settable paths for this tool's skill directories.
   * Must be implemented by concrete subclasses.
   */
  static getSettablePaths(_options) {
    throw new Error("Please implement this method in the subclass.");
  }
};

// src/features/skills/agentsmd-skill.ts
var AgentsmdSkill = class _AgentsmdSkill extends SimulatedSkill {
  static getSettablePaths(options) {
    if (options?.global) {
      throw new Error("AgentsmdSkill does not support global mode.");
    }
    return {
      relativeDirPath: join54(".agents", "skills")
    };
  }
  static async fromDir(params) {
    const baseParams = await this.fromDirDefault(params);
    return new _AgentsmdSkill(baseParams);
  }
  static fromRulesyncSkill(params) {
    const baseParams = {
      ...this.fromRulesyncSkillDefault(params),
      relativeDirPath: this.getSettablePaths().relativeDirPath
    };
    return new _AgentsmdSkill(baseParams);
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    return this.isTargetedByRulesyncSkillDefault({
      rulesyncSkill,
      toolTarget: "agentsmd"
    });
  }
  static forDeletion(params) {
    const baseParams = this.forDeletionDefault(params);
    return new _AgentsmdSkill(baseParams);
  }
};

// src/features/skills/factorydroid-skill.ts
import { join as join55 } from "path";
var FactorydroidSkill = class _FactorydroidSkill extends SimulatedSkill {
  static getSettablePaths(_options) {
    return {
      relativeDirPath: join55(".factory", "skills")
    };
  }
  static async fromDir(params) {
    const baseParams = await this.fromDirDefault(params);
    return new _FactorydroidSkill(baseParams);
  }
  static fromRulesyncSkill(params) {
    const baseParams = {
      ...this.fromRulesyncSkillDefault(params),
      relativeDirPath: this.getSettablePaths().relativeDirPath
    };
    return new _FactorydroidSkill(baseParams);
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    return this.isTargetedByRulesyncSkillDefault({
      rulesyncSkill,
      toolTarget: "factorydroid"
    });
  }
  static forDeletion(params) {
    const baseParams = this.forDeletionDefault(params);
    return new _FactorydroidSkill(baseParams);
  }
};

// src/features/skills/skills-processor.ts
import { basename as basename19, join as join71 } from "path";
import { z as z34 } from "zod/mini";

// src/types/dir-feature-processor.ts
import { join as join56 } from "path";
var DirFeatureProcessor = class {
  baseDir;
  dryRun;
  constructor({ baseDir = process.cwd(), dryRun = false }) {
    this.baseDir = baseDir;
    this.dryRun = dryRun;
  }
  /**
   * Return tool targets that this feature supports.
   */
  static getToolTargets(_params = {}) {
    throw new Error("Not implemented");
  }
  /**
   * Once converted to rulesync/tool dirs, write them to the filesystem.
   * Returns the number of directories written.
   *
   * Note: This method uses directory-level change detection. If any file within
   * a directory has changed, ALL files in that directory are rewritten. This is
   * an intentional design decision to ensure consistency within directory units.
   */
  async writeAiDirs(aiDirs) {
    let changedCount = 0;
    const changedPaths = [];
    for (const aiDir of aiDirs) {
      const dirPath = aiDir.getDirPath();
      let dirHasChanges = false;
      const mainFile = aiDir.getMainFile();
      let mainFileContent;
      if (mainFile) {
        const mainFilePath = join56(dirPath, mainFile.name);
        const content = stringifyFrontmatter(mainFile.body, mainFile.frontmatter);
        mainFileContent = addTrailingNewline(content);
        const existingContent = await readFileContentOrNull(mainFilePath);
        if (existingContent !== mainFileContent) {
          dirHasChanges = true;
        }
      }
      const otherFiles = aiDir.getOtherFiles();
      const otherFileContents = [];
      for (const file of otherFiles) {
        const contentWithNewline = addTrailingNewline(file.fileBuffer.toString("utf-8"));
        otherFileContents.push(contentWithNewline);
        if (!dirHasChanges) {
          const filePath = join56(dirPath, file.relativeFilePathToDirPath);
          const existingContent = await readFileContentOrNull(filePath);
          if (existingContent !== contentWithNewline) {
            dirHasChanges = true;
          }
        }
      }
      if (!dirHasChanges) {
        continue;
      }
      const relativeDir = aiDir.getRelativePathFromCwd();
      if (this.dryRun) {
        logger.info(`[DRY RUN] Would create directory: ${dirPath}`);
        if (mainFile) {
          logger.info(`[DRY RUN] Would write: ${join56(dirPath, mainFile.name)}`);
          changedPaths.push(join56(relativeDir, mainFile.name));
        }
        for (const file of otherFiles) {
          logger.info(`[DRY RUN] Would write: ${join56(dirPath, file.relativeFilePathToDirPath)}`);
          changedPaths.push(join56(relativeDir, file.relativeFilePathToDirPath));
        }
      } else {
        await ensureDir(dirPath);
        if (mainFile && mainFileContent) {
          const mainFilePath = join56(dirPath, mainFile.name);
          await writeFileContent(mainFilePath, mainFileContent);
          changedPaths.push(join56(relativeDir, mainFile.name));
        }
        for (const [i, file] of otherFiles.entries()) {
          const filePath = join56(dirPath, file.relativeFilePathToDirPath);
          const content = otherFileContents[i];
          if (content === void 0) {
            throw new Error(
              `Internal error: content for file ${file.relativeFilePathToDirPath} is undefined. This indicates a synchronization issue between otherFiles and otherFileContents arrays.`
            );
          }
          await writeFileContent(filePath, content);
          changedPaths.push(join56(relativeDir, file.relativeFilePathToDirPath));
        }
      }
      changedCount++;
    }
    return { count: changedCount, paths: changedPaths };
  }
  async removeAiDirs(aiDirs) {
    for (const aiDir of aiDirs) {
      await removeDirectory(aiDir.getDirPath());
    }
  }
  /**
   * Remove orphan directories that exist in the tool directory but not in the generated directories.
   * This only deletes directories that are no longer in the rulesync source, not directories that will be overwritten.
   */
  async removeOrphanAiDirs(existingDirs, generatedDirs) {
    const generatedPaths = new Set(generatedDirs.map((d) => d.getDirPath()));
    const orphanDirs = existingDirs.filter((d) => !generatedPaths.has(d.getDirPath()));
    for (const aiDir of orphanDirs) {
      const dirPath = aiDir.getDirPath();
      if (this.dryRun) {
        logger.info(`[DRY RUN] Would delete directory: ${dirPath}`);
      } else {
        await removeDirectory(dirPath);
      }
    }
    return orphanDirs.length;
  }
};

// src/features/skills/agentsskills-skill.ts
import { join as join58 } from "path";
import { z as z22 } from "zod/mini";

// src/features/skills/rulesync-skill.ts
import { join as join57 } from "path";
import { z as z21 } from "zod/mini";
var RulesyncSkillFrontmatterSchemaInternal = z21.looseObject({
  name: z21.string(),
  description: z21.string(),
  targets: z21._default(RulesyncTargetsSchema, ["*"]),
  claudecode: z21.optional(
    z21.looseObject({
      "allowed-tools": z21.optional(z21.array(z21.string()))
    })
  ),
  codexcli: z21.optional(
    z21.looseObject({
      "short-description": z21.optional(z21.string())
    })
  ),
  opencode: z21.optional(
    z21.looseObject({
      "allowed-tools": z21.optional(z21.array(z21.string()))
    })
  ),
  copilot: z21.optional(
    z21.looseObject({
      license: z21.optional(z21.string())
    })
  ),
  roo: z21.optional(z21.looseObject({}))
});
var RulesyncSkillFrontmatterSchema = RulesyncSkillFrontmatterSchemaInternal;
var RulesyncSkill = class _RulesyncSkill extends AiDir {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = RULESYNC_SKILLS_RELATIVE_DIR_PATH,
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths() {
    return {
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH
    };
  }
  getFrontmatter() {
    if (!this.mainFile?.frontmatter) {
      throw new Error(`Frontmatter is not defined in ${join57(this.relativeDirPath, this.dirName)}`);
    }
    const result = RulesyncSkillFrontmatterSchema.parse(this.mainFile.frontmatter);
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    const result = RulesyncSkillFrontmatterSchema.safeParse(this.mainFile?.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  static async fromDir({
    baseDir = process.cwd(),
    relativeDirPath = RULESYNC_SKILLS_RELATIVE_DIR_PATH,
    dirName,
    global = false
  }) {
    const skillDirPath = join57(baseDir, relativeDirPath, dirName);
    const skillFilePath = join57(skillDirPath, SKILL_FILE_NAME);
    if (!await fileExists(skillFilePath)) {
      throw new Error(`${SKILL_FILE_NAME} not found in ${skillDirPath}`);
    }
    const fileContent = await readFileContent(skillFilePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = RulesyncSkillFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${skillFilePath}: ${formatError(result.error)}`);
    }
    const otherFiles = await this.collectOtherFiles(
      baseDir,
      relativeDirPath,
      dirName,
      SKILL_FILE_NAME
    );
    return new _RulesyncSkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: result.data,
      body: content.trim(),
      otherFiles,
      validate: true,
      global
    });
  }
};

// src/features/skills/agentsskills-skill.ts
var AgentsSkillsSkillFrontmatterSchema = z22.looseObject({
  name: z22.string(),
  description: z22.string()
});
var AgentsSkillsSkill = class _AgentsSkillsSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join58(".agents", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths(options) {
    if (options?.global) {
      throw new Error("AgentsSkillsSkill does not support global mode.");
    }
    return {
      relativeDirPath: join58(".agents", "skills")
    };
  }
  getFrontmatter() {
    const result = AgentsSkillsSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = AgentsSkillsSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _AgentsSkillsSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const agentsSkillsFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _AgentsSkillsSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: agentsSkillsFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("agentsskills");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _AgentsSkillsSkill.getSettablePaths
    });
    const result = AgentsSkillsSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join58(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join58(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _AgentsSkillsSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    const settablePaths = _AgentsSkillsSkill.getSettablePaths({ global });
    return new _AgentsSkillsSkill({
      baseDir,
      relativeDirPath: relativeDirPath ?? settablePaths.relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/antigravity-skill.ts
import { join as join59 } from "path";
import { z as z23 } from "zod/mini";
var AntigravitySkillFrontmatterSchema = z23.looseObject({
  name: z23.string(),
  description: z23.string()
});
var AntigravitySkill = class _AntigravitySkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join59(".agent", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({
    global = false
  } = {}) {
    if (global) {
      return {
        relativeDirPath: join59(".gemini", "antigravity", "skills")
      };
    }
    return {
      relativeDirPath: join59(".agent", "skills")
    };
  }
  getFrontmatter() {
    const result = AntigravitySkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (this.mainFile === void 0) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = AntigravitySkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const antigravityFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    const settablePaths = _AntigravitySkill.getSettablePaths({ global });
    return new _AntigravitySkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: antigravityFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("antigravity");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _AntigravitySkill.getSettablePaths
    });
    const result = AntigravitySkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join59(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join59(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _AntigravitySkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    return new _AntigravitySkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/claudecode-skill.ts
import { join as join60 } from "path";
import { z as z24 } from "zod/mini";
var ClaudecodeSkillFrontmatterSchema = z24.looseObject({
  name: z24.string(),
  description: z24.string(),
  "allowed-tools": z24.optional(z24.array(z24.string()))
});
var ClaudecodeSkill = class _ClaudecodeSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join60(".claude", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({
    global: _global = false
  } = {}) {
    return {
      relativeDirPath: join60(".claude", "skills")
    };
  }
  getFrontmatter() {
    const result = ClaudecodeSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (this.mainFile === void 0) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = ClaudecodeSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"],
      ...frontmatter["allowed-tools"] && {
        claudecode: {
          "allowed-tools": frontmatter["allowed-tools"]
        }
      }
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const claudecodeFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      "allowed-tools": rulesyncFrontmatter.claudecode?.["allowed-tools"]
    };
    const settablePaths = _ClaudecodeSkill.getSettablePaths({ global });
    return new _ClaudecodeSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: claudecodeFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("claudecode");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _ClaudecodeSkill.getSettablePaths
    });
    const result = ClaudecodeSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join60(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join60(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _ClaudecodeSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    return new _ClaudecodeSkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/codexcli-skill.ts
import { join as join61 } from "path";
import { z as z25 } from "zod/mini";
var CodexCliSkillFrontmatterSchema = z25.looseObject({
  name: z25.string(),
  description: z25.string(),
  metadata: z25.optional(
    z25.looseObject({
      "short-description": z25.optional(z25.string())
    })
  )
});
var CodexCliSkill = class _CodexCliSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join61(".codex", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({
    global: _global = false
  } = {}) {
    return {
      relativeDirPath: join61(".codex", "skills")
    };
  }
  getFrontmatter() {
    const result = CodexCliSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = CodexCliSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"],
      ...frontmatter.metadata?.["short-description"] && {
        codexcli: {
          "short-description": frontmatter.metadata["short-description"]
        }
      }
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _CodexCliSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const codexFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      ...rulesyncFrontmatter.codexcli?.["short-description"] && {
        metadata: {
          "short-description": rulesyncFrontmatter.codexcli["short-description"]
        }
      }
    };
    return new _CodexCliSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: codexFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("codexcli");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _CodexCliSkill.getSettablePaths
    });
    const result = CodexCliSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join61(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join61(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _CodexCliSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    return new _CodexCliSkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/copilot-skill.ts
import { join as join62 } from "path";
import { z as z26 } from "zod/mini";
var CopilotSkillFrontmatterSchema = z26.looseObject({
  name: z26.string(),
  description: z26.string(),
  license: z26.optional(z26.string())
});
var CopilotSkill = class _CopilotSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join62(".github", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths(options) {
    if (options?.global) {
      throw new Error("CopilotSkill does not support global mode.");
    }
    return {
      relativeDirPath: join62(".github", "skills")
    };
  }
  getFrontmatter() {
    const result = CopilotSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = CopilotSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"],
      ...frontmatter.license && {
        copilot: {
          license: frontmatter.license
        }
      }
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _CopilotSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const copilotFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      license: rulesyncFrontmatter.copilot?.license
    };
    return new _CopilotSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: copilotFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("copilot");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _CopilotSkill.getSettablePaths
    });
    const result = CopilotSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join62(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join62(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _CopilotSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    const settablePaths = _CopilotSkill.getSettablePaths({ global });
    return new _CopilotSkill({
      baseDir,
      relativeDirPath: relativeDirPath ?? settablePaths.relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/cursor-skill.ts
import { join as join63 } from "path";
import { z as z27 } from "zod/mini";
var CursorSkillFrontmatterSchema = z27.looseObject({
  name: z27.string(),
  description: z27.string()
});
var CursorSkill = class _CursorSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join63(".cursor", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths(_options) {
    return {
      relativeDirPath: join63(".cursor", "skills")
    };
  }
  getFrontmatter() {
    const result = CursorSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = CursorSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _CursorSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const cursorFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _CursorSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: cursorFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("cursor");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _CursorSkill.getSettablePaths
    });
    const result = CursorSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join63(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join63(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _CursorSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    const settablePaths = _CursorSkill.getSettablePaths({ global });
    return new _CursorSkill({
      baseDir,
      relativeDirPath: relativeDirPath ?? settablePaths.relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/geminicli-skill.ts
import { join as join64 } from "path";
import { z as z28 } from "zod/mini";
var GeminiCliSkillFrontmatterSchema = z28.looseObject({
  name: z28.string(),
  description: z28.string()
});
var GeminiCliSkill = class _GeminiCliSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = _GeminiCliSkill.getSettablePaths().relativeDirPath,
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({
    global: _global = false
  } = {}) {
    return {
      relativeDirPath: join64(".gemini", "skills")
    };
  }
  getFrontmatter() {
    const result = GeminiCliSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (this.mainFile === void 0) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = GeminiCliSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _GeminiCliSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const geminiCliFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _GeminiCliSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: geminiCliFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("geminicli");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _GeminiCliSkill.getSettablePaths
    });
    const result = GeminiCliSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join64(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join64(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _GeminiCliSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    const settablePaths = _GeminiCliSkill.getSettablePaths({ global });
    return new _GeminiCliSkill({
      baseDir,
      relativeDirPath: relativeDirPath ?? settablePaths.relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/kilo-skill.ts
import { join as join65 } from "path";
import { z as z29 } from "zod/mini";
var KiloSkillFrontmatterSchema = z29.looseObject({
  name: z29.string(),
  description: z29.string()
});
var KiloSkill = class _KiloSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join65(".kilocode", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({
    global: _global = false
  } = {}) {
    return {
      relativeDirPath: join65(".kilocode", "skills")
    };
  }
  getFrontmatter() {
    const result = KiloSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = KiloSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    if (result.data.name !== this.getDirName()) {
      return {
        success: false,
        error: new Error(
          `${this.getDirPath()}: frontmatter name (${result.data.name}) must match directory name (${this.getDirName()})`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _KiloSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const kiloFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _KiloSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: kiloFrontmatter.name,
      frontmatter: kiloFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("kilo");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _KiloSkill.getSettablePaths
    });
    const result = KiloSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join65(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join65(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    if (result.data.name !== loaded.dirName) {
      const skillFilePath = join65(
        loaded.baseDir,
        loaded.relativeDirPath,
        loaded.dirName,
        SKILL_FILE_NAME
      );
      throw new Error(
        `Frontmatter name (${result.data.name}) must match directory name (${loaded.dirName}) in ${skillFilePath}`
      );
    }
    return new _KiloSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    return new _KiloSkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/kiro-skill.ts
import { join as join66 } from "path";
import { z as z30 } from "zod/mini";
var KiroSkillFrontmatterSchema = z30.looseObject({
  name: z30.string(),
  description: z30.string()
});
var KiroSkill = class _KiroSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join66(".kiro", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths(options) {
    if (options?.global) {
      throw new Error("KiroSkill does not support global mode.");
    }
    return {
      relativeDirPath: join66(".kiro", "skills")
    };
  }
  getFrontmatter() {
    const result = KiroSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = KiroSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    if (result.data.name !== this.getDirName()) {
      return {
        success: false,
        error: new Error(
          `${this.getDirPath()}: frontmatter name (${result.data.name}) must match directory name (${this.getDirName()})`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _KiroSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const kiroFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _KiroSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: kiroFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("kiro");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _KiroSkill.getSettablePaths
    });
    const result = KiroSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join66(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join66(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    if (result.data.name !== loaded.dirName) {
      const skillFilePath = join66(
        loaded.baseDir,
        loaded.relativeDirPath,
        loaded.dirName,
        SKILL_FILE_NAME
      );
      throw new Error(
        `Frontmatter name (${result.data.name}) must match directory name (${loaded.dirName}) in ${skillFilePath}`
      );
    }
    return new _KiroSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    const settablePaths = _KiroSkill.getSettablePaths({ global });
    return new _KiroSkill({
      baseDir,
      relativeDirPath: relativeDirPath ?? settablePaths.relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/opencode-skill.ts
import { join as join67 } from "path";
import { z as z31 } from "zod/mini";
var OpenCodeSkillFrontmatterSchema = z31.looseObject({
  name: z31.string(),
  description: z31.string(),
  "allowed-tools": z31.optional(z31.array(z31.string()))
});
var OpenCodeSkill = class _OpenCodeSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join67(".opencode", "skill"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({ global = false } = {}) {
    return {
      relativeDirPath: global ? join67(".config", "opencode", "skill") : join67(".opencode", "skill")
    };
  }
  getFrontmatter() {
    const result = OpenCodeSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (this.mainFile === void 0) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = OpenCodeSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"],
      ...frontmatter["allowed-tools"] && {
        opencode: {
          "allowed-tools": frontmatter["allowed-tools"]
        }
      }
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const opencodeFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      "allowed-tools": rulesyncFrontmatter.opencode?.["allowed-tools"]
    };
    const settablePaths = _OpenCodeSkill.getSettablePaths({ global });
    return new _OpenCodeSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: opencodeFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("opencode");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _OpenCodeSkill.getSettablePaths
    });
    const result = OpenCodeSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join67(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join67(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _OpenCodeSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    return new _OpenCodeSkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/replit-skill.ts
import { join as join68 } from "path";
import { z as z32 } from "zod/mini";
var ReplitSkillFrontmatterSchema = z32.looseObject({
  name: z32.string(),
  description: z32.string()
});
var ReplitSkill = class _ReplitSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join68(".agents", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths(options) {
    if (options?.global) {
      throw new Error("ReplitSkill does not support global mode.");
    }
    return {
      relativeDirPath: join68(".agents", "skills")
    };
  }
  getFrontmatter() {
    const result = ReplitSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = ReplitSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _ReplitSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const replitFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _ReplitSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: replitFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("replit");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _ReplitSkill.getSettablePaths
    });
    const result = ReplitSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join68(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join68(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    return new _ReplitSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    const settablePaths = _ReplitSkill.getSettablePaths({ global });
    return new _ReplitSkill({
      baseDir,
      relativeDirPath: relativeDirPath ?? settablePaths.relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/roo-skill.ts
import { join as join69 } from "path";
import { z as z33 } from "zod/mini";
var RooSkillFrontmatterSchema = z33.looseObject({
  name: z33.string(),
  description: z33.string()
});
var RooSkill = class _RooSkill extends ToolSkill {
  constructor({
    baseDir = process.cwd(),
    relativeDirPath = join69(".roo", "skills"),
    dirName,
    frontmatter,
    body,
    otherFiles = [],
    validate = true,
    global = false
  }) {
    super({
      baseDir,
      relativeDirPath,
      dirName,
      mainFile: {
        name: SKILL_FILE_NAME,
        body,
        frontmatter: { ...frontmatter }
      },
      otherFiles,
      global
    });
    if (validate) {
      const result = this.validate();
      if (!result.success) {
        throw result.error;
      }
    }
  }
  static getSettablePaths({
    global: _global = false
  } = {}) {
    return {
      relativeDirPath: join69(".roo", "skills")
    };
  }
  getFrontmatter() {
    const result = RooSkillFrontmatterSchema.parse(this.requireMainFileFrontmatter());
    return result;
  }
  getBody() {
    return this.mainFile?.body ?? "";
  }
  validate() {
    if (!this.mainFile) {
      return {
        success: false,
        error: new Error(`${this.getDirPath()}: ${SKILL_FILE_NAME} file does not exist`)
      };
    }
    const result = RooSkillFrontmatterSchema.safeParse(this.mainFile.frontmatter);
    if (!result.success) {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${this.getDirPath()}: ${formatError(result.error)}`
        )
      };
    }
    if (result.data.name !== this.getDirName()) {
      return {
        success: false,
        error: new Error(
          `${this.getDirPath()}: frontmatter name (${result.data.name}) must match directory name (${this.getDirName()})`
        )
      };
    }
    return { success: true, error: null };
  }
  toRulesyncSkill() {
    const frontmatter = this.getFrontmatter();
    const rulesyncFrontmatter = {
      name: frontmatter.name,
      description: frontmatter.description,
      targets: ["*"]
    };
    return new RulesyncSkill({
      baseDir: this.baseDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: this.getDirName(),
      frontmatter: rulesyncFrontmatter,
      body: this.getBody(),
      otherFiles: this.getOtherFiles(),
      validate: true,
      global: this.global
    });
  }
  static fromRulesyncSkill({
    rulesyncSkill,
    validate = true,
    global = false
  }) {
    const settablePaths = _RooSkill.getSettablePaths({ global });
    const rulesyncFrontmatter = rulesyncSkill.getFrontmatter();
    const rooFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    return new _RooSkill({
      baseDir: rulesyncSkill.getBaseDir(),
      relativeDirPath: settablePaths.relativeDirPath,
      dirName: rooFrontmatter.name,
      frontmatter: rooFrontmatter,
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global
    });
  }
  static isTargetedByRulesyncSkill(rulesyncSkill) {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("roo");
  }
  static async fromDir(params) {
    const loaded = await this.loadSkillDirContent({
      ...params,
      getSettablePaths: _RooSkill.getSettablePaths
    });
    const result = RooSkillFrontmatterSchema.safeParse(loaded.frontmatter);
    if (!result.success) {
      const skillDirPath = join69(loaded.baseDir, loaded.relativeDirPath, loaded.dirName);
      throw new Error(
        `Invalid frontmatter in ${join69(skillDirPath, SKILL_FILE_NAME)}: ${formatError(result.error)}`
      );
    }
    if (result.data.name !== loaded.dirName) {
      const skillFilePath = join69(
        loaded.baseDir,
        loaded.relativeDirPath,
        loaded.dirName,
        SKILL_FILE_NAME
      );
      throw new Error(
        `Frontmatter name (${result.data.name}) must match directory name (${loaded.dirName}) in ${skillFilePath}`
      );
    }
    return new _RooSkill({
      baseDir: loaded.baseDir,
      relativeDirPath: loaded.relativeDirPath,
      dirName: loaded.dirName,
      frontmatter: result.data,
      body: loaded.body,
      otherFiles: loaded.otherFiles,
      validate: true,
      global: loaded.global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    dirName,
    global = false
  }) {
    return new _RooSkill({
      baseDir,
      relativeDirPath,
      dirName,
      frontmatter: { name: "", description: "" },
      body: "",
      otherFiles: [],
      validate: false,
      global
    });
  }
};

// src/features/skills/skills-utils.ts
import { basename as basename18, join as join70 } from "path";
async function getLocalSkillDirNames(baseDir) {
  const skillsDir = join70(baseDir, RULESYNC_SKILLS_RELATIVE_DIR_PATH);
  const names = /* @__PURE__ */ new Set();
  if (!await directoryExists(skillsDir)) {
    return names;
  }
  const dirPaths = await findFilesByGlobs(join70(skillsDir, "*"), { type: "dir" });
  for (const dirPath of dirPaths) {
    const name = basename18(dirPath);
    if (name === basename18(RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH)) continue;
    names.add(name);
  }
  return names;
}

// src/features/skills/skills-processor.ts
var skillsProcessorToolTargetTuple = [
  "agentsmd",
  "agentsskills",
  "antigravity",
  "claudecode",
  "claudecode-legacy",
  "codexcli",
  "copilot",
  "cursor",
  "factorydroid",
  "geminicli",
  "kilo",
  "kiro",
  "opencode",
  "replit",
  "roo"
];
var SkillsProcessorToolTargetSchema = z34.enum(skillsProcessorToolTargetTuple);
var toolSkillFactories = /* @__PURE__ */ new Map([
  [
    "agentsmd",
    {
      class: AgentsmdSkill,
      meta: { supportsProject: true, supportsSimulated: true, supportsGlobal: false }
    }
  ],
  [
    "agentsskills",
    {
      class: AgentsSkillsSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: false }
    }
  ],
  [
    "antigravity",
    {
      class: AntigravitySkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "claudecode",
    {
      class: ClaudecodeSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "claudecode-legacy",
    {
      class: ClaudecodeSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "codexcli",
    {
      class: CodexCliSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "copilot",
    {
      class: CopilotSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: false }
    }
  ],
  [
    "cursor",
    {
      class: CursorSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "factorydroid",
    {
      class: FactorydroidSkill,
      meta: { supportsProject: true, supportsSimulated: true, supportsGlobal: true }
    }
  ],
  [
    "geminicli",
    {
      class: GeminiCliSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "kilo",
    {
      class: KiloSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "kiro",
    {
      class: KiroSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: false }
    }
  ],
  [
    "opencode",
    {
      class: OpenCodeSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ],
  [
    "replit",
    {
      class: ReplitSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: false }
    }
  ],
  [
    "roo",
    {
      class: RooSkill,
      meta: { supportsProject: true, supportsSimulated: false, supportsGlobal: true }
    }
  ]
]);
var defaultGetFactory4 = (target) => {
  const factory = toolSkillFactories.get(target);
  if (!factory) {
    throw new Error(`Unsupported tool target: ${target}`);
  }
  return factory;
};
var allToolTargetKeys3 = [...toolSkillFactories.keys()];
var skillsProcessorToolTargetsProject = allToolTargetKeys3.filter((target) => {
  const factory = toolSkillFactories.get(target);
  return factory?.meta.supportsProject ?? true;
});
var skillsProcessorToolTargetsSimulated = allToolTargetKeys3.filter(
  (target) => {
    const factory = toolSkillFactories.get(target);
    return factory?.meta.supportsSimulated ?? false;
  }
);
var skillsProcessorToolTargetsGlobal = allToolTargetKeys3.filter((target) => {
  const factory = toolSkillFactories.get(target);
  return factory?.meta.supportsGlobal ?? false;
});
var SkillsProcessor = class extends DirFeatureProcessor {
  toolTarget;
  global;
  getFactory;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    global = false,
    getFactory = defaultGetFactory4,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = SkillsProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for SkillsProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.global = global;
    this.getFactory = getFactory;
  }
  async convertRulesyncDirsToToolDirs(rulesyncDirs) {
    const rulesyncSkills = rulesyncDirs.filter(
      (dir) => dir instanceof RulesyncSkill
    );
    const factory = this.getFactory(this.toolTarget);
    const toolSkills = rulesyncSkills.map((rulesyncSkill) => {
      if (!factory.class.isTargetedByRulesyncSkill(rulesyncSkill)) {
        return null;
      }
      return factory.class.fromRulesyncSkill({
        rulesyncSkill,
        global: this.global
      });
    }).filter((skill) => skill !== null);
    return toolSkills;
  }
  async convertToolDirsToRulesyncDirs(toolDirs) {
    const toolSkills = toolDirs.filter((dir) => dir instanceof ToolSkill);
    const rulesyncSkills = [];
    for (const toolSkill of toolSkills) {
      if (toolSkill instanceof SimulatedSkill) {
        logger.debug(`Skipping simulated skill conversion: ${toolSkill.getDirPath()}`);
        continue;
      }
      rulesyncSkills.push(toolSkill.toRulesyncSkill());
    }
    return rulesyncSkills;
  }
  /**
   * Implementation of abstract method from DirFeatureProcessor
   * Load and parse rulesync skill directories from .rulesync/skills/ directory
   * and also from .rulesync/skills/.curated/ for remote skills.
   * Local skills take precedence over curated skills with the same name.
   */
  async loadRulesyncDirs() {
    const localDirNames = [...await getLocalSkillDirNames(this.baseDir)];
    const localSkills = await Promise.all(
      localDirNames.map(
        (dirName) => RulesyncSkill.fromDir({ baseDir: this.baseDir, dirName, global: this.global })
      )
    );
    const localSkillNames = new Set(localDirNames);
    const curatedDirPath = join71(this.baseDir, RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH);
    let curatedSkills = [];
    if (await directoryExists(curatedDirPath)) {
      const curatedDirPaths = await findFilesByGlobs(join71(curatedDirPath, "*"), { type: "dir" });
      const curatedDirNames = curatedDirPaths.map((path3) => basename19(path3));
      const nonConflicting = curatedDirNames.filter((name) => {
        if (localSkillNames.has(name)) {
          logger.debug(`Skipping curated skill "${name}": local skill takes precedence.`);
          return false;
        }
        return true;
      });
      const curatedRelativeDirPath = RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH;
      curatedSkills = await Promise.all(
        nonConflicting.map(
          (dirName) => RulesyncSkill.fromDir({
            baseDir: this.baseDir,
            relativeDirPath: curatedRelativeDirPath,
            dirName,
            global: this.global
          })
        )
      );
    }
    const allSkills = [...localSkills, ...curatedSkills];
    logger.debug(
      `Successfully loaded ${allSkills.length} rulesync skills (${localSkills.length} local, ${curatedSkills.length} curated)`
    );
    return allSkills;
  }
  /**
   * Implementation of abstract method from DirFeatureProcessor
   * Load tool-specific skill configurations and parse them into ToolSkill instances
   */
  async loadToolDirs() {
    const factory = this.getFactory(this.toolTarget);
    const paths = factory.class.getSettablePaths({ global: this.global });
    const skillsDirPath = join71(this.baseDir, paths.relativeDirPath);
    const dirPaths = await findFilesByGlobs(join71(skillsDirPath, "*"), { type: "dir" });
    const dirNames = dirPaths.map((path3) => basename19(path3));
    const toolSkills = await Promise.all(
      dirNames.map(
        (dirName) => factory.class.fromDir({
          baseDir: this.baseDir,
          dirName,
          global: this.global
        })
      )
    );
    logger.debug(`Successfully loaded ${toolSkills.length} ${paths.relativeDirPath} skills`);
    return toolSkills;
  }
  async loadToolDirsToDelete() {
    const factory = this.getFactory(this.toolTarget);
    const paths = factory.class.getSettablePaths({ global: this.global });
    const skillsDirPath = join71(this.baseDir, paths.relativeDirPath);
    const dirPaths = await findFilesByGlobs(join71(skillsDirPath, "*"), { type: "dir" });
    const dirNames = dirPaths.map((path3) => basename19(path3));
    const toolSkills = dirNames.map(
      (dirName) => factory.class.forDeletion({
        baseDir: this.baseDir,
        relativeDirPath: paths.relativeDirPath,
        dirName,
        global: this.global
      })
    );
    logger.debug(
      `Successfully loaded ${toolSkills.length} ${paths.relativeDirPath} skills for deletion`
    );
    return toolSkills;
  }
  /**
   * Implementation of abstract method from DirFeatureProcessor
   * Return the tool targets that this processor supports
   */
  static getToolTargets({
    global = false,
    includeSimulated = false
  } = {}) {
    if (global) {
      return skillsProcessorToolTargetsGlobal;
    }
    const projectTargets = skillsProcessorToolTargetsProject;
    if (!includeSimulated) {
      return projectTargets.filter(
        (target) => !skillsProcessorToolTargetsSimulated.includes(target)
      );
    }
    return projectTargets;
  }
  /**
   * Return the simulated tool targets
   */
  static getToolTargetsSimulated() {
    return skillsProcessorToolTargetsSimulated;
  }
  /**
   * Return the tool targets that this processor supports in global mode
   */
  static getToolTargetsGlobal() {
    return skillsProcessorToolTargetsGlobal;
  }
  /**
   * Get the factory for a specific tool target.
   * This is a static version of the internal getFactory for external use.
   * @param target - The tool target. Must be a valid SkillsProcessorToolTarget.
   * @returns The factory for the target, or undefined if not found.
   */
  static getFactory(target) {
    const result = SkillsProcessorToolTargetSchema.safeParse(target);
    if (!result.success) {
      return void 0;
    }
    return toolSkillFactories.get(result.data);
  }
};

// src/features/subagents/agentsmd-subagent.ts
import { join as join73 } from "path";

// src/features/subagents/simulated-subagent.ts
import { basename as basename20, join as join72 } from "path";
import { z as z35 } from "zod/mini";

// src/features/subagents/tool-subagent.ts
var ToolSubagent = class extends ToolFile {
  static getSettablePaths() {
    throw new Error("Please implement this method in the subclass.");
  }
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Create a minimal instance for deletion purposes.
   * This method does not read or parse file content, making it safe to use
   * even when files have old/incompatible formats.
   */
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  static fromRulesyncSubagent(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  static isTargetedByRulesyncSubagent(_rulesyncSubagent) {
    throw new Error("Please implement this method in the subclass.");
  }
  static isTargetedByRulesyncSubagentDefault({
    rulesyncSubagent,
    toolTarget
  }) {
    const targets = rulesyncSubagent.getFrontmatter().targets;
    if (!targets) {
      return true;
    }
    if (targets.includes("*")) {
      return true;
    }
    if (targets.includes(toolTarget)) {
      return true;
    }
    return false;
  }
};

// src/features/subagents/simulated-subagent.ts
var SimulatedSubagentFrontmatterSchema = z35.object({
  name: z35.string(),
  description: z35.string()
});
var SimulatedSubagent = class extends ToolSubagent {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = SimulatedSubagentFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join72(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  getBody() {
    return this.body;
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  toRulesyncSubagent() {
    throw new Error("Not implemented because it is a SIMULATED file.");
  }
  static fromRulesyncSubagentDefault({
    baseDir = process.cwd(),
    rulesyncSubagent,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const simulatedFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description
    };
    const body = rulesyncSubagent.getBody();
    return {
      baseDir,
      frontmatter: simulatedFrontmatter,
      body,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: rulesyncSubagent.getRelativeFilePath(),
      validate
    };
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = SimulatedSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join72(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static async fromFileDefault({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const filePath = join72(baseDir, this.getSettablePaths().relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = SimulatedSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return {
      baseDir,
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: basename20(relativeFilePath),
      frontmatter: result.data,
      body: content.trim(),
      validate
    };
  }
  static forDeletionDefault({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return {
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { name: "", description: "" },
      body: "",
      validate: false
    };
  }
};

// src/features/subagents/agentsmd-subagent.ts
var AgentsmdSubagent = class _AgentsmdSubagent extends SimulatedSubagent {
  static getSettablePaths() {
    return {
      relativeDirPath: join73(".agents", "subagents")
    };
  }
  static async fromFile(params) {
    const baseParams = await this.fromFileDefault(params);
    return new _AgentsmdSubagent(baseParams);
  }
  static fromRulesyncSubagent(params) {
    const baseParams = this.fromRulesyncSubagentDefault(params);
    return new _AgentsmdSubagent(baseParams);
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "agentsmd"
    });
  }
  static forDeletion(params) {
    return new _AgentsmdSubagent(this.forDeletionDefault(params));
  }
};

// src/features/subagents/codexcli-subagent.ts
import { join as join74 } from "path";
var CodexCliSubagent = class _CodexCliSubagent extends SimulatedSubagent {
  static getSettablePaths() {
    return {
      relativeDirPath: join74(".codex", "subagents")
    };
  }
  static async fromFile(params) {
    const baseParams = await this.fromFileDefault(params);
    return new _CodexCliSubagent(baseParams);
  }
  static fromRulesyncSubagent(params) {
    const baseParams = this.fromRulesyncSubagentDefault(params);
    return new _CodexCliSubagent(baseParams);
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "codexcli"
    });
  }
  static forDeletion(params) {
    return new _CodexCliSubagent(this.forDeletionDefault(params));
  }
};

// src/features/subagents/factorydroid-subagent.ts
import { join as join75 } from "path";
var FactorydroidSubagent = class _FactorydroidSubagent extends SimulatedSubagent {
  static getSettablePaths(_options) {
    return {
      relativeDirPath: join75(".factory", "droids")
    };
  }
  static async fromFile(params) {
    const baseParams = await this.fromFileDefault(params);
    return new _FactorydroidSubagent(baseParams);
  }
  static fromRulesyncSubagent(params) {
    const baseParams = this.fromRulesyncSubagentDefault(params);
    return new _FactorydroidSubagent(baseParams);
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "factorydroid"
    });
  }
  static forDeletion(params) {
    return new _FactorydroidSubagent(this.forDeletionDefault(params));
  }
};

// src/features/subagents/geminicli-subagent.ts
import { join as join76 } from "path";
var GeminiCliSubagent = class _GeminiCliSubagent extends SimulatedSubagent {
  static getSettablePaths() {
    return {
      relativeDirPath: join76(".gemini", "subagents")
    };
  }
  static async fromFile(params) {
    const baseParams = await this.fromFileDefault(params);
    return new _GeminiCliSubagent(baseParams);
  }
  static fromRulesyncSubagent(params) {
    const baseParams = this.fromRulesyncSubagentDefault(params);
    return new _GeminiCliSubagent(baseParams);
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "geminicli"
    });
  }
  static forDeletion(params) {
    return new _GeminiCliSubagent(this.forDeletionDefault(params));
  }
};

// src/features/subagents/roo-subagent.ts
import { join as join77 } from "path";
var RooSubagent = class _RooSubagent extends SimulatedSubagent {
  static getSettablePaths() {
    return {
      relativeDirPath: join77(".roo", "subagents")
    };
  }
  static async fromFile(params) {
    const baseParams = await this.fromFileDefault(params);
    return new _RooSubagent(baseParams);
  }
  static fromRulesyncSubagent(params) {
    const baseParams = this.fromRulesyncSubagentDefault(params);
    return new _RooSubagent(baseParams);
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "roo"
    });
  }
  static forDeletion(params) {
    return new _RooSubagent(this.forDeletionDefault(params));
  }
};

// src/features/subagents/subagents-processor.ts
import { basename as basename23, join as join84 } from "path";
import { z as z42 } from "zod/mini";

// src/features/subagents/claudecode-subagent.ts
import { join as join79 } from "path";
import { z as z37 } from "zod/mini";

// src/features/subagents/rulesync-subagent.ts
import { basename as basename21, join as join78 } from "path";
import { z as z36 } from "zod/mini";
var RulesyncSubagentFrontmatterSchema = z36.looseObject({
  targets: z36._default(RulesyncTargetsSchema, ["*"]),
  name: z36.string(),
  description: z36.string()
});
var RulesyncSubagent = class _RulesyncSubagent extends RulesyncFile {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    const parseResult = RulesyncSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!parseResult.success && rest.validate !== false) {
      throw new Error(
        `Invalid frontmatter in ${join78(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(parseResult.error)}`
      );
    }
    const parsedFrontmatter = parseResult.success ? { ...frontmatter, ...parseResult.data } : { ...frontmatter, targets: frontmatter?.targets ?? ["*"] };
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, parsedFrontmatter)
    });
    this.frontmatter = parsedFrontmatter;
    this.body = body;
  }
  static getSettablePaths() {
    return {
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = RulesyncSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join78(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static async fromFile({
    relativeFilePath
  }) {
    const fileContent = await readFileContent(
      join78(process.cwd(), RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, relativeFilePath)
    );
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = RulesyncSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${relativeFilePath}: ${formatError(result.error)}`);
    }
    const filename = basename21(relativeFilePath);
    return new _RulesyncSubagent({
      baseDir: process.cwd(),
      relativeDirPath: this.getSettablePaths().relativeDirPath,
      relativeFilePath: filename,
      frontmatter: result.data,
      body: content.trim()
    });
  }
};

// src/features/subagents/claudecode-subagent.ts
var ClaudecodeSubagentFrontmatterSchema = z37.looseObject({
  name: z37.string(),
  description: z37.string(),
  model: z37.optional(z37.string()),
  tools: z37.optional(z37.union([z37.string(), z37.array(z37.string())])),
  permissionMode: z37.optional(z37.string()),
  skills: z37.optional(z37.union([z37.string(), z37.array(z37.string())]))
});
var ClaudecodeSubagent = class _ClaudecodeSubagent extends ToolSubagent {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate !== false) {
      const result = ClaudecodeSubagentFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join79(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join79(".claude", "agents")
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  toRulesyncSubagent() {
    const { name, description, model, ...restFields } = this.frontmatter;
    const claudecodeSection = {
      ...model && { model },
      ...restFields
    };
    const rulesyncFrontmatter = {
      targets: ["*"],
      name,
      description,
      // Only include claudecode section if there are fields
      ...Object.keys(claudecodeSection).length > 0 && { claudecode: claudecodeSection }
    };
    return new RulesyncSubagent({
      baseDir: ".",
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true
    });
  }
  static fromRulesyncSubagent({
    baseDir = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const claudecodeSection = rulesyncFrontmatter.claudecode ?? {};
    const rawClaudecodeFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      ...claudecodeSection
    };
    const result = ClaudecodeSubagentFrontmatterSchema.safeParse(rawClaudecodeFrontmatter);
    if (!result.success) {
      throw new Error(
        `Invalid claudecode subagent frontmatter in ${rulesyncSubagent.getRelativeFilePath()}: ${formatError(result.error)}`
      );
    }
    const claudecodeFrontmatter = result.data;
    const body = rulesyncSubagent.getBody();
    const fileContent = stringifyFrontmatter(body, claudecodeFrontmatter);
    const paths = this.getSettablePaths({ global });
    return new _ClaudecodeSubagent({
      baseDir,
      frontmatter: claudecodeFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncSubagent.getRelativeFilePath(),
      fileContent,
      validate
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = ClaudecodeSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join79(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "claudecode"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join79(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = ClaudecodeSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _ClaudecodeSubagent({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClaudecodeSubagent({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { name: "", description: "" },
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/subagents/copilot-subagent.ts
import { join as join80 } from "path";
import { z as z38 } from "zod/mini";
var REQUIRED_TOOL = "agent/runSubagent";
var CopilotSubagentFrontmatterSchema = z38.looseObject({
  name: z38.string(),
  description: z38.string(),
  tools: z38.optional(z38.union([z38.string(), z38.array(z38.string())]))
});
var normalizeTools = (tools) => {
  if (!tools) {
    return [];
  }
  return Array.isArray(tools) ? tools : [tools];
};
var ensureRequiredTool = (tools) => {
  const mergedTools = /* @__PURE__ */ new Set([REQUIRED_TOOL, ...tools]);
  return Array.from(mergedTools);
};
var CopilotSubagent = class _CopilotSubagent extends ToolSubagent {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate !== false) {
      const result = CopilotSubagentFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join80(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join80(".github", "agents")
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  toRulesyncSubagent() {
    const { name, description, tools, ...rest } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["*"],
      name,
      description,
      copilot: {
        ...tools && { tools },
        ...rest
      }
    };
    return new RulesyncSubagent({
      baseDir: ".",
      // RulesyncCommand baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true
    });
  }
  static fromRulesyncSubagent({
    baseDir = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const copilotSection = rulesyncFrontmatter.copilot ?? {};
    const toolsField = copilotSection.tools;
    const userTools = normalizeTools(
      Array.isArray(toolsField) || typeof toolsField === "string" ? toolsField : void 0
    );
    const mergedTools = ensureRequiredTool(userTools);
    const copilotFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      ...copilotSection,
      ...mergedTools.length > 0 && { tools: mergedTools }
    };
    const body = rulesyncSubagent.getBody();
    const fileContent = stringifyFrontmatter(body, copilotFrontmatter);
    const paths = this.getSettablePaths({ global });
    return new _CopilotSubagent({
      baseDir,
      frontmatter: copilotFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncSubagent.getRelativeFilePath(),
      fileContent,
      validate,
      global
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = CopilotSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join80(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "copilot"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join80(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = CopilotSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _CopilotSubagent({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate,
      global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CopilotSubagent({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { name: "", description: "" },
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/subagents/cursor-subagent.ts
import { join as join81 } from "path";
import { z as z39 } from "zod/mini";
var CursorSubagentFrontmatterSchema = z39.looseObject({
  name: z39.string(),
  description: z39.string()
});
var CursorSubagent = class _CursorSubagent extends ToolSubagent {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate !== false) {
      const result = CursorSubagentFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join81(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join81(".cursor", "agents")
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  toRulesyncSubagent() {
    const { name, description, ...rest } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["*"],
      name,
      description,
      cursor: {
        ...rest
      }
    };
    return new RulesyncSubagent({
      baseDir: ".",
      // RulesyncSubagent baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true
    });
  }
  static fromRulesyncSubagent({
    baseDir = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const cursorSection = rulesyncFrontmatter.cursor ?? {};
    const cursorFrontmatter = {
      name: rulesyncFrontmatter.name,
      description: rulesyncFrontmatter.description,
      ...cursorSection
    };
    const body = rulesyncSubagent.getBody();
    const fileContent = stringifyFrontmatter(body, cursorFrontmatter);
    const paths = this.getSettablePaths({ global });
    return new _CursorSubagent({
      baseDir,
      frontmatter: cursorFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncSubagent.getRelativeFilePath(),
      fileContent,
      validate,
      global
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = CursorSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join81(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "cursor"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join81(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = CursorSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _CursorSubagent({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate,
      global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CursorSubagent({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { name: "", description: "" },
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/subagents/kiro-subagent.ts
import { join as join82 } from "path";
import { z as z40 } from "zod/mini";
var KiroCliSubagentJsonSchema = z40.looseObject({
  name: z40.string(),
  description: z40.optional(z40.nullable(z40.string())),
  prompt: z40.optional(z40.nullable(z40.string())),
  tools: z40.optional(z40.nullable(z40.array(z40.string()))),
  toolAliases: z40.optional(z40.nullable(z40.record(z40.string(), z40.string()))),
  toolSettings: z40.optional(z40.nullable(z40.unknown())),
  toolSchema: z40.optional(z40.nullable(z40.unknown())),
  hooks: z40.optional(z40.nullable(z40.record(z40.string(), z40.array(z40.unknown())))),
  model: z40.optional(z40.nullable(z40.string())),
  mcpServers: z40.optional(z40.nullable(z40.record(z40.string(), z40.unknown()))),
  useLegacyMcpJson: z40.optional(z40.nullable(z40.boolean())),
  resources: z40.optional(z40.nullable(z40.array(z40.string()))),
  allowedTools: z40.optional(z40.nullable(z40.array(z40.string()))),
  includeMcpJson: z40.optional(z40.nullable(z40.boolean()))
});
var KiroSubagent = class _KiroSubagent extends ToolSubagent {
  body;
  constructor({ body, ...rest }) {
    super({
      ...rest
    });
    this.body = body;
  }
  static getSettablePaths(_options = {}) {
    return {
      relativeDirPath: join82(".kiro", "agents")
    };
  }
  getBody() {
    return this.body;
  }
  toRulesyncSubagent() {
    const parsed = JSON.parse(this.body);
    const { name, description, prompt, ...restFields } = parsed;
    const kiroSection = {
      ...restFields
    };
    const rulesyncFrontmatter = {
      targets: ["kiro"],
      name,
      description: description ?? "",
      // Only include kiro section if there are fields
      ...Object.keys(kiroSection).length > 0 && { kiro: kiroSection }
    };
    return new RulesyncSubagent({
      baseDir: ".",
      frontmatter: rulesyncFrontmatter,
      body: prompt ?? "",
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath().replace(/\.json$/, ".md"),
      validate: true
    });
  }
  static fromRulesyncSubagent({
    baseDir = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false
  }) {
    const frontmatter = rulesyncSubagent.getFrontmatter();
    const kiroSection = frontmatter.kiro ?? {};
    const json = {
      name: frontmatter.name,
      description: frontmatter.description || null,
      prompt: rulesyncSubagent.getBody() || null,
      ...kiroSection
    };
    const body = JSON.stringify(json, null, 2);
    const paths = this.getSettablePaths({ global });
    const relativeFilePath = rulesyncSubagent.getRelativeFilePath().replace(/\.md$/, ".json");
    return new _KiroSubagent({
      baseDir,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      fileContent: body,
      validate,
      global
    });
  }
  validate() {
    try {
      const parsed = JSON.parse(this.body);
      KiroCliSubagentJsonSchema.parse(parsed);
      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "kiro"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join82(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    return new _KiroSubagent({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      body: fileContent.trim(),
      fileContent,
      validate,
      global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiroSubagent({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/subagents/opencode-subagent.ts
import { basename as basename22, join as join83 } from "path";
import { z as z41 } from "zod/mini";
var OpenCodeSubagentFrontmatterSchema = z41.looseObject({
  description: z41.string(),
  mode: z41._default(z41.string(), "subagent"),
  name: z41.optional(z41.string())
});
var OpenCodeSubagent = class _OpenCodeSubagent extends ToolSubagent {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate !== false) {
      const result = OpenCodeSubagentFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join83(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths({
    global = false
  } = {}) {
    return {
      relativeDirPath: global ? join83(".config", "opencode", "agent") : join83(".opencode", "agent")
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  toRulesyncSubagent() {
    const { description, mode, name, ...opencodeSection } = this.frontmatter;
    const rulesyncFrontmatter = {
      targets: ["*"],
      name: name ?? basename22(this.getRelativeFilePath(), ".md"),
      description,
      opencode: { mode, ...opencodeSection }
    };
    return new RulesyncSubagent({
      baseDir: ".",
      // RulesyncSubagent baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true
    });
  }
  static fromRulesyncSubagent({
    baseDir = process.cwd(),
    rulesyncSubagent,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncSubagent.getFrontmatter();
    const opencodeSection = rulesyncFrontmatter.opencode ?? {};
    const opencodeFrontmatter = {
      ...opencodeSection,
      description: rulesyncFrontmatter.description,
      mode: "subagent",
      ...rulesyncFrontmatter.name && { name: rulesyncFrontmatter.name }
    };
    const body = rulesyncSubagent.getBody();
    const fileContent = stringifyFrontmatter(body, opencodeFrontmatter);
    const paths = this.getSettablePaths({ global });
    return new _OpenCodeSubagent({
      baseDir,
      frontmatter: opencodeFrontmatter,
      body,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath: rulesyncSubagent.getRelativeFilePath(),
      fileContent,
      validate,
      global
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = OpenCodeSubagentFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    }
    return {
      success: false,
      error: new Error(
        `Invalid frontmatter in ${join83(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
      )
    };
  }
  static isTargetedByRulesyncSubagent(rulesyncSubagent) {
    return this.isTargetedByRulesyncSubagentDefault({
      rulesyncSubagent,
      toolTarget: "opencode"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const filePath = join83(baseDir, paths.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = OpenCodeSubagentFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    return new _OpenCodeSubagent({
      baseDir,
      relativeDirPath: paths.relativeDirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      fileContent,
      validate,
      global
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _OpenCodeSubagent({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: { description: "", mode: "subagent" },
      body: "",
      fileContent: "",
      validate: false
    });
  }
};

// src/features/subagents/subagents-processor.ts
var subagentsProcessorToolTargetTuple = [
  "agentsmd",
  "claudecode",
  "claudecode-legacy",
  "codexcli",
  "copilot",
  "cursor",
  "factorydroid",
  "geminicli",
  "kiro",
  "opencode",
  "roo"
];
var SubagentsProcessorToolTargetSchema = z42.enum(subagentsProcessorToolTargetTuple);
var toolSubagentFactories = /* @__PURE__ */ new Map([
  [
    "agentsmd",
    {
      class: AgentsmdSubagent,
      meta: { supportsSimulated: true, supportsGlobal: false, filePattern: "*.md" }
    }
  ],
  [
    "claudecode",
    {
      class: ClaudecodeSubagent,
      meta: { supportsSimulated: false, supportsGlobal: true, filePattern: "*.md" }
    }
  ],
  [
    "claudecode-legacy",
    {
      class: ClaudecodeSubagent,
      meta: { supportsSimulated: false, supportsGlobal: true, filePattern: "*.md" }
    }
  ],
  [
    "codexcli",
    {
      class: CodexCliSubagent,
      meta: { supportsSimulated: true, supportsGlobal: false, filePattern: "*.md" }
    }
  ],
  [
    "copilot",
    {
      class: CopilotSubagent,
      meta: { supportsSimulated: false, supportsGlobal: false, filePattern: "*.md" }
    }
  ],
  [
    "cursor",
    {
      class: CursorSubagent,
      meta: { supportsSimulated: false, supportsGlobal: true, filePattern: "*.md" }
    }
  ],
  [
    "factorydroid",
    {
      class: FactorydroidSubagent,
      meta: { supportsSimulated: true, supportsGlobal: true, filePattern: "*.md" }
    }
  ],
  [
    "geminicli",
    {
      class: GeminiCliSubagent,
      meta: { supportsSimulated: true, supportsGlobal: false, filePattern: "*.md" }
    }
  ],
  [
    "kiro",
    {
      class: KiroSubagent,
      meta: { supportsSimulated: false, supportsGlobal: false, filePattern: "*.json" }
    }
  ],
  [
    "opencode",
    {
      class: OpenCodeSubagent,
      meta: { supportsSimulated: false, supportsGlobal: true, filePattern: "*.md" }
    }
  ],
  [
    "roo",
    {
      class: RooSubagent,
      meta: { supportsSimulated: true, supportsGlobal: false, filePattern: "*.md" }
    }
  ]
]);
var defaultGetFactory5 = (target) => {
  const factory = toolSubagentFactories.get(target);
  if (!factory) {
    throw new Error(`Unsupported tool target: ${target}`);
  }
  return factory;
};
var allToolTargetKeys4 = [...toolSubagentFactories.keys()];
var subagentsProcessorToolTargets = allToolTargetKeys4;
var subagentsProcessorToolTargetsSimulated = allToolTargetKeys4.filter(
  (target) => {
    const factory = toolSubagentFactories.get(target);
    return factory?.meta.supportsSimulated ?? false;
  }
);
var subagentsProcessorToolTargetsGlobal = allToolTargetKeys4.filter(
  (target) => {
    const factory = toolSubagentFactories.get(target);
    return factory?.meta.supportsGlobal ?? false;
  }
);
var SubagentsProcessor = class extends FeatureProcessor {
  toolTarget;
  global;
  getFactory;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    global = false,
    getFactory = defaultGetFactory5,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = SubagentsProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for SubagentsProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.global = global;
    this.getFactory = getFactory;
  }
  async convertRulesyncFilesToToolFiles(rulesyncFiles) {
    const rulesyncSubagents = rulesyncFiles.filter(
      (file) => file instanceof RulesyncSubagent
    );
    const factory = this.getFactory(this.toolTarget);
    const toolSubagents = rulesyncSubagents.map((rulesyncSubagent) => {
      if (!factory.class.isTargetedByRulesyncSubagent(rulesyncSubagent)) {
        return null;
      }
      return factory.class.fromRulesyncSubagent({
        baseDir: this.baseDir,
        relativeDirPath: RulesyncSubagent.getSettablePaths().relativeDirPath,
        rulesyncSubagent,
        global: this.global
      });
    }).filter((subagent) => subagent !== null);
    return toolSubagents;
  }
  async convertToolFilesToRulesyncFiles(toolFiles) {
    const toolSubagents = toolFiles.filter(
      (file) => file instanceof ToolSubagent
    );
    const rulesyncSubagents = [];
    for (const toolSubagent of toolSubagents) {
      if (toolSubagent instanceof SimulatedSubagent) {
        logger.debug(
          `Skipping simulated subagent conversion: ${toolSubagent.getRelativeFilePath()}`
        );
        continue;
      }
      rulesyncSubagents.push(toolSubagent.toRulesyncSubagent());
    }
    return rulesyncSubagents;
  }
  /**
   * Implementation of abstract method from Processor
   * Load and parse rulesync subagent files from .rulesync/subagents/ directory
   */
  async loadRulesyncFiles() {
    const subagentsDir = join84(this.baseDir, RulesyncSubagent.getSettablePaths().relativeDirPath);
    const dirExists = await directoryExists(subagentsDir);
    if (!dirExists) {
      logger.debug(`Rulesync subagents directory not found: ${subagentsDir}`);
      return [];
    }
    const entries = await listDirectoryFiles(subagentsDir);
    const mdFiles = entries.filter((file) => file.endsWith(".md"));
    if (mdFiles.length === 0) {
      logger.debug(`No markdown files found in rulesync subagents directory: ${subagentsDir}`);
      return [];
    }
    logger.debug(`Found ${mdFiles.length} subagent files in ${subagentsDir}`);
    const rulesyncSubagents = [];
    for (const mdFile of mdFiles) {
      const filepath = join84(subagentsDir, mdFile);
      try {
        const rulesyncSubagent = await RulesyncSubagent.fromFile({
          relativeFilePath: mdFile,
          validate: true
        });
        rulesyncSubagents.push(rulesyncSubagent);
        logger.debug(`Successfully loaded subagent: ${mdFile}`);
      } catch (error) {
        logger.warn(`Failed to load subagent file ${filepath}: ${formatError(error)}`);
        continue;
      }
    }
    if (rulesyncSubagents.length === 0) {
      logger.debug(`No valid subagents found in ${subagentsDir}`);
      return [];
    }
    logger.debug(`Successfully loaded ${rulesyncSubagents.length} rulesync subagents`);
    return rulesyncSubagents;
  }
  /**
   * Implementation of abstract method from Processor
   * Load tool-specific subagent configurations and parse them into ToolSubagent instances
   */
  async loadToolFiles({
    forDeletion = false
  } = {}) {
    const factory = this.getFactory(this.toolTarget);
    const paths = factory.class.getSettablePaths({ global: this.global });
    const subagentFilePaths = await findFilesByGlobs(
      join84(this.baseDir, paths.relativeDirPath, factory.meta.filePattern)
    );
    if (forDeletion) {
      const toolSubagents2 = subagentFilePaths.map(
        (path3) => factory.class.forDeletion({
          baseDir: this.baseDir,
          relativeDirPath: paths.relativeDirPath,
          relativeFilePath: basename23(path3),
          global: this.global
        })
      ).filter((subagent) => subagent.isDeletable());
      logger.debug(
        `Successfully loaded ${toolSubagents2.length} ${paths.relativeDirPath} subagents`
      );
      return toolSubagents2;
    }
    const toolSubagents = await Promise.all(
      subagentFilePaths.map(
        (path3) => factory.class.fromFile({
          baseDir: this.baseDir,
          relativeFilePath: basename23(path3),
          global: this.global
        })
      )
    );
    logger.debug(`Successfully loaded ${toolSubagents.length} ${paths.relativeDirPath} subagents`);
    return toolSubagents;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Return the tool targets that this processor supports
   */
  static getToolTargets({
    global = false,
    includeSimulated = false
  } = {}) {
    if (global) {
      return [...subagentsProcessorToolTargetsGlobal];
    }
    if (!includeSimulated) {
      return subagentsProcessorToolTargets.filter(
        (target) => !subagentsProcessorToolTargetsSimulated.includes(target)
      );
    }
    return [...subagentsProcessorToolTargets];
  }
  static getToolTargetsSimulated() {
    return [...subagentsProcessorToolTargetsSimulated];
  }
  /**
   * Get the factory for a specific tool target.
   * This is a static version of the internal getFactory for external use.
   * @param target - The tool target. Must be a valid SubagentsProcessorToolTarget.
   * @returns The factory for the target, or undefined if not found.
   */
  static getFactory(target) {
    const result = SubagentsProcessorToolTargetSchema.safeParse(target);
    if (!result.success) {
      return void 0;
    }
    return toolSubagentFactories.get(result.data);
  }
};

// src/features/rules/agentsmd-rule.ts
import { join as join87 } from "path";

// src/features/rules/tool-rule.ts
import { join as join86 } from "path";

// src/features/rules/rulesync-rule.ts
import { join as join85 } from "path";
import { z as z43 } from "zod/mini";
var RulesyncRuleFrontmatterSchema = z43.object({
  root: z43.optional(z43.boolean()),
  localRoot: z43.optional(z43.boolean()),
  targets: z43._default(RulesyncTargetsSchema, ["*"]),
  description: z43.optional(z43.string()),
  globs: z43.optional(z43.array(z43.string())),
  agentsmd: z43.optional(
    z43.object({
      // @example "path/to/subproject"
      subprojectPath: z43.optional(z43.string())
    })
  ),
  claudecode: z43.optional(
    z43.object({
      // Glob patterns for conditional rules (takes precedence over globs)
      // @example ["src/**/*.ts", "tests/**/*.test.ts"]
      paths: z43.optional(z43.array(z43.string()))
    })
  ),
  cursor: z43.optional(
    z43.object({
      alwaysApply: z43.optional(z43.boolean()),
      description: z43.optional(z43.string()),
      globs: z43.optional(z43.array(z43.string()))
    })
  ),
  copilot: z43.optional(
    z43.object({
      excludeAgent: z43.optional(z43.union([z43.literal("code-review"), z43.literal("coding-agent")]))
    })
  ),
  antigravity: z43.optional(
    z43.looseObject({
      trigger: z43.optional(z43.string()),
      globs: z43.optional(z43.array(z43.string()))
    })
  )
});
var RulesyncRule = class _RulesyncRule extends RulesyncFile {
  frontmatter;
  body;
  constructor({ frontmatter, body, ...rest }) {
    const parseResult = RulesyncRuleFrontmatterSchema.safeParse(frontmatter);
    if (!parseResult.success && rest.validate !== false) {
      throw new Error(
        `Invalid frontmatter in ${join85(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(parseResult.error)}`
      );
    }
    const parsedFrontmatter = parseResult.success ? parseResult.data : { ...frontmatter, targets: frontmatter.targets ?? ["*"] };
    super({
      ...rest,
      fileContent: stringifyFrontmatter(body, parsedFrontmatter)
    });
    this.frontmatter = parsedFrontmatter;
    this.body = body;
  }
  static getSettablePaths() {
    return {
      recommended: {
        relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH
      },
      legacy: {
        relativeDirPath: RULESYNC_RELATIVE_DIR_PATH
      }
    };
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = RulesyncRuleFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join85(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  static async fromFile({
    relativeFilePath,
    validate = true
  }) {
    const filePath = join85(
      process.cwd(),
      this.getSettablePaths().recommended.relativeDirPath,
      relativeFilePath
    );
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = RulesyncRuleFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
    }
    const validatedFrontmatter = {
      root: result.data.root ?? false,
      localRoot: result.data.localRoot ?? false,
      targets: result.data.targets ?? ["*"],
      description: result.data.description,
      globs: result.data.globs ?? [],
      agentsmd: result.data.agentsmd,
      cursor: result.data.cursor
    };
    return new _RulesyncRule({
      baseDir: process.cwd(),
      relativeDirPath: this.getSettablePaths().recommended.relativeDirPath,
      relativeFilePath,
      frontmatter: validatedFrontmatter,
      body: content.trim(),
      validate
    });
  }
  getBody() {
    return this.body;
  }
};

// src/features/rules/tool-rule.ts
var ToolRule = class extends ToolFile {
  root;
  description;
  globs;
  constructor({ root = false, description, globs, ...rest }) {
    super(rest);
    this.root = root;
    this.description = description;
    this.globs = globs;
  }
  static getSettablePaths(_options = {}) {
    throw new Error("Please implement this method in the subclass.");
  }
  static async fromFile(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  /**
   * Create a minimal instance for deletion purposes.
   * This method does not read or parse file content, making it safe to use
   * even when files have old/incompatible formats.
   */
  static forDeletion(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  static fromRulesyncRule(_params) {
    throw new Error("Please implement this method in the subclass.");
  }
  static buildToolRuleParamsDefault({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    rootPath = { relativeDirPath: ".", relativeFilePath: "AGENTS.md" },
    nonRootPath
  }) {
    const fileContent = rulesyncRule.getBody();
    const isRoot = rulesyncRule.getFrontmatter().root ?? false;
    if (isRoot) {
      return {
        baseDir,
        relativeDirPath: rootPath.relativeDirPath,
        relativeFilePath: rootPath.relativeFilePath,
        fileContent,
        validate,
        root: true,
        description: rulesyncRule.getFrontmatter().description,
        globs: rulesyncRule.getFrontmatter().globs
      };
    }
    if (!nonRootPath) {
      throw new Error(`nonRoot path is not set for ${rulesyncRule.getRelativeFilePath()}`);
    }
    return {
      baseDir,
      relativeDirPath: nonRootPath.relativeDirPath,
      relativeFilePath: rulesyncRule.getRelativeFilePath(),
      fileContent,
      validate,
      root: false,
      description: rulesyncRule.getFrontmatter().description,
      globs: rulesyncRule.getFrontmatter().globs
    };
  }
  static buildToolRuleParamsAgentsmd({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    rootPath = { relativeDirPath: ".", relativeFilePath: "AGENTS.md" },
    nonRootPath = { relativeDirPath: join86(".agents", "memories") }
  }) {
    const params = this.buildToolRuleParamsDefault({
      baseDir,
      rulesyncRule,
      validate,
      rootPath,
      nonRootPath
    });
    const rulesyncFrontmatter = rulesyncRule.getFrontmatter();
    if (!rulesyncFrontmatter.root && rulesyncFrontmatter.agentsmd?.subprojectPath) {
      params.relativeDirPath = join86(rulesyncFrontmatter.agentsmd.subprojectPath);
      params.relativeFilePath = "AGENTS.md";
    }
    return params;
  }
  toRulesyncRuleDefault() {
    return new RulesyncRule({
      baseDir: process.cwd(),
      relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH,
      relativeFilePath: this.isRoot() ? RULESYNC_OVERVIEW_FILE_NAME : this.getRelativeFilePath(),
      frontmatter: {
        root: this.isRoot(),
        targets: ["*"],
        description: this.description,
        globs: this.globs ?? (this.isRoot() ? ["**/*"] : [])
      },
      body: this.getFileContent()
    });
  }
  isRoot() {
    return this.root;
  }
  getDescription() {
    return this.description;
  }
  getGlobs() {
    return this.globs;
  }
  static isTargetedByRulesyncRule(_rulesyncRule) {
    throw new Error("Please implement this method in the subclass.");
  }
  static isTargetedByRulesyncRuleDefault({
    rulesyncRule,
    toolTarget
  }) {
    const targets = rulesyncRule.getFrontmatter().targets;
    if (!targets) {
      return true;
    }
    if (targets.includes("*")) {
      return true;
    }
    if (targets.includes(toolTarget)) {
      return true;
    }
    return false;
  }
};
function buildToolPath(toolDir, subDir, excludeToolDir) {
  return excludeToolDir ? subDir : join86(toolDir, subDir);
}

// src/features/rules/agentsmd-rule.ts
var AgentsMdRule = class _AgentsMdRule extends ToolRule {
  constructor({ fileContent, root, ...rest }) {
    super({
      ...rest,
      fileContent,
      root: root ?? false
    });
  }
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "AGENTS.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".agents", "memories", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const isRoot = relativeFilePath === "AGENTS.md";
    const relativePath = isRoot ? "AGENTS.md" : join87(".agents", "memories", relativeFilePath);
    const fileContent = await readFileContent(join87(baseDir, relativePath));
    return new _AgentsMdRule({
      baseDir,
      relativeDirPath: isRoot ? this.getSettablePaths().root.relativeDirPath : this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: isRoot ? "AGENTS.md" : relativeFilePath,
      fileContent,
      validate,
      root: isRoot
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const isRoot = relativeFilePath === "AGENTS.md" && relativeDirPath === ".";
    return new _AgentsMdRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _AgentsMdRule(
      this.buildToolRuleParamsAgentsmd({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: this.getSettablePaths().root,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "agentsmd"
    });
  }
};

// src/features/rules/antigravity-rule.ts
import { join as join88 } from "path";
import { z as z44 } from "zod/mini";
var AntigravityRuleFrontmatterSchema = z44.looseObject({
  trigger: z44.optional(
    z44.union([
      z44.literal("always_on"),
      z44.literal("glob"),
      z44.literal("manual"),
      z44.literal("model_decision"),
      z44.string()
      // accepts any string for forward compatibility
    ])
  ),
  globs: z44.optional(z44.string()),
  description: z44.optional(z44.string())
});
function parseGlobsString(globs) {
  if (!globs) {
    return [];
  }
  if (Array.isArray(globs)) {
    return globs;
  }
  if (globs.trim() === "") {
    return [];
  }
  return globs.split(",").map((g) => g.trim());
}
function stringifyGlobs(globs) {
  if (!globs || globs.length === 0) {
    return void 0;
  }
  return globs.join(",");
}
function normalizeStoredAntigravity(stored) {
  if (!stored) {
    return void 0;
  }
  const { globs, ...rest } = stored;
  return {
    ...rest,
    globs: Array.isArray(globs) ? stringifyGlobs(globs) : globs
  };
}
var globStrategy = {
  canHandle: (trigger) => trigger === "glob",
  generateFrontmatter: (normalized, rulesyncFrontmatter) => {
    const effectiveGlobsArray = normalized?.globs ? parseGlobsString(normalized.globs) : rulesyncFrontmatter.globs ?? [];
    return {
      ...normalized,
      trigger: "glob",
      globs: stringifyGlobs(effectiveGlobsArray)
    };
  },
  exportRulesyncData: ({ description, ...frontmatter }) => ({
    globs: parseGlobsString(frontmatter.globs),
    description: description || "",
    antigravity: frontmatter
  })
};
var manualStrategy = {
  canHandle: (trigger) => trigger === "manual",
  generateFrontmatter: (normalized) => ({
    ...normalized,
    trigger: "manual"
  }),
  exportRulesyncData: ({ description, ...frontmatter }) => ({
    globs: [],
    description: description || "",
    antigravity: frontmatter
  })
};
var alwaysOnStrategy = {
  canHandle: (trigger) => trigger === "always_on",
  generateFrontmatter: (normalized) => ({
    ...normalized,
    trigger: "always_on"
  }),
  exportRulesyncData: ({ description, ...frontmatter }) => ({
    globs: ["**/*"],
    description: description || "",
    antigravity: frontmatter
  })
};
var modelDecisionStrategy = {
  canHandle: (trigger) => trigger === "model_decision",
  generateFrontmatter: (normalized, rulesyncFrontmatter) => ({
    ...normalized,
    trigger: "model_decision",
    description: rulesyncFrontmatter.description
  }),
  exportRulesyncData: ({ description, ...frontmatter }) => ({
    globs: [],
    description: description || "",
    antigravity: frontmatter
  })
};
var unknownStrategy = {
  canHandle: (trigger) => trigger !== void 0,
  generateFrontmatter: (normalized) => {
    const trigger = typeof normalized?.trigger === "string" ? normalized.trigger : "manual";
    return {
      ...normalized,
      trigger
    };
  },
  exportRulesyncData: ({ description, ...frontmatter }) => ({
    globs: frontmatter.globs ? parseGlobsString(frontmatter.globs) : ["**/*"],
    description: description || "",
    antigravity: frontmatter
  })
};
var inferenceStrategy = {
  canHandle: (trigger) => trigger === void 0,
  generateFrontmatter: (normalized, rulesyncFrontmatter) => {
    const effectiveGlobsArray = normalized?.globs ? parseGlobsString(normalized.globs) : rulesyncFrontmatter.globs ?? [];
    if (effectiveGlobsArray.length > 0 && !effectiveGlobsArray.includes("**/*") && !effectiveGlobsArray.includes("*")) {
      return {
        ...normalized,
        trigger: "glob",
        globs: stringifyGlobs(effectiveGlobsArray)
      };
    }
    return {
      ...normalized,
      trigger: "always_on"
    };
  },
  exportRulesyncData: ({ description, ...frontmatter }) => ({
    globs: frontmatter.globs ? parseGlobsString(frontmatter.globs) : ["**/*"],
    description: description || "",
    antigravity: frontmatter
  })
};
var STRATEGIES = [
  globStrategy,
  manualStrategy,
  alwaysOnStrategy,
  modelDecisionStrategy,
  unknownStrategy,
  inferenceStrategy
];
var AntigravityRule = class _AntigravityRule extends ToolRule {
  frontmatter;
  body;
  /**
   * Creates an AntigravityRule instance.
   *
   * @param params - Rule parameters including frontmatter and body
   * @param params.frontmatter - Antigravity-specific frontmatter configuration
   * @param params.body - The markdown body content (without frontmatter)
   *
   * Note: Files without frontmatter will default to always_on trigger during fromFile().
   */
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate !== false) {
      const result = AntigravityRuleFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join88(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      // Ensure fileContent includes frontmatter when constructed directly
      fileContent: stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".agent", "rules", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const filePath = join88(
      baseDir,
      this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath
    );
    const fileContent = await readFileContent(filePath);
    const { frontmatter, body } = parseFrontmatter(fileContent);
    let parsedFrontmatter;
    if (validate) {
      const result = AntigravityRuleFrontmatterSchema.safeParse(frontmatter);
      if (result.success) {
        parsedFrontmatter = result.data;
      } else {
        throw new Error(`Invalid frontmatter in ${filePath}: ${formatError(result.error)}`);
      }
    } else {
      parsedFrontmatter = frontmatter;
    }
    return new _AntigravityRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      body,
      frontmatter: parsedFrontmatter,
      validate,
      root: false
    });
  }
  /**
   * Converts a RulesyncRule to an AntigravityRule.
   *
   * Trigger inference:
   * - If antigravity.trigger is set, it's preserved
   * - If specific globs are set, infers "glob" trigger
   * - Otherwise, infers "always_on" trigger
   */
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncRule.getFrontmatter();
    const storedAntigravity = rulesyncFrontmatter.antigravity;
    const normalized = normalizeStoredAntigravity(storedAntigravity);
    const storedTrigger = storedAntigravity?.trigger;
    const strategy = STRATEGIES.find((s) => s.canHandle(storedTrigger));
    if (!strategy) {
      throw new Error(`No strategy found for trigger: ${storedTrigger}`);
    }
    const frontmatter = strategy.generateFrontmatter(normalized, rulesyncFrontmatter);
    const paths = this.getSettablePaths();
    const kebabCaseFilename = toKebabCaseFilename(rulesyncRule.getRelativeFilePath());
    return new _AntigravityRule({
      baseDir,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath: kebabCaseFilename,
      frontmatter,
      body: rulesyncRule.getBody(),
      validate,
      root: false
    });
  }
  /**
   * Converts this AntigravityRule to a RulesyncRule.
   *
   * The Antigravity configuration is preserved in the RulesyncRule's
   * frontmatter.antigravity field for round-trip compatibility.
   *
   * Note: All Antigravity rules are treated as non-root (root: false),
   * as they are all placed in the .agent/rules directory.
   *
   * @returns RulesyncRule instance with Antigravity config preserved
   */
  toRulesyncRule() {
    const strategy = STRATEGIES.find((s) => s.canHandle(this.frontmatter.trigger));
    let rulesyncData = {
      globs: [],
      description: "",
      antigravity: this.frontmatter
    };
    if (strategy) {
      rulesyncData = strategy.exportRulesyncData(this.frontmatter);
    }
    const antigravityForRulesync = {
      ...rulesyncData.antigravity,
      globs: this.frontmatter.globs ? parseGlobsString(this.frontmatter.globs) : void 0
    };
    return new RulesyncRule({
      baseDir: process.cwd(),
      relativeDirPath: RulesyncRule.getSettablePaths().recommended.relativeDirPath,
      relativeFilePath: this.getRelativeFilePath(),
      frontmatter: {
        root: false,
        targets: ["*"],
        ...rulesyncData,
        antigravity: antigravityForRulesync
      },
      // When converting back, we only want the body content
      body: this.body
    });
  }
  getBody() {
    return this.body;
  }
  // Helper to access raw file content including frontmatter is `this.fileContent` (from ToolFile)
  // But we might want `body` only for some operations?
  // ToolFile.getFileContent() returns the whole string.
  getFrontmatter() {
    return this.frontmatter;
  }
  validate() {
    const result = AntigravityRuleFrontmatterSchema.safeParse(this.frontmatter);
    if (!result.success) {
      return { success: false, error: new Error(formatError(result.error)) };
    }
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _AntigravityRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: {},
      body: "",
      validate: false,
      root: false
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "antigravity"
    });
  }
};

// src/features/rules/augmentcode-legacy-rule.ts
import { join as join89 } from "path";
var AugmentcodeLegacyRule = class _AugmentcodeLegacyRule extends ToolRule {
  toRulesyncRule() {
    const rulesyncFrontmatter = {
      root: this.isRoot(),
      targets: ["*"],
      description: "",
      globs: this.isRoot() ? ["**/*"] : []
    };
    return new RulesyncRule({
      baseDir: ".",
      // RulesyncRule baseDir is always the project root directory
      frontmatter: rulesyncFrontmatter,
      body: this.getFileContent(),
      relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true
    });
  }
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: ".augment-guidelines"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".augment", "rules", _options.excludeToolDir)
      }
    };
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _AugmentcodeLegacyRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: this.getSettablePaths().root,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  validate() {
    return { success: true, error: null };
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "augmentcode-legacy"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const settablePaths = this.getSettablePaths();
    const isRoot = relativeFilePath === settablePaths.root.relativeFilePath;
    const relativePath = isRoot ? settablePaths.root.relativeFilePath : join89(settablePaths.nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join89(baseDir, relativePath));
    return new _AugmentcodeLegacyRule({
      baseDir,
      relativeDirPath: isRoot ? settablePaths.root.relativeDirPath : settablePaths.nonRoot.relativeDirPath,
      relativeFilePath: isRoot ? settablePaths.root.relativeFilePath : relativeFilePath,
      fileContent,
      validate,
      root: isRoot
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const settablePaths = this.getSettablePaths();
    const isRoot = relativeFilePath === settablePaths.root.relativeFilePath;
    return new _AugmentcodeLegacyRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
};

// src/features/rules/augmentcode-rule.ts
import { join as join90 } from "path";
var AugmentcodeRule = class _AugmentcodeRule extends ToolRule {
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".augment", "rules", _options.excludeToolDir)
      }
    };
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _AugmentcodeRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join90(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    const { body: content } = parseFrontmatter(fileContent);
    return new _AugmentcodeRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent: content.trim(),
      validate
    });
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _AugmentcodeRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "augmentcode"
    });
  }
};

// src/features/rules/claudecode-legacy-rule.ts
import { join as join91 } from "path";
var ClaudecodeLegacyRule = class _ClaudecodeLegacyRule extends ToolRule {
  static getSettablePaths({
    global,
    excludeToolDir
  } = {}) {
    if (global) {
      return {
        root: {
          relativeDirPath: buildToolPath(".claude", ".", excludeToolDir),
          relativeFilePath: "CLAUDE.md"
        }
      };
    }
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "CLAUDE.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".claude", "memories", excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    if (isRoot) {
      const relativePath2 = paths.root.relativeFilePath;
      const fileContent2 = await readFileContent(
        join91(baseDir, paths.root.relativeDirPath, relativePath2)
      );
      return new _ClaudecodeLegacyRule({
        baseDir,
        relativeDirPath: paths.root.relativeDirPath,
        relativeFilePath: paths.root.relativeFilePath,
        fileContent: fileContent2,
        validate,
        root: true
      });
    }
    if (!paths.nonRoot) {
      throw new Error(`nonRoot path is not set for ${relativeFilePath}`);
    }
    const relativePath = join91(paths.nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join91(baseDir, relativePath));
    return new _ClaudecodeLegacyRule({
      baseDir,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
      root: false
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _ClaudecodeLegacyRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: paths.root,
        nonRootPath: paths.nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    return new _ClaudecodeLegacyRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "claudecode-legacy"
    });
  }
};

// src/features/rules/claudecode-rule.ts
import { join as join92 } from "path";
import { z as z45 } from "zod/mini";
var ClaudecodeRuleFrontmatterSchema = z45.object({
  paths: z45.optional(z45.array(z45.string()))
});
var ClaudecodeRule = class _ClaudecodeRule extends ToolRule {
  frontmatter;
  body;
  static getSettablePaths({
    global,
    excludeToolDir
  } = {}) {
    if (global) {
      return {
        root: {
          relativeDirPath: buildToolPath(".claude", ".", excludeToolDir),
          relativeFilePath: "CLAUDE.md"
        }
      };
    }
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "CLAUDE.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".claude", "rules", excludeToolDir)
      }
    };
  }
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = ClaudecodeRuleFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join92(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      // Root file: no frontmatter; Non-root file: with optional paths frontmatter
      fileContent: rest.root ? body : _ClaudecodeRule.generateFileContent(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  static generateFileContent(body, frontmatter) {
    if (frontmatter.paths) {
      return stringifyFrontmatter(body, { paths: frontmatter.paths });
    }
    return body;
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    if (isRoot) {
      const fileContent2 = await readFileContent(
        join92(baseDir, paths.root.relativeDirPath, paths.root.relativeFilePath)
      );
      return new _ClaudecodeRule({
        baseDir,
        relativeDirPath: paths.root.relativeDirPath,
        relativeFilePath: paths.root.relativeFilePath,
        frontmatter: {},
        body: fileContent2.trim(),
        validate,
        root: true
      });
    }
    if (!paths.nonRoot) {
      throw new Error(`nonRoot path is not set for ${relativeFilePath}`);
    }
    const relativePath = join92(paths.nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join92(baseDir, relativePath));
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = ClaudecodeRuleFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(
        `Invalid frontmatter in ${join92(baseDir, relativePath)}: ${formatError(result.error)}`
      );
    }
    return new _ClaudecodeRule({
      baseDir,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      validate,
      root: false
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    return new _ClaudecodeRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: {},
      body: "",
      validate: false,
      root: isRoot
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    global = false
  }) {
    const rulesyncFrontmatter = rulesyncRule.getFrontmatter();
    const root = rulesyncFrontmatter.root ?? false;
    const paths = this.getSettablePaths({ global });
    const claudecodePaths = rulesyncFrontmatter.claudecode?.paths;
    const globs = rulesyncFrontmatter.globs;
    const pathsValue = claudecodePaths ?? (globs?.length ? globs : void 0);
    const claudecodeFrontmatter = {
      paths: root ? void 0 : pathsValue
    };
    const body = rulesyncRule.getBody();
    if (root) {
      return new _ClaudecodeRule({
        baseDir,
        frontmatter: claudecodeFrontmatter,
        body,
        relativeDirPath: paths.root.relativeDirPath,
        relativeFilePath: paths.root.relativeFilePath,
        validate,
        root
      });
    }
    if (!paths.nonRoot) {
      throw new Error(`nonRoot path is not set for ${rulesyncRule.getRelativeFilePath()}`);
    }
    return new _ClaudecodeRule({
      baseDir,
      frontmatter: claudecodeFrontmatter,
      body,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath: rulesyncRule.getRelativeFilePath(),
      validate,
      root
    });
  }
  toRulesyncRule() {
    let globs;
    if (this.isRoot()) {
      globs = ["**/*"];
    } else if (this.frontmatter.paths) {
      globs = this.frontmatter.paths;
    }
    const rulesyncFrontmatter = {
      targets: ["*"],
      root: this.isRoot(),
      description: this.description,
      globs,
      ...this.frontmatter.paths && {
        claudecode: { paths: this.frontmatter.paths }
      }
    };
    return new RulesyncRule({
      baseDir: this.getBaseDir(),
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH,
      relativeFilePath: this.getRelativeFilePath(),
      validate: true
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = ClaudecodeRuleFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join92(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "claudecode"
    });
  }
};

// src/features/rules/cline-rule.ts
import { join as join93 } from "path";
import { z as z46 } from "zod/mini";
var ClineRuleFrontmatterSchema = z46.object({
  description: z46.string()
});
var ClineRule = class _ClineRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        // .clinerules is a flat directory, so excludeToolDir has no effect
        relativeDirPath: ".clinerules"
      }
    };
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _ClineRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  validate() {
    return { success: true, error: null };
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "cline"
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join93(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    return new _ClineRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _ClineRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
};

// src/features/rules/codexcli-rule.ts
import { join as join94 } from "path";
var CodexcliRule = class _CodexcliRule extends ToolRule {
  static getSettablePaths({
    global,
    excludeToolDir
  } = {}) {
    if (global) {
      return {
        root: {
          relativeDirPath: buildToolPath(".codex", ".", excludeToolDir),
          relativeFilePath: "AGENTS.md"
        }
      };
    }
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "AGENTS.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".codex", "memories", excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    if (isRoot) {
      const relativePath2 = paths.root.relativeFilePath;
      const fileContent2 = await readFileContent(
        join94(baseDir, paths.root.relativeDirPath, relativePath2)
      );
      return new _CodexcliRule({
        baseDir,
        relativeDirPath: paths.root.relativeDirPath,
        relativeFilePath: paths.root.relativeFilePath,
        fileContent: fileContent2,
        validate,
        root: true
      });
    }
    if (!paths.nonRoot) {
      throw new Error(`nonRoot path is not set for ${relativeFilePath}`);
    }
    const relativePath = join94(paths.nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join94(baseDir, relativePath));
    return new _CodexcliRule({
      baseDir,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
      root: false
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _CodexcliRule(
      this.buildToolRuleParamsAgentsmd({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: paths.root,
        nonRootPath: paths.nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    return new _CodexcliRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "codexcli"
    });
  }
};

// src/features/rules/copilot-rule.ts
import { join as join95 } from "path";
import { z as z47 } from "zod/mini";
var CopilotRuleFrontmatterSchema = z47.object({
  description: z47.optional(z47.string()),
  applyTo: z47.optional(z47.string()),
  excludeAgent: z47.optional(z47.union([z47.literal("code-review"), z47.literal("coding-agent")]))
});
var CopilotRule = class _CopilotRule extends ToolRule {
  frontmatter;
  body;
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: buildToolPath(".github", ".", _options.excludeToolDir),
        relativeFilePath: "copilot-instructions.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".github", "instructions", _options.excludeToolDir)
      }
    };
  }
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = CopilotRuleFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join95(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      // If the rule is a root rule, the file content does not contain frontmatter.
      fileContent: rest.root ? body : stringifyFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  toRulesyncRule() {
    let globs;
    if (this.isRoot()) {
      globs = ["**/*"];
    } else if (this.frontmatter.applyTo) {
      globs = this.frontmatter.applyTo.split(",").map((g) => g.trim());
    }
    const rulesyncFrontmatter = {
      targets: ["*"],
      root: this.isRoot(),
      description: this.frontmatter.description,
      globs,
      ...this.frontmatter.excludeAgent && {
        copilot: { excludeAgent: this.frontmatter.excludeAgent }
      }
    };
    const originalFilePath = this.getRelativeFilePath();
    const relativeFilePath = originalFilePath.replace(/\.instructions\.md$/, ".md");
    return new RulesyncRule({
      baseDir: this.getBaseDir(),
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH,
      relativeFilePath,
      validate: true
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncRule.getFrontmatter();
    const root = rulesyncFrontmatter.root;
    const copilotFrontmatter = {
      description: rulesyncFrontmatter.description,
      applyTo: rulesyncFrontmatter.globs?.length ? rulesyncFrontmatter.globs.join(",") : void 0,
      excludeAgent: rulesyncFrontmatter.copilot?.excludeAgent
    };
    const body = rulesyncRule.getBody();
    if (root) {
      return new _CopilotRule({
        baseDir,
        frontmatter: copilotFrontmatter,
        body,
        relativeDirPath: this.getSettablePaths().root.relativeDirPath,
        relativeFilePath: this.getSettablePaths().root.relativeFilePath,
        validate,
        root
      });
    }
    const originalFileName = rulesyncRule.getRelativeFilePath();
    const nameWithoutExt = originalFileName.replace(/\.md$/, "");
    const newFileName = `${nameWithoutExt}.instructions.md`;
    return new _CopilotRule({
      baseDir,
      frontmatter: copilotFrontmatter,
      body,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: newFileName,
      validate,
      root
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const isRoot = relativeFilePath === "copilot-instructions.md";
    const relativePath = isRoot ? join95(
      this.getSettablePaths().root.relativeDirPath,
      this.getSettablePaths().root.relativeFilePath
    ) : join95(this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join95(baseDir, relativePath));
    if (isRoot) {
      return new _CopilotRule({
        baseDir,
        relativeDirPath: this.getSettablePaths().root.relativeDirPath,
        relativeFilePath: this.getSettablePaths().root.relativeFilePath,
        frontmatter: {},
        body: fileContent.trim(),
        validate,
        root: isRoot
      });
    }
    const { frontmatter, body: content } = parseFrontmatter(fileContent);
    const result = CopilotRuleFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(
        `Invalid frontmatter in ${join95(baseDir, relativeFilePath)}: ${formatError(result.error)}`
      );
    }
    return new _CopilotRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: relativeFilePath.endsWith(".instructions.md") ? relativeFilePath : relativeFilePath.replace(/\.md$/, ".instructions.md"),
      frontmatter: result.data,
      body: content.trim(),
      validate,
      root: isRoot
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const isRoot = relativeFilePath === this.getSettablePaths().root.relativeFilePath;
    return new _CopilotRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: {},
      body: "",
      validate: false,
      root: isRoot
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = CopilotRuleFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join95(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "copilot"
    });
  }
};

// src/features/rules/cursor-rule.ts
import { join as join96 } from "path";
import { z as z48 } from "zod/mini";
var CursorRuleFrontmatterSchema = z48.object({
  description: z48.optional(z48.string()),
  globs: z48.optional(z48.string()),
  alwaysApply: z48.optional(z48.boolean())
});
var CursorRule = class _CursorRule extends ToolRule {
  frontmatter;
  body;
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".cursor", "rules", _options.excludeToolDir)
      }
    };
  }
  constructor({ frontmatter, body, ...rest }) {
    if (rest.validate) {
      const result = CursorRuleFrontmatterSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          `Invalid frontmatter in ${join96(rest.relativeDirPath, rest.relativeFilePath)}: ${formatError(result.error)}`
        );
      }
    }
    super({
      ...rest,
      fileContent: _CursorRule.stringifyCursorFrontmatter(body, frontmatter)
    });
    this.frontmatter = frontmatter;
    this.body = body;
  }
  /**
   * Custom stringify function for Cursor MDC files
   * MDC files don't support quotes in YAML, so globs patterns must be output without quotes
   */
  static stringifyCursorFrontmatter(body, frontmatter) {
    const lines = ["---"];
    if (frontmatter.alwaysApply !== void 0) {
      lines.push(`alwaysApply: ${frontmatter.alwaysApply}`);
    }
    if (frontmatter.description) {
      lines.push(`description: ${frontmatter.description}`);
    }
    if (frontmatter.globs !== void 0) {
      lines.push(`globs: ${frontmatter.globs}`);
    }
    lines.push("---");
    lines.push("");
    if (body) {
      lines.push(body);
    }
    return lines.join("\n");
  }
  /**
   * Custom parse function for Cursor MDC files
   * MDC files don't support quotes in YAML, so we need to handle patterns like *.ts specially
   */
  static parseCursorFrontmatter(fileContent) {
    const preprocessedContent = fileContent.replace(
      /^globs:\s*(\*[^\n]*?)$/m,
      (_match, globPattern) => {
        return `globs: "${globPattern}"`;
      }
    );
    return parseFrontmatter(preprocessedContent);
  }
  toRulesyncRule() {
    const targets = ["*"];
    const isAlways = this.frontmatter.alwaysApply === true;
    const hasGlobs = this.frontmatter.globs && this.frontmatter.globs.trim() !== "";
    let globs;
    if (hasGlobs && this.frontmatter.globs) {
      globs = this.frontmatter.globs.split(",").map((g) => g.trim()).filter((g) => g.length > 0);
    } else if (isAlways) {
      globs = ["**/*"];
    } else {
      globs = [];
    }
    const rulesyncFrontmatter = {
      targets,
      root: false,
      description: this.frontmatter.description,
      globs,
      cursor: {
        alwaysApply: this.frontmatter.alwaysApply,
        description: this.frontmatter.description,
        globs: globs.length > 0 ? globs : void 0
      }
    };
    return new RulesyncRule({
      frontmatter: rulesyncFrontmatter,
      body: this.body,
      relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH,
      relativeFilePath: this.relativeFilePath.replace(/\.mdc$/, ".md"),
      validate: true
    });
  }
  /**
   * Resolve cursor globs with priority: cursor-specific > parent
   * Returns comma-separated string for Cursor format, or undefined if no globs
   * @param cursorSpecificGlobs - Cursor-specific globs (takes priority if defined)
   * @param parentGlobs - Parent globs (used if cursorSpecificGlobs is undefined)
   */
  static resolveCursorGlobs(cursorSpecificGlobs, parentGlobs) {
    const targetGlobs = cursorSpecificGlobs !== void 0 ? cursorSpecificGlobs : parentGlobs;
    return targetGlobs && targetGlobs.length > 0 ? targetGlobs.join(",") : void 0;
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    const rulesyncFrontmatter = rulesyncRule.getFrontmatter();
    const cursorFrontmatter = {
      description: rulesyncFrontmatter.description,
      globs: this.resolveCursorGlobs(rulesyncFrontmatter.cursor?.globs, rulesyncFrontmatter.globs),
      alwaysApply: rulesyncFrontmatter.cursor?.alwaysApply ?? void 0
    };
    const body = rulesyncRule.getBody();
    const originalFileName = rulesyncRule.getRelativeFilePath();
    const nameWithoutExt = originalFileName.replace(/\.md$/, "");
    const newFileName = `${nameWithoutExt}.mdc`;
    return new _CursorRule({
      baseDir,
      frontmatter: cursorFrontmatter,
      body,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: newFileName,
      validate
    });
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join96(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    const { frontmatter, body: content } = _CursorRule.parseCursorFrontmatter(fileContent);
    const result = CursorRuleFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      throw new Error(
        `Invalid frontmatter in ${join96(baseDir, relativeFilePath)}: ${formatError(result.error)}`
      );
    }
    return new _CursorRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      frontmatter: result.data,
      body: content.trim(),
      validate
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _CursorRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      frontmatter: {},
      body: "",
      validate: false
    });
  }
  validate() {
    if (!this.frontmatter) {
      return { success: true, error: null };
    }
    const result = CursorRuleFrontmatterSchema.safeParse(this.frontmatter);
    if (result.success) {
      return { success: true, error: null };
    } else {
      return {
        success: false,
        error: new Error(
          `Invalid frontmatter in ${join96(this.relativeDirPath, this.relativeFilePath)}: ${formatError(result.error)}`
        )
      };
    }
  }
  getFrontmatter() {
    return this.frontmatter;
  }
  getBody() {
    return this.body;
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "cursor"
    });
  }
};

// src/features/rules/factorydroid-rule.ts
import { join as join97 } from "path";
var FactorydroidRule = class _FactorydroidRule extends ToolRule {
  constructor({ fileContent, root, ...rest }) {
    super({
      ...rest,
      fileContent,
      root: root ?? false
    });
  }
  static getSettablePaths({
    global,
    excludeToolDir
  } = {}) {
    if (global) {
      return {
        root: {
          relativeDirPath: buildToolPath(".factory", ".", excludeToolDir),
          relativeFilePath: "AGENTS.md"
        }
      };
    }
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "AGENTS.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".factory", "rules", excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    if (isRoot) {
      const relativePath2 = join97(paths.root.relativeDirPath, paths.root.relativeFilePath);
      const fileContent2 = await readFileContent(join97(baseDir, relativePath2));
      return new _FactorydroidRule({
        baseDir,
        relativeDirPath: paths.root.relativeDirPath,
        relativeFilePath: paths.root.relativeFilePath,
        fileContent: fileContent2,
        validate,
        root: true
      });
    }
    if (!paths.nonRoot) {
      throw new Error(`nonRoot path is not set for ${relativeFilePath}`);
    }
    const relativePath = join97(paths.nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join97(baseDir, relativePath));
    return new _FactorydroidRule({
      baseDir,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
      root: false
    });
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath && relativeDirPath === paths.root.relativeDirPath;
    return new _FactorydroidRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _FactorydroidRule(
      this.buildToolRuleParamsAgentsmd({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: paths.root,
        nonRootPath: paths.nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "factorydroid"
    });
  }
};

// src/features/rules/geminicli-rule.ts
import { join as join98 } from "path";
var GeminiCliRule = class _GeminiCliRule extends ToolRule {
  static getSettablePaths({
    global,
    excludeToolDir
  } = {}) {
    if (global) {
      return {
        root: {
          relativeDirPath: buildToolPath(".gemini", ".", excludeToolDir),
          relativeFilePath: "GEMINI.md"
        }
      };
    }
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "GEMINI.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".gemini", "memories", excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    if (isRoot) {
      const relativePath2 = paths.root.relativeFilePath;
      const fileContent2 = await readFileContent(
        join98(baseDir, paths.root.relativeDirPath, relativePath2)
      );
      return new _GeminiCliRule({
        baseDir,
        relativeDirPath: paths.root.relativeDirPath,
        relativeFilePath: paths.root.relativeFilePath,
        fileContent: fileContent2,
        validate,
        root: true
      });
    }
    if (!paths.nonRoot) {
      throw new Error(`nonRoot path is not set for ${relativeFilePath}`);
    }
    const relativePath = join98(paths.nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join98(baseDir, relativePath));
    return new _GeminiCliRule({
      baseDir,
      relativeDirPath: paths.nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
      root: false
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    return new _GeminiCliRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: paths.root,
        nonRootPath: paths.nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath,
    global = false
  }) {
    const paths = this.getSettablePaths({ global });
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    return new _GeminiCliRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "geminicli"
    });
  }
};

// src/features/rules/junie-rule.ts
import { join as join99 } from "path";
var JunieRule = class _JunieRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: buildToolPath(".junie", ".", _options.excludeToolDir),
        relativeFilePath: "guidelines.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".junie", "memories", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const isRoot = relativeFilePath === "guidelines.md";
    const relativePath = isRoot ? "guidelines.md" : join99(".junie", "memories", relativeFilePath);
    const fileContent = await readFileContent(join99(baseDir, relativePath));
    return new _JunieRule({
      baseDir,
      relativeDirPath: isRoot ? this.getSettablePaths().root.relativeDirPath : this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: isRoot ? "guidelines.md" : relativeFilePath,
      fileContent,
      validate,
      root: isRoot
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _JunieRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: this.getSettablePaths().root,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const isRoot = relativeFilePath === "guidelines.md";
    return new _JunieRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "junie"
    });
  }
};

// src/features/rules/kilo-rule.ts
import { join as join100 } from "path";
var KiloRule = class _KiloRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".kilocode", "rules", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join100(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    return new _KiloRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _KiloRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiloRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "kilo"
    });
  }
};

// src/features/rules/kiro-rule.ts
import { join as join101 } from "path";
var KiroRule = class _KiroRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".kiro", "steering", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join101(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    return new _KiroRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
      root: false
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _KiroRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _KiroRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: false
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "kiro"
    });
  }
};

// src/features/rules/opencode-rule.ts
import { join as join102 } from "path";
var OpenCodeRule = class _OpenCodeRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "AGENTS.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".opencode", "memories", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const isRoot = relativeFilePath === "AGENTS.md";
    const relativePath = isRoot ? "AGENTS.md" : join102(".opencode", "memories", relativeFilePath);
    const fileContent = await readFileContent(join102(baseDir, relativePath));
    return new _OpenCodeRule({
      baseDir,
      relativeDirPath: isRoot ? this.getSettablePaths().root.relativeDirPath : this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: isRoot ? "AGENTS.md" : relativeFilePath,
      validate,
      root: isRoot,
      fileContent
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _OpenCodeRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: this.getSettablePaths().root,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const isRoot = relativeFilePath === "AGENTS.md" && relativeDirPath === ".";
    return new _OpenCodeRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "opencode"
    });
  }
};

// src/features/rules/qwencode-rule.ts
import { join as join103 } from "path";
var QwencodeRule = class _QwencodeRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "QWEN.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".qwen", "memories", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const isRoot = relativeFilePath === "QWEN.md";
    const relativePath = isRoot ? "QWEN.md" : join103(".qwen", "memories", relativeFilePath);
    const fileContent = await readFileContent(join103(baseDir, relativePath));
    return new _QwencodeRule({
      baseDir,
      relativeDirPath: isRoot ? this.getSettablePaths().root.relativeDirPath : this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath: isRoot ? "QWEN.md" : relativeFilePath,
      fileContent,
      validate,
      root: isRoot
    });
  }
  static fromRulesyncRule(params) {
    const { baseDir = process.cwd(), rulesyncRule, validate = true } = params;
    return new _QwencodeRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: this.getSettablePaths().root,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const isRoot = relativeFilePath === "QWEN.md" && relativeDirPath === ".";
    return new _QwencodeRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "qwencode"
    });
  }
};

// src/features/rules/replit-rule.ts
import { join as join104 } from "path";
var ReplitRule = class _ReplitRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "replit.md"
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    if (!isRoot) {
      throw new Error(`ReplitRule only supports root rules: ${relativeFilePath}`);
    }
    const relativePath = paths.root.relativeFilePath;
    const fileContent = await readFileContent(
      join104(baseDir, paths.root.relativeDirPath, relativePath)
    );
    return new _ReplitRule({
      baseDir,
      relativeDirPath: paths.root.relativeDirPath,
      relativeFilePath: paths.root.relativeFilePath,
      fileContent,
      validate,
      root: true
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    const paths = this.getSettablePaths();
    const isRoot = rulesyncRule.getFrontmatter().root ?? false;
    if (!isRoot) {
      throw new Error(`ReplitRule only supports root rules: ${rulesyncRule.getRelativeFilePath()}`);
    }
    return new _ReplitRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: paths.root,
        nonRootPath: void 0
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const paths = this.getSettablePaths();
    const isRoot = relativeFilePath === paths.root.relativeFilePath;
    return new _ReplitRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    const isRoot = rulesyncRule.getFrontmatter().root ?? false;
    if (!isRoot) {
      return false;
    }
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "replit"
    });
  }
};

// src/features/rules/roo-rule.ts
import { join as join105 } from "path";
var RooRule = class _RooRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".roo", "rules", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join105(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    return new _RooRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate,
      root: false
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _RooRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  /**
   * Extract mode slug from file path for mode-specific rules
   * Returns undefined for non-mode-specific rules
   */
  static extractModeFromPath(filePath) {
    const directoryMatch = filePath.match(/\.roo\/rules-([a-zA-Z0-9-]+)\//);
    if (directoryMatch) {
      return directoryMatch[1];
    }
    const singleFileMatch = filePath.match(/\.(roo|cline)rules-([a-zA-Z0-9-]+)$/);
    if (singleFileMatch) {
      return singleFileMatch[2];
    }
    return void 0;
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _RooRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: false
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "roo"
    });
  }
};

// src/features/rules/warp-rule.ts
import { join as join106 } from "path";
var WarpRule = class _WarpRule extends ToolRule {
  constructor({ fileContent, root, ...rest }) {
    super({
      ...rest,
      fileContent,
      root: root ?? false
    });
  }
  static getSettablePaths(_options = {}) {
    return {
      root: {
        relativeDirPath: ".",
        relativeFilePath: "WARP.md"
      },
      nonRoot: {
        relativeDirPath: buildToolPath(".warp", "memories", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const isRoot = relativeFilePath === this.getSettablePaths().root.relativeFilePath;
    const relativePath = isRoot ? this.getSettablePaths().root.relativeFilePath : join106(this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath);
    const fileContent = await readFileContent(join106(baseDir, relativePath));
    return new _WarpRule({
      baseDir,
      relativeDirPath: isRoot ? this.getSettablePaths().root.relativeDirPath : ".warp",
      relativeFilePath: isRoot ? this.getSettablePaths().root.relativeFilePath : relativeFilePath,
      fileContent,
      validate,
      root: isRoot
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _WarpRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        rootPath: this.getSettablePaths().root,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    const isRoot = relativeFilePath === this.getSettablePaths().root.relativeFilePath;
    return new _WarpRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false,
      root: isRoot
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "warp"
    });
  }
};

// src/features/rules/windsurf-rule.ts
import { join as join107 } from "path";
var WindsurfRule = class _WindsurfRule extends ToolRule {
  static getSettablePaths(_options = {}) {
    return {
      nonRoot: {
        relativeDirPath: buildToolPath(".windsurf", "rules", _options.excludeToolDir)
      }
    };
  }
  static async fromFile({
    baseDir = process.cwd(),
    relativeFilePath,
    validate = true
  }) {
    const fileContent = await readFileContent(
      join107(baseDir, this.getSettablePaths().nonRoot.relativeDirPath, relativeFilePath)
    );
    return new _WindsurfRule({
      baseDir,
      relativeDirPath: this.getSettablePaths().nonRoot.relativeDirPath,
      relativeFilePath,
      fileContent,
      validate
    });
  }
  static fromRulesyncRule({
    baseDir = process.cwd(),
    rulesyncRule,
    validate = true
  }) {
    return new _WindsurfRule(
      this.buildToolRuleParamsDefault({
        baseDir,
        rulesyncRule,
        validate,
        nonRootPath: this.getSettablePaths().nonRoot
      })
    );
  }
  toRulesyncRule() {
    return this.toRulesyncRuleDefault();
  }
  validate() {
    return { success: true, error: null };
  }
  static forDeletion({
    baseDir = process.cwd(),
    relativeDirPath,
    relativeFilePath
  }) {
    return new _WindsurfRule({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: "",
      validate: false
    });
  }
  static isTargetedByRulesyncRule(rulesyncRule) {
    return this.isTargetedByRulesyncRuleDefault({
      rulesyncRule,
      toolTarget: "windsurf"
    });
  }
};

// src/features/rules/rules-processor.ts
var rulesProcessorToolTargets = [
  "agentsmd",
  "antigravity",
  "augmentcode",
  "augmentcode-legacy",
  "claudecode",
  "claudecode-legacy",
  "cline",
  "codexcli",
  "copilot",
  "cursor",
  "factorydroid",
  "geminicli",
  "junie",
  "kilo",
  "kiro",
  "opencode",
  "qwencode",
  "replit",
  "roo",
  "warp",
  "windsurf"
];
var RulesProcessorToolTargetSchema = z49.enum(rulesProcessorToolTargets);
var formatRulePaths = (rules) => rules.map((r) => join108(r.getRelativeDirPath(), r.getRelativeFilePath())).join(", ");
var toolRuleFactories = /* @__PURE__ */ new Map([
  [
    "agentsmd",
    {
      class: AgentsMdRule,
      meta: {
        extension: "md",
        supportsGlobal: false,
        ruleDiscoveryMode: "toon",
        additionalConventions: {
          commands: { commandClass: AgentsmdCommand },
          subagents: { subagentClass: AgentsmdSubagent },
          skills: { skillClass: AgentsmdSkill }
        }
      }
    }
  ],
  [
    "antigravity",
    {
      class: AntigravityRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "auto" }
    }
  ],
  [
    "augmentcode",
    {
      class: AugmentcodeRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "auto" }
    }
  ],
  [
    "augmentcode-legacy",
    {
      class: AugmentcodeLegacyRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "toon" }
    }
  ],
  [
    "claudecode",
    {
      class: ClaudecodeRule,
      meta: { extension: "md", supportsGlobal: true, ruleDiscoveryMode: "auto" }
    }
  ],
  [
    "claudecode-legacy",
    {
      class: ClaudecodeLegacyRule,
      meta: { extension: "md", supportsGlobal: true, ruleDiscoveryMode: "claudecode-legacy" }
    }
  ],
  [
    "cline",
    {
      class: ClineRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "auto" }
    }
  ],
  [
    "codexcli",
    {
      class: CodexcliRule,
      meta: {
        extension: "md",
        supportsGlobal: true,
        ruleDiscoveryMode: "toon",
        additionalConventions: {
          subagents: { subagentClass: CodexCliSubagent }
        }
      }
    }
  ],
  [
    "copilot",
    {
      class: CopilotRule,
      meta: {
        extension: "md",
        supportsGlobal: false,
        ruleDiscoveryMode: "auto"
      }
    }
  ],
  [
    "cursor",
    {
      class: CursorRule,
      meta: {
        extension: "mdc",
        supportsGlobal: false,
        ruleDiscoveryMode: "auto"
      }
    }
  ],
  [
    "factorydroid",
    {
      class: FactorydroidRule,
      meta: {
        extension: "md",
        supportsGlobal: true,
        ruleDiscoveryMode: "toon",
        additionalConventions: {
          commands: { commandClass: FactorydroidCommand },
          subagents: { subagentClass: FactorydroidSubagent },
          skills: { skillClass: FactorydroidSkill }
        }
      }
    }
  ],
  [
    "geminicli",
    {
      class: GeminiCliRule,
      meta: {
        extension: "md",
        supportsGlobal: true,
        ruleDiscoveryMode: "toon",
        additionalConventions: {
          subagents: { subagentClass: GeminiCliSubagent }
        }
      }
    }
  ],
  [
    "junie",
    {
      class: JunieRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "toon" }
    }
  ],
  [
    "kilo",
    {
      class: KiloRule,
      meta: { extension: "md", supportsGlobal: true, ruleDiscoveryMode: "auto" }
    }
  ],
  [
    "kiro",
    {
      class: KiroRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "toon" }
    }
  ],
  [
    "opencode",
    {
      class: OpenCodeRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "toon" }
    }
  ],
  [
    "qwencode",
    {
      class: QwencodeRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "toon" }
    }
  ],
  [
    "replit",
    {
      class: ReplitRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "auto" }
    }
  ],
  [
    "roo",
    {
      class: RooRule,
      meta: {
        extension: "md",
        supportsGlobal: false,
        ruleDiscoveryMode: "auto",
        additionalConventions: {
          subagents: { subagentClass: RooSubagent }
        },
        createsSeparateConventionsRule: true
      }
    }
  ],
  [
    "warp",
    {
      class: WarpRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "toon" }
    }
  ],
  [
    "windsurf",
    {
      class: WindsurfRule,
      meta: { extension: "md", supportsGlobal: false, ruleDiscoveryMode: "auto" }
    }
  ]
]);
var rulesProcessorToolTargetsGlobal = Array.from(toolRuleFactories.entries()).filter(([_, factory]) => factory.meta.supportsGlobal).map(([target]) => target);
var defaultGetFactory6 = (target) => {
  const factory = toolRuleFactories.get(target);
  if (!factory) {
    throw new Error(`Unsupported tool target: ${target}`);
  }
  return factory;
};
var RulesProcessor = class extends FeatureProcessor {
  toolTarget;
  simulateCommands;
  simulateSubagents;
  simulateSkills;
  global;
  getFactory;
  skills;
  constructor({
    baseDir = process.cwd(),
    toolTarget,
    simulateCommands = false,
    simulateSubagents = false,
    simulateSkills = false,
    global = false,
    getFactory = defaultGetFactory6,
    skills,
    dryRun = false
  }) {
    super({ baseDir, dryRun });
    const result = RulesProcessorToolTargetSchema.safeParse(toolTarget);
    if (!result.success) {
      throw new Error(
        `Invalid tool target for RulesProcessor: ${toolTarget}. ${formatError(result.error)}`
      );
    }
    this.toolTarget = result.data;
    this.global = global;
    this.simulateCommands = simulateCommands;
    this.simulateSubagents = simulateSubagents;
    this.simulateSkills = simulateSkills;
    this.getFactory = getFactory;
    this.skills = skills;
  }
  async convertRulesyncFilesToToolFiles(rulesyncFiles) {
    const rulesyncRules = rulesyncFiles.filter(
      (file) => file instanceof RulesyncRule
    );
    const localRootRules = rulesyncRules.filter((rule) => rule.getFrontmatter().localRoot);
    const nonLocalRootRules = rulesyncRules.filter((rule) => !rule.getFrontmatter().localRoot);
    const factory = this.getFactory(this.toolTarget);
    const { meta } = factory;
    const toolRules = nonLocalRootRules.map((rulesyncRule) => {
      if (!factory.class.isTargetedByRulesyncRule(rulesyncRule)) {
        return null;
      }
      return factory.class.fromRulesyncRule({
        baseDir: this.baseDir,
        rulesyncRule,
        validate: true,
        global: this.global
      });
    }).filter((rule) => rule !== null);
    if (localRootRules.length > 0 && !this.global) {
      const localRootRule = localRootRules[0];
      if (localRootRule && factory.class.isTargetedByRulesyncRule(localRootRule)) {
        this.handleLocalRootRule(toolRules, localRootRule, factory);
      }
    }
    const isSimulated = this.simulateCommands || this.simulateSubagents || this.simulateSkills;
    if (isSimulated && meta.createsSeparateConventionsRule && meta.additionalConventions) {
      const conventionsContent = this.generateAdditionalConventionsSectionFromMeta(meta);
      const settablePaths = factory.class.getSettablePaths();
      const nonRootPath = "nonRoot" in settablePaths ? settablePaths.nonRoot : null;
      if (nonRootPath) {
        toolRules.push(
          factory.class.fromRulesyncRule({
            baseDir: this.baseDir,
            rulesyncRule: new RulesyncRule({
              baseDir: this.baseDir,
              relativeDirPath: nonRootPath.relativeDirPath,
              relativeFilePath: "additional-conventions.md",
              frontmatter: {
                root: false,
                targets: [this.toolTarget]
              },
              body: conventionsContent
            }),
            validate: true,
            global: this.global
          })
        );
      }
    }
    const rootRuleIndex = toolRules.findIndex((rule) => rule.isRoot());
    if (rootRuleIndex === -1) {
      return toolRules;
    }
    const rootRule = toolRules[rootRuleIndex];
    if (!rootRule) {
      return toolRules;
    }
    const referenceSection = this.generateReferenceSectionFromMeta(meta, toolRules);
    const conventionsSection = !meta.createsSeparateConventionsRule && meta.additionalConventions ? this.generateAdditionalConventionsSectionFromMeta(meta) : "";
    const newContent = referenceSection + conventionsSection + rootRule.getFileContent();
    rootRule.setFileContent(newContent);
    return toolRules;
  }
  buildSkillList(skillClass) {
    if (!this.skills) return [];
    const toolRelativeDirPath = skillClass.getSettablePaths({
      global: this.global
    }).relativeDirPath;
    return this.skills.filter((skill) => skillClass.isTargetedByRulesyncSkill(skill)).map((skill) => {
      const frontmatter = skill.getFrontmatter();
      const relativePath = join108(toolRelativeDirPath, skill.getDirName(), SKILL_FILE_NAME);
      return {
        name: frontmatter.name,
        description: frontmatter.description,
        path: relativePath
      };
    });
  }
  /**
   * Handle localRoot rule generation based on tool target.
   * - Claude Code: generates `./CLAUDE.local.md`
   * - Claude Code Legacy: generates `./CLAUDE.local.md`
   * - Other tools: appends content to the root file with one blank line separator
   */
  handleLocalRootRule(toolRules, localRootRule, _factory) {
    const localRootBody = localRootRule.getBody();
    if (this.toolTarget === "claudecode") {
      const paths = ClaudecodeRule.getSettablePaths({ global: this.global });
      toolRules.push(
        new ClaudecodeRule({
          baseDir: this.baseDir,
          relativeDirPath: paths.root.relativeDirPath,
          relativeFilePath: "CLAUDE.local.md",
          frontmatter: {},
          body: localRootBody,
          validate: true,
          root: true
          // Treat as root so it doesn't have frontmatter
        })
      );
    } else if (this.toolTarget === "claudecode-legacy") {
      const paths = ClaudecodeLegacyRule.getSettablePaths({ global: this.global });
      toolRules.push(
        new ClaudecodeLegacyRule({
          baseDir: this.baseDir,
          relativeDirPath: paths.root.relativeDirPath,
          relativeFilePath: "CLAUDE.local.md",
          fileContent: localRootBody,
          validate: true,
          root: true
          // Treat as root so it doesn't have frontmatter
        })
      );
    } else {
      const rootRule = toolRules.find((rule) => rule.isRoot());
      if (rootRule) {
        const currentContent = rootRule.getFileContent();
        const newContent = currentContent + "\n\n" + localRootBody;
        rootRule.setFileContent(newContent);
      }
    }
  }
  /**
   * Generate reference section based on meta configuration.
   */
  generateReferenceSectionFromMeta(meta, toolRules) {
    switch (meta.ruleDiscoveryMode) {
      case "toon":
        return this.generateToonReferencesSection(toolRules);
      case "claudecode-legacy":
        return this.generateReferencesSection(toolRules);
      case "auto":
      default:
        return "";
    }
  }
  /**
   * Generate additional conventions section based on meta configuration.
   */
  generateAdditionalConventionsSectionFromMeta(meta) {
    const { additionalConventions } = meta;
    if (!additionalConventions) {
      return "";
    }
    const conventions = {};
    if (additionalConventions.commands) {
      const { commandClass } = additionalConventions.commands;
      const relativeDirPath = commandClass.getSettablePaths({
        global: this.global
      }).relativeDirPath;
      conventions.commands = { relativeDirPath };
    }
    if (additionalConventions.subagents) {
      const { subagentClass } = additionalConventions.subagents;
      const relativeDirPath = subagentClass.getSettablePaths({
        global: this.global
      }).relativeDirPath;
      conventions.subagents = { relativeDirPath };
    }
    if (additionalConventions.skills) {
      const { skillClass, globalOnly } = additionalConventions.skills;
      if (!globalOnly || this.global) {
        conventions.skills = {
          skillList: this.buildSkillList(skillClass)
        };
      }
    }
    return this.generateAdditionalConventionsSection(conventions);
  }
  async convertToolFilesToRulesyncFiles(toolFiles) {
    const toolRules = toolFiles.filter((file) => file instanceof ToolRule);
    const rulesyncRules = toolRules.map((toolRule) => {
      return toolRule.toRulesyncRule();
    });
    return rulesyncRules;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load and parse rulesync rule files from .rulesync/rules/ directory
   */
  async loadRulesyncFiles() {
    const rulesyncBaseDir = join108(this.baseDir, RULESYNC_RULES_RELATIVE_DIR_PATH);
    const files = await findFilesByGlobs(join108(rulesyncBaseDir, "**", "*.md"));
    logger.debug(`Found ${files.length} rulesync files`);
    const rulesyncRules = await Promise.all(
      files.map((file) => {
        const relativeFilePath = relative4(rulesyncBaseDir, file);
        checkPathTraversal({ relativePath: relativeFilePath, intendedRootDir: rulesyncBaseDir });
        return RulesyncRule.fromFile({
          relativeFilePath
        });
      })
    );
    const rootRules = rulesyncRules.filter((rule) => rule.getFrontmatter().root);
    if (rootRules.length > 1) {
      throw new Error(`Multiple root rulesync rules found: ${formatRulePaths(rootRules)}`);
    }
    if (rootRules.length === 0 && rulesyncRules.length > 0) {
      logger.warn(
        `No root rulesync rule file found. Consider adding 'root: true' to one of your rule files in ${RULESYNC_RULES_RELATIVE_DIR_PATH}.`
      );
    }
    const localRootRules = rulesyncRules.filter((rule) => rule.getFrontmatter().localRoot);
    if (localRootRules.length > 1) {
      throw new Error(
        `Multiple localRoot rules found: ${formatRulePaths(localRootRules)}. Only one rule can have localRoot: true`
      );
    }
    if (localRootRules.length > 0 && rootRules.length === 0) {
      throw new Error(
        `localRoot: true requires a root: true rule to exist (found in ${formatRulePaths(localRootRules)})`
      );
    }
    if (this.global) {
      const nonRootRules = rulesyncRules.filter((rule) => !rule.getFrontmatter().root);
      if (nonRootRules.length > 0) {
        logger.warn(
          `${nonRootRules.length} non-root rulesync rules found, but it's in global mode, so ignoring them: ${formatRulePaths(nonRootRules)}`
        );
      }
      if (localRootRules.length > 0) {
        logger.warn(
          `${localRootRules.length} localRoot rules found, but localRoot is not supported in global mode, ignoring them: ${formatRulePaths(localRootRules)}`
        );
      }
      return rootRules;
    }
    return rulesyncRules;
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Load tool-specific rule configurations and parse them into ToolRule instances
   */
  async loadToolFiles({
    forDeletion = false
  } = {}) {
    try {
      const factory = this.getFactory(this.toolTarget);
      const settablePaths = factory.class.getSettablePaths({ global: this.global });
      const rootToolRules = await (async () => {
        if (!settablePaths.root) {
          return [];
        }
        const rootFilePaths = await findFilesByGlobs(
          join108(
            this.baseDir,
            settablePaths.root.relativeDirPath ?? ".",
            settablePaths.root.relativeFilePath
          )
        );
        if (forDeletion) {
          return rootFilePaths.map(
            (filePath) => factory.class.forDeletion({
              baseDir: this.baseDir,
              relativeDirPath: settablePaths.root?.relativeDirPath ?? ".",
              relativeFilePath: basename24(filePath),
              global: this.global
            })
          ).filter((rule) => rule.isDeletable());
        }
        return await Promise.all(
          rootFilePaths.map(
            (filePath) => factory.class.fromFile({
              baseDir: this.baseDir,
              relativeFilePath: basename24(filePath),
              global: this.global
            })
          )
        );
      })();
      logger.debug(`Found ${rootToolRules.length} root tool rule files`);
      const localRootToolRules = await (async () => {
        if (!forDeletion) {
          return [];
        }
        if (this.toolTarget !== "claudecode" && this.toolTarget !== "claudecode-legacy") {
          return [];
        }
        if (!settablePaths.root) {
          return [];
        }
        const localRootFilePaths = await findFilesByGlobs(
          join108(this.baseDir, settablePaths.root.relativeDirPath ?? ".", "CLAUDE.local.md")
        );
        return localRootFilePaths.map(
          (filePath) => factory.class.forDeletion({
            baseDir: this.baseDir,
            relativeDirPath: settablePaths.root?.relativeDirPath ?? ".",
            relativeFilePath: basename24(filePath),
            global: this.global
          })
        ).filter((rule) => rule.isDeletable());
      })();
      logger.debug(`Found ${localRootToolRules.length} local root tool rule files for deletion`);
      const nonRootToolRules = await (async () => {
        if (!settablePaths.nonRoot) {
          return [];
        }
        const nonRootBaseDir = join108(this.baseDir, settablePaths.nonRoot.relativeDirPath);
        const nonRootFilePaths = await findFilesByGlobs(
          join108(nonRootBaseDir, "**", `*.${factory.meta.extension}`)
        );
        if (forDeletion) {
          return nonRootFilePaths.map((filePath) => {
            const relativeFilePath = relative4(nonRootBaseDir, filePath);
            checkPathTraversal({
              relativePath: relativeFilePath,
              intendedRootDir: nonRootBaseDir
            });
            return factory.class.forDeletion({
              baseDir: this.baseDir,
              relativeDirPath: settablePaths.nonRoot?.relativeDirPath ?? ".",
              relativeFilePath,
              global: this.global
            });
          }).filter((rule) => rule.isDeletable());
        }
        return await Promise.all(
          nonRootFilePaths.map((filePath) => {
            const relativeFilePath = relative4(nonRootBaseDir, filePath);
            checkPathTraversal({ relativePath: relativeFilePath, intendedRootDir: nonRootBaseDir });
            return factory.class.fromFile({
              baseDir: this.baseDir,
              relativeFilePath,
              global: this.global
            });
          })
        );
      })();
      logger.debug(`Found ${nonRootToolRules.length} non-root tool rule files`);
      return [...rootToolRules, ...localRootToolRules, ...nonRootToolRules];
    } catch (error) {
      logger.error(`Failed to load tool files for ${this.toolTarget}: ${formatError(error)}`);
      return [];
    }
  }
  /**
   * Implementation of abstract method from FeatureProcessor
   * Return the tool targets that this processor supports
   */
  static getToolTargets({ global = false } = {}) {
    if (global) {
      return rulesProcessorToolTargetsGlobal;
    }
    return rulesProcessorToolTargets;
  }
  /**
   * Get the factory for a specific tool target.
   * This is a static version of the internal getFactory for external use.
   * @param target - The tool target. Must be a valid RulesProcessorToolTarget.
   * @returns The factory for the target, or undefined if not found.
   */
  static getFactory(target) {
    const result = RulesProcessorToolTargetSchema.safeParse(target);
    if (!result.success) {
      return void 0;
    }
    return toolRuleFactories.get(result.data);
  }
  generateToonReferencesSection(toolRules) {
    const toolRulesWithoutRoot = toolRules.filter((rule) => !rule.isRoot());
    if (toolRulesWithoutRoot.length === 0) {
      return "";
    }
    const lines = [];
    lines.push(
      "Please also reference the following rules as needed. The list below is provided in TOON format, and `@` stands for the project root directory."
    );
    lines.push("");
    const rules = toolRulesWithoutRoot.map((toolRule) => {
      const rulesyncRule = toolRule.toRulesyncRule();
      const frontmatter = rulesyncRule.getFrontmatter();
      const rule = {
        path: `@${toolRule.getRelativePathFromCwd()}`
      };
      if (frontmatter.description) {
        rule.description = frontmatter.description;
      }
      if (frontmatter.globs && frontmatter.globs.length > 0) {
        rule.applyTo = frontmatter.globs;
      }
      return rule;
    });
    const toonContent = encode({
      rules
    });
    lines.push(toonContent);
    return lines.join("\n") + "\n\n";
  }
  generateReferencesSection(toolRules) {
    const toolRulesWithoutRoot = toolRules.filter((rule) => !rule.isRoot());
    if (toolRulesWithoutRoot.length === 0) {
      return "";
    }
    const lines = [];
    lines.push("Please also reference the following rules as needed:");
    lines.push("");
    for (const toolRule of toolRulesWithoutRoot) {
      const escapedDescription = toolRule.getDescription()?.replace(/"/g, '\\"');
      const globsText = toolRule.getGlobs()?.join(",");
      lines.push(
        `@${toolRule.getRelativePathFromCwd()} description: "${escapedDescription}" applyTo: "${globsText}"`
      );
    }
    return lines.join("\n") + "\n\n";
  }
  generateAdditionalConventionsSection({
    commands,
    subagents,
    skills
  }) {
    const overview = `# Additional Conventions Beyond the Built-in Functions

As this project's AI coding tool, you must follow the additional conventions below, in addition to the built-in functions.`;
    const commandsSection = commands ? `## Simulated Custom Slash Commands

Custom slash commands allow you to define frequently-used prompts as Markdown files that you can execute.

### Syntax

Users can use following syntax to invoke a custom command.

\`\`\`txt
s/<command> [arguments]
\`\`\`

This syntax employs a double slash (\`s/\`) to prevent conflicts with built-in slash commands.
The \`s\` in \`s/\` stands for *simulate*. Because custom slash commands are not built-in, this syntax provides a pseudo way to invoke them.

When users call a custom slash command, you have to look for the markdown file, \`${join108(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, "{command}.md")}\`, then execute the contents of that file as the block of operations.` : "";
    const subagentsSection = subagents ? `## Simulated Subagents

Simulated subagents are specialized AI assistants that can be invoked to handle specific types of tasks. In this case, it can be appear something like custom slash commands simply. Simulated subagents can be called by custom slash commands.

When users call a simulated subagent, it will look for the corresponding markdown file, \`${join108(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, "{subagent}.md")}\`, and execute its contents as the block of operations.

For example, if the user instructs \`Call planner subagent to plan the refactoring\`, you have to look for the markdown file, \`${join108(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, "planner.md")}\`, and execute its contents as the block of operations.` : "";
    const skillsSection = skills ? this.generateSkillsSection(skills) : "";
    const result = [
      overview,
      ...this.simulateCommands && CommandsProcessor.getToolTargetsSimulated().includes(this.toolTarget) ? [commandsSection] : [],
      ...this.simulateSubagents && SubagentsProcessor.getToolTargetsSimulated().includes(this.toolTarget) ? [subagentsSection] : [],
      ...this.simulateSkills && SkillsProcessor.getToolTargetsSimulated().includes(this.toolTarget) ? [skillsSection] : []
    ].join("\n\n") + "\n\n";
    return result;
  }
  generateSkillsSection(skills) {
    if (!skills.skillList || skills.skillList.length === 0) {
      return "";
    }
    const skillListWithAtPrefix = skills.skillList.map((skill) => ({
      ...skill,
      path: `@${skill.path}`
    }));
    const toonContent = encode({ skillList: skillListWithAtPrefix });
    return `## Simulated Skills

Simulated skills are specialized capabilities that can be invoked to handle specific types of tasks. When you determine that a skill would be helpful for the current task, read the corresponding SKILL.md file and execute its instructions.

${toonContent}`;
  }
};

// src/lib/generate.ts
async function processFeatureGeneration(params) {
  const { config, processor, toolFiles } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const writeResult = await processor.writeAiFiles(toolFiles);
  totalCount += writeResult.count;
  allPaths.push(...writeResult.paths);
  if (writeResult.count > 0) hasDiff = true;
  if (config.getDelete()) {
    const existingToolFiles = await processor.loadToolFiles({ forDeletion: true });
    const orphanCount = await processor.removeOrphanAiFiles(existingToolFiles, toolFiles);
    if (orphanCount > 0) hasDiff = true;
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function processDirFeatureGeneration(params) {
  const { config, processor, toolDirs } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const writeResult = await processor.writeAiDirs(toolDirs);
  totalCount += writeResult.count;
  allPaths.push(...writeResult.paths);
  if (writeResult.count > 0) hasDiff = true;
  if (config.getDelete()) {
    const existingToolDirs = await processor.loadToolDirsToDelete();
    const orphanCount = await processor.removeOrphanAiDirs(existingToolDirs, toolDirs);
    if (orphanCount > 0) hasDiff = true;
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function processEmptyFeatureGeneration(params) {
  const { config, processor } = params;
  const totalCount = 0;
  let hasDiff = false;
  if (config.getDelete()) {
    const existingToolFiles = await processor.loadToolFiles({ forDeletion: true });
    const orphanCount = await processor.removeOrphanAiFiles(existingToolFiles, []);
    if (orphanCount > 0) hasDiff = true;
  }
  return { count: totalCount, paths: [], hasDiff };
}
async function checkRulesyncDirExists(params) {
  return fileExists(join109(params.baseDir, RULESYNC_RELATIVE_DIR_PATH));
}
async function generate(params) {
  const { config } = params;
  const ignoreResult = await generateIgnoreCore({ config });
  const mcpResult = await generateMcpCore({ config });
  const commandsResult = await generateCommandsCore({ config });
  const subagentsResult = await generateSubagentsCore({ config });
  const skillsResult = await generateSkillsCore({ config });
  const hooksResult = await generateHooksCore({ config });
  const rulesResult = await generateRulesCore({ config, skills: skillsResult.skills });
  const hasDiff = ignoreResult.hasDiff || mcpResult.hasDiff || commandsResult.hasDiff || subagentsResult.hasDiff || skillsResult.hasDiff || hooksResult.hasDiff || rulesResult.hasDiff;
  return {
    rulesCount: rulesResult.count,
    rulesPaths: rulesResult.paths,
    ignoreCount: ignoreResult.count,
    ignorePaths: ignoreResult.paths,
    mcpCount: mcpResult.count,
    mcpPaths: mcpResult.paths,
    commandsCount: commandsResult.count,
    commandsPaths: commandsResult.paths,
    subagentsCount: subagentsResult.count,
    subagentsPaths: subagentsResult.paths,
    skillsCount: skillsResult.count,
    skillsPaths: skillsResult.paths,
    hooksCount: hooksResult.count,
    hooksPaths: hooksResult.paths,
    skills: skillsResult.skills,
    hasDiff
  };
}
async function generateRulesCore(params) {
  const { config, skills } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const toolTargets = intersection(
    config.getTargets(),
    RulesProcessor.getToolTargets({ global: config.getGlobal() })
  );
  for (const baseDir of config.getBaseDirs()) {
    for (const toolTarget of toolTargets) {
      if (!config.getFeatures(toolTarget).includes("rules")) {
        continue;
      }
      const processor = new RulesProcessor({
        baseDir,
        toolTarget,
        global: config.getGlobal(),
        simulateCommands: config.getSimulateCommands(),
        simulateSubagents: config.getSimulateSubagents(),
        simulateSkills: config.getSimulateSkills(),
        skills,
        dryRun: config.isPreviewMode()
      });
      const rulesyncFiles = await processor.loadRulesyncFiles();
      const toolFiles = await processor.convertRulesyncFilesToToolFiles(rulesyncFiles);
      const result = await processFeatureGeneration({
        config,
        processor,
        toolFiles
      });
      totalCount += result.count;
      allPaths.push(...result.paths);
      if (result.hasDiff) hasDiff = true;
    }
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function generateIgnoreCore(params) {
  const { config } = params;
  if (config.getGlobal()) {
    return { count: 0, paths: [], hasDiff: false };
  }
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  for (const toolTarget of intersection(config.getTargets(), IgnoreProcessor.getToolTargets())) {
    if (!config.getFeatures(toolTarget).includes("ignore")) {
      continue;
    }
    for (const baseDir of config.getBaseDirs()) {
      try {
        const processor = new IgnoreProcessor({
          baseDir: baseDir === process.cwd() ? "." : baseDir,
          toolTarget,
          dryRun: config.isPreviewMode()
        });
        const rulesyncFiles = await processor.loadRulesyncFiles();
        let result;
        if (rulesyncFiles.length > 0) {
          const toolFiles = await processor.convertRulesyncFilesToToolFiles(rulesyncFiles);
          result = await processFeatureGeneration({
            config,
            processor,
            toolFiles
          });
        } else {
          result = await processEmptyFeatureGeneration({
            config,
            processor
          });
        }
        totalCount += result.count;
        allPaths.push(...result.paths);
        if (result.hasDiff) hasDiff = true;
      } catch (error) {
        logger.warn(
          `Failed to generate ${toolTarget} ignore files for ${baseDir}: ${formatError(error)}`
        );
        continue;
      }
    }
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function generateMcpCore(params) {
  const { config } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const toolTargets = intersection(
    config.getTargets(),
    McpProcessor.getToolTargets({ global: config.getGlobal() })
  );
  for (const baseDir of config.getBaseDirs()) {
    for (const toolTarget of toolTargets) {
      if (!config.getFeatures(toolTarget).includes("mcp")) {
        continue;
      }
      const processor = new McpProcessor({
        baseDir,
        toolTarget,
        global: config.getGlobal(),
        dryRun: config.isPreviewMode()
      });
      const rulesyncFiles = await processor.loadRulesyncFiles();
      const toolFiles = await processor.convertRulesyncFilesToToolFiles(rulesyncFiles);
      const result = await processFeatureGeneration({
        config,
        processor,
        toolFiles
      });
      totalCount += result.count;
      allPaths.push(...result.paths);
      if (result.hasDiff) hasDiff = true;
    }
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function generateCommandsCore(params) {
  const { config } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const toolTargets = intersection(
    config.getTargets(),
    CommandsProcessor.getToolTargets({
      global: config.getGlobal(),
      includeSimulated: config.getSimulateCommands()
    })
  );
  for (const baseDir of config.getBaseDirs()) {
    for (const toolTarget of toolTargets) {
      if (!config.getFeatures(toolTarget).includes("commands")) {
        continue;
      }
      const processor = new CommandsProcessor({
        baseDir,
        toolTarget,
        global: config.getGlobal(),
        dryRun: config.isPreviewMode()
      });
      const rulesyncFiles = await processor.loadRulesyncFiles();
      const toolFiles = await processor.convertRulesyncFilesToToolFiles(rulesyncFiles);
      const result = await processFeatureGeneration({
        config,
        processor,
        toolFiles
      });
      totalCount += result.count;
      allPaths.push(...result.paths);
      if (result.hasDiff) hasDiff = true;
    }
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function generateSubagentsCore(params) {
  const { config } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const toolTargets = intersection(
    config.getTargets(),
    SubagentsProcessor.getToolTargets({
      global: config.getGlobal(),
      includeSimulated: config.getSimulateSubagents()
    })
  );
  for (const baseDir of config.getBaseDirs()) {
    for (const toolTarget of toolTargets) {
      if (!config.getFeatures(toolTarget).includes("subagents")) {
        continue;
      }
      const processor = new SubagentsProcessor({
        baseDir,
        toolTarget,
        global: config.getGlobal(),
        dryRun: config.isPreviewMode()
      });
      const rulesyncFiles = await processor.loadRulesyncFiles();
      const toolFiles = await processor.convertRulesyncFilesToToolFiles(rulesyncFiles);
      const result = await processFeatureGeneration({
        config,
        processor,
        toolFiles
      });
      totalCount += result.count;
      allPaths.push(...result.paths);
      if (result.hasDiff) hasDiff = true;
    }
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}
async function generateSkillsCore(params) {
  const { config } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const allSkills = [];
  const toolTargets = intersection(
    config.getTargets(),
    SkillsProcessor.getToolTargets({
      global: config.getGlobal(),
      includeSimulated: config.getSimulateSkills()
    })
  );
  for (const baseDir of config.getBaseDirs()) {
    for (const toolTarget of toolTargets) {
      if (!config.getFeatures(toolTarget).includes("skills")) {
        continue;
      }
      const processor = new SkillsProcessor({
        baseDir,
        toolTarget,
        global: config.getGlobal(),
        dryRun: config.isPreviewMode()
      });
      const rulesyncDirs = await processor.loadRulesyncDirs();
      for (const rulesyncDir of rulesyncDirs) {
        if (rulesyncDir instanceof RulesyncSkill) {
          allSkills.push(rulesyncDir);
        }
      }
      const toolDirs = await processor.convertRulesyncDirsToToolDirs(rulesyncDirs);
      const result = await processDirFeatureGeneration({
        config,
        processor,
        toolDirs
      });
      totalCount += result.count;
      allPaths.push(...result.paths);
      if (result.hasDiff) hasDiff = true;
    }
  }
  return { count: totalCount, paths: allPaths, skills: allSkills, hasDiff };
}
async function generateHooksCore(params) {
  const { config } = params;
  let totalCount = 0;
  const allPaths = [];
  let hasDiff = false;
  const toolTargets = intersection(
    config.getTargets(),
    HooksProcessor.getToolTargets({ global: config.getGlobal() })
  );
  for (const baseDir of config.getBaseDirs()) {
    for (const toolTarget of toolTargets) {
      if (!config.getFeatures(toolTarget).includes("hooks")) {
        continue;
      }
      const processor = new HooksProcessor({
        baseDir,
        toolTarget,
        global: config.getGlobal(),
        dryRun: config.isPreviewMode()
      });
      const rulesyncFiles = await processor.loadRulesyncFiles();
      let result;
      if (rulesyncFiles.length === 0) {
        result = await processEmptyFeatureGeneration({
          config,
          processor
        });
      } else {
        const toolFiles = await processor.convertRulesyncFilesToToolFiles(rulesyncFiles);
        result = await processFeatureGeneration({
          config,
          processor,
          toolFiles
        });
      }
      totalCount += result.count;
      allPaths.push(...result.paths);
      if (result.hasDiff) hasDiff = true;
    }
  }
  return { count: totalCount, paths: allPaths, hasDiff };
}

// src/lib/import.ts
async function importFromTool(params) {
  const { config, tool } = params;
  const rulesCount = await importRulesCore({ config, tool });
  const ignoreCount = await importIgnoreCore({ config, tool });
  const mcpCount = await importMcpCore({ config, tool });
  const commandsCount = await importCommandsCore({ config, tool });
  const subagentsCount = await importSubagentsCore({ config, tool });
  const skillsCount = await importSkillsCore({ config, tool });
  const hooksCount = await importHooksCore({ config, tool });
  return {
    rulesCount,
    ignoreCount,
    mcpCount,
    commandsCount,
    subagentsCount,
    skillsCount,
    hooksCount
  };
}
async function importRulesCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("rules")) {
    return 0;
  }
  const global = config.getGlobal();
  const supportedTargets = RulesProcessor.getToolTargets({ global });
  if (!supportedTargets.includes(tool)) {
    return 0;
  }
  const rulesProcessor = new RulesProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool,
    global
  });
  const toolFiles = await rulesProcessor.loadToolFiles();
  if (toolFiles.length === 0) {
    return 0;
  }
  const rulesyncFiles = await rulesProcessor.convertToolFilesToRulesyncFiles(toolFiles);
  const { count: writtenCount } = await rulesProcessor.writeAiFiles(rulesyncFiles);
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} rule files`);
  }
  return writtenCount;
}
async function importIgnoreCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("ignore")) {
    return 0;
  }
  if (config.getGlobal()) {
    logger.debug("Skipping ignore file import (not supported in global mode)");
    return 0;
  }
  if (!IgnoreProcessor.getToolTargets().includes(tool)) {
    return 0;
  }
  const ignoreProcessor = new IgnoreProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool
  });
  const toolFiles = await ignoreProcessor.loadToolFiles();
  if (toolFiles.length === 0) {
    return 0;
  }
  const rulesyncFiles = await ignoreProcessor.convertToolFilesToRulesyncFiles(toolFiles);
  const { count: writtenCount } = await ignoreProcessor.writeAiFiles(rulesyncFiles);
  if (config.getVerbose()) {
    logger.success(`Created ignore files from ${toolFiles.length} tool ignore configurations`);
  }
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} ignore files`);
  }
  return writtenCount;
}
async function importMcpCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("mcp")) {
    return 0;
  }
  const global = config.getGlobal();
  const supportedTargets = McpProcessor.getToolTargets({ global });
  if (!supportedTargets.includes(tool)) {
    return 0;
  }
  const mcpProcessor = new McpProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool,
    global
  });
  const toolFiles = await mcpProcessor.loadToolFiles();
  if (toolFiles.length === 0) {
    return 0;
  }
  const rulesyncFiles = await mcpProcessor.convertToolFilesToRulesyncFiles(toolFiles);
  const { count: writtenCount } = await mcpProcessor.writeAiFiles(rulesyncFiles);
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} MCP files`);
  }
  return writtenCount;
}
async function importCommandsCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("commands")) {
    return 0;
  }
  const global = config.getGlobal();
  const supportedTargets = CommandsProcessor.getToolTargets({ global, includeSimulated: false });
  if (!supportedTargets.includes(tool)) {
    return 0;
  }
  const commandsProcessor = new CommandsProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool,
    global
  });
  const toolFiles = await commandsProcessor.loadToolFiles();
  if (toolFiles.length === 0) {
    return 0;
  }
  const rulesyncFiles = await commandsProcessor.convertToolFilesToRulesyncFiles(toolFiles);
  const { count: writtenCount } = await commandsProcessor.writeAiFiles(rulesyncFiles);
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} command files`);
  }
  return writtenCount;
}
async function importSubagentsCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("subagents")) {
    return 0;
  }
  const global = config.getGlobal();
  const supportedTargets = SubagentsProcessor.getToolTargets({ global, includeSimulated: false });
  if (!supportedTargets.includes(tool)) {
    return 0;
  }
  const subagentsProcessor = new SubagentsProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool,
    global: config.getGlobal()
  });
  const toolFiles = await subagentsProcessor.loadToolFiles();
  if (toolFiles.length === 0) {
    return 0;
  }
  const rulesyncFiles = await subagentsProcessor.convertToolFilesToRulesyncFiles(toolFiles);
  const { count: writtenCount } = await subagentsProcessor.writeAiFiles(rulesyncFiles);
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} subagent files`);
  }
  return writtenCount;
}
async function importSkillsCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("skills")) {
    return 0;
  }
  const global = config.getGlobal();
  const supportedTargets = SkillsProcessor.getToolTargets({ global });
  if (!supportedTargets.includes(tool)) {
    return 0;
  }
  const skillsProcessor = new SkillsProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool,
    global
  });
  const toolDirs = await skillsProcessor.loadToolDirs();
  if (toolDirs.length === 0) {
    return 0;
  }
  const rulesyncDirs = await skillsProcessor.convertToolDirsToRulesyncDirs(toolDirs);
  const { count: writtenCount } = await skillsProcessor.writeAiDirs(rulesyncDirs);
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} skill directories`);
  }
  return writtenCount;
}
async function importHooksCore(params) {
  const { config, tool } = params;
  if (!config.getFeatures(tool).includes("hooks")) {
    return 0;
  }
  const global = config.getGlobal();
  const allTargets = HooksProcessor.getToolTargets({ global });
  const importableTargets = HooksProcessor.getToolTargets({ global, importOnly: true });
  if (!allTargets.includes(tool)) {
    return 0;
  }
  if (!importableTargets.includes(tool)) {
    logger.warn(`Import is not supported for ${tool} hooks. Skipping.`);
    return 0;
  }
  const hooksProcessor = new HooksProcessor({
    baseDir: config.getBaseDirs()[0] ?? ".",
    toolTarget: tool,
    global
  });
  const toolFiles = await hooksProcessor.loadToolFiles();
  if (toolFiles.length === 0) {
    return 0;
  }
  const rulesyncFiles = await hooksProcessor.convertToolFilesToRulesyncFiles(toolFiles);
  const { count: writtenCount } = await hooksProcessor.writeAiFiles(rulesyncFiles);
  if (config.getVerbose() && writtenCount > 0) {
    logger.success(`Created ${writtenCount} hooks file(s)`);
  }
  return writtenCount;
}

export {
  RULESYNC_CONFIG_RELATIVE_FILE_PATH,
  RULESYNC_RELATIVE_DIR_PATH,
  RULESYNC_RULES_RELATIVE_DIR_PATH,
  RULESYNC_COMMANDS_RELATIVE_DIR_PATH,
  RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
  RULESYNC_MCP_RELATIVE_FILE_PATH,
  RULESYNC_HOOKS_RELATIVE_FILE_PATH,
  RULESYNC_AIIGNORE_FILE_NAME,
  RULESYNC_AIIGNORE_RELATIVE_FILE_PATH,
  RULESYNC_IGNORE_RELATIVE_FILE_PATH,
  RULESYNC_OVERVIEW_FILE_NAME,
  RULESYNC_SKILLS_RELATIVE_DIR_PATH,
  RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH,
  RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH,
  RULESYNC_MCP_FILE_NAME,
  RULESYNC_HOOKS_FILE_NAME,
  MAX_FILE_SIZE,
  FETCH_CONCURRENCY_LIMIT,
  formatError,
  logger,
  ensureDir,
  checkPathTraversal,
  directoryExists,
  readFileContent,
  writeFileContent,
  fileExists,
  listDirectoryFiles,
  findFilesByGlobs,
  removeDirectory,
  removeFile,
  createTempDirectory,
  removeTempDirectory,
  ALL_FEATURES,
  ALL_FEATURES_WITH_WILDCARD,
  ALL_TOOL_TARGETS,
  ConfigResolver,
  stringifyFrontmatter,
  RulesyncCommandFrontmatterSchema,
  RulesyncCommand,
  CommandsProcessor,
  RulesyncHooks,
  HooksProcessor,
  RulesyncIgnore,
  IgnoreProcessor,
  RulesyncMcp,
  McpProcessor,
  SKILL_FILE_NAME,
  RulesyncSkillFrontmatterSchema,
  RulesyncSkill,
  getLocalSkillDirNames,
  SkillsProcessor,
  RulesyncSubagentFrontmatterSchema,
  RulesyncSubagent,
  SubagentsProcessor,
  RulesyncRuleFrontmatterSchema,
  RulesyncRule,
  RulesProcessor,
  checkRulesyncDirExists,
  generate,
  importFromTool
};
