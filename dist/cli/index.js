#!/usr/bin/env node
import {
  ALL_FEATURES,
  ALL_FEATURES_WITH_WILDCARD,
  ALL_TOOL_TARGETS,
  CommandsProcessor,
  ConfigResolver,
  FETCH_CONCURRENCY_LIMIT,
  HooksProcessor,
  IgnoreProcessor,
  MAX_FILE_SIZE,
  McpProcessor,
  RULESYNC_AIIGNORE_FILE_NAME,
  RULESYNC_AIIGNORE_RELATIVE_FILE_PATH,
  RULESYNC_COMMANDS_RELATIVE_DIR_PATH,
  RULESYNC_CONFIG_RELATIVE_FILE_PATH,
  RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH,
  RULESYNC_HOOKS_FILE_NAME,
  RULESYNC_HOOKS_RELATIVE_FILE_PATH,
  RULESYNC_IGNORE_RELATIVE_FILE_PATH,
  RULESYNC_MCP_FILE_NAME,
  RULESYNC_MCP_RELATIVE_FILE_PATH,
  RULESYNC_OVERVIEW_FILE_NAME,
  RULESYNC_RELATIVE_DIR_PATH,
  RULESYNC_RULES_RELATIVE_DIR_PATH,
  RULESYNC_SKILLS_RELATIVE_DIR_PATH,
  RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH,
  RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
  RulesProcessor,
  RulesyncCommand,
  RulesyncCommandFrontmatterSchema,
  RulesyncHooks,
  RulesyncIgnore,
  RulesyncMcp,
  RulesyncRule,
  RulesyncRuleFrontmatterSchema,
  RulesyncSkill,
  RulesyncSkillFrontmatterSchema,
  RulesyncSubagent,
  RulesyncSubagentFrontmatterSchema,
  SKILL_FILE_NAME,
  SkillsProcessor,
  SubagentsProcessor,
  checkPathTraversal,
  checkRulesyncDirExists,
  createTempDirectory,
  directoryExists,
  ensureDir,
  fileExists,
  findFilesByGlobs,
  formatError,
  generate,
  getLocalSkillDirNames,
  importFromTool,
  listDirectoryFiles,
  logger,
  readFileContent,
  removeDirectory,
  removeFile,
  removeTempDirectory,
  stringifyFrontmatter,
  writeFileContent
} from "../chunk-NRNUPCXY.js";

// src/cli/index.ts
import { Command } from "commander";

// src/constants/announcements.ts
var ANNOUNCEMENT = "".trim();

// src/lib/fetch.ts
import { Semaphore } from "es-toolkit/promise";
import { join } from "path";

// src/lib/github-client.ts
import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";

// src/types/fetch.ts
import { z as z2 } from "zod/mini";

// src/types/fetch-targets.ts
import { z } from "zod/mini";
var ALL_FETCH_TARGETS = ["rulesync", ...ALL_TOOL_TARGETS];
var FetchTargetSchema = z.enum(ALL_FETCH_TARGETS);

// src/types/fetch.ts
var ConflictStrategySchema = z2.enum(["skip", "overwrite"]);
var GitHubFileTypeSchema = z2.enum(["file", "dir", "symlink", "submodule"]);
var GitHubFileEntrySchema = z2.looseObject({
  name: z2.string(),
  path: z2.string(),
  sha: z2.string(),
  size: z2.number(),
  type: GitHubFileTypeSchema,
  download_url: z2.nullable(z2.string())
});
var FetchOptionsSchema = z2.looseObject({
  target: z2.optional(FetchTargetSchema),
  features: z2.optional(z2.array(z2.enum(ALL_FEATURES_WITH_WILDCARD))),
  ref: z2.optional(z2.string()),
  path: z2.optional(z2.string()),
  output: z2.optional(z2.string()),
  conflict: z2.optional(ConflictStrategySchema),
  token: z2.optional(z2.string()),
  verbose: z2.optional(z2.boolean()),
  silent: z2.optional(z2.boolean())
});
var FetchFileStatusSchema = z2.enum(["created", "overwritten", "skipped"]);
var GitHubRepoInfoSchema = z2.looseObject({
  default_branch: z2.string(),
  private: z2.boolean()
});
var GitHubReleaseAssetSchema = z2.looseObject({
  name: z2.string(),
  browser_download_url: z2.string(),
  size: z2.number()
});
var GitHubReleaseSchema = z2.looseObject({
  tag_name: z2.string(),
  name: z2.nullable(z2.string()),
  prerelease: z2.boolean(),
  draft: z2.boolean(),
  assets: z2.array(GitHubReleaseAssetSchema)
});

// src/lib/github-client.ts
var GitHubClientError = class extends Error {
  constructor(message, statusCode, apiError) {
    super(message);
    this.statusCode = statusCode;
    this.apiError = apiError;
    this.name = "GitHubClientError";
  }
};
function logGitHubAuthHints(error) {
  logger.error(`GitHub API Error: ${error.message}`);
  if (error.statusCode === 401 || error.statusCode === 403) {
    logger.info(
      "Tip: Set GITHUB_TOKEN or GH_TOKEN environment variable for private repositories or better rate limits."
    );
    logger.info(
      "Tip: If you use GitHub CLI, you can use `GITHUB_TOKEN=$(gh auth token) rulesync fetch ...`"
    );
  }
}
var GitHubClient = class {
  octokit;
  hasToken;
  constructor(config = {}) {
    if (config.baseUrl && !config.baseUrl.startsWith("https://")) {
      throw new GitHubClientError("GitHub API base URL must use HTTPS");
    }
    this.hasToken = !!config.token;
    this.octokit = new Octokit({
      auth: config.token,
      baseUrl: config.baseUrl
    });
  }
  /**
   * Get authentication token from various sources
   */
  static resolveToken(explicitToken) {
    if (explicitToken) {
      return explicitToken;
    }
    return process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];
  }
  /**
   * Get the default branch of a repository
   */
  async getDefaultBranch(owner, repo) {
    const repoInfo = await this.getRepoInfo(owner, repo);
    return repoInfo.default_branch;
  }
  /**
   * Get repository information
   */
  async getRepoInfo(owner, repo) {
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      const parsed = GitHubRepoInfoSchema.safeParse(data);
      if (!parsed.success) {
        throw new GitHubClientError(
          `Invalid repository info response: ${formatError(parsed.error)}`
        );
      }
      return parsed.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * List contents of a directory in a repository
   */
  async listDirectory(owner, repo, path2, ref) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: path2,
        ref
      });
      if (!Array.isArray(data)) {
        throw new GitHubClientError(`Path "${path2}" is not a directory`);
      }
      const entries = [];
      for (const item of data) {
        const parsed = GitHubFileEntrySchema.safeParse(item);
        if (parsed.success) {
          entries.push(parsed.data);
        }
      }
      return entries;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * Get raw file content from a repository
   */
  async getFileContent(owner, repo, path2, ref) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: path2,
        ref,
        mediaType: {
          format: "raw"
        }
      });
      if (typeof data === "string") {
        return data;
      }
      if (!Array.isArray(data) && "content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      throw new GitHubClientError(`Unexpected response format for file content`);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * Check if a file exists and is within size limits
   */
  async getFileInfo(owner, repo, path2, ref) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: path2,
        ref
      });
      if (Array.isArray(data)) {
        return null;
      }
      const parsed = GitHubFileEntrySchema.safeParse(data);
      if (!parsed.success) {
        return null;
      }
      if (parsed.data.size > MAX_FILE_SIZE) {
        throw new GitHubClientError(
          `File "${path2}" exceeds maximum size limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        return null;
      }
      if (error instanceof GitHubClientError && error.statusCode === 404) {
        return null;
      }
      throw this.handleError(error);
    }
  }
  /**
   * Validate that a repository exists and is accessible
   */
  async validateRepository(owner, repo) {
    try {
      await this.getRepoInfo(owner, repo);
      return true;
    } catch (error) {
      if (error instanceof GitHubClientError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
  /**
   * Resolve a ref (branch, tag, or SHA) to a full commit SHA.
   */
  async resolveRefToSha(owner, repo, ref) {
    try {
      const { data } = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref
      });
      return data.sha;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * Get the latest release from a repository
   */
  async getLatestRelease(owner, repo) {
    try {
      const { data } = await this.octokit.repos.getLatestRelease({ owner, repo });
      const parsed = GitHubReleaseSchema.safeParse(data);
      if (!parsed.success) {
        throw new GitHubClientError(`Invalid release info response: ${formatError(parsed.error)}`);
      }
      return parsed.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  /**
   * Handle errors from Octokit and convert to GitHubClientError
   */
  handleError(error) {
    if (error instanceof GitHubClientError) {
      return error;
    }
    if (error instanceof RequestError) {
      const responseData = error.response?.data;
      const message = this.extractErrorMessage(responseData, error.message);
      const apiError = message ? { message } : void 0;
      const errorMessage = this.getErrorMessage(error.status, apiError);
      return new GitHubClientError(errorMessage, error.status, apiError);
    }
    if (error instanceof Error) {
      return new GitHubClientError(error.message);
    }
    return new GitHubClientError("Unknown error occurred");
  }
  /**
   * Extract error message from response data
   */
  extractErrorMessage(data, fallback) {
    if (typeof data === "object" && data !== null && "message" in data) {
      const record = data;
      const msg = record["message"];
      if (typeof msg === "string") {
        return msg;
      }
    }
    return fallback;
  }
  /**
   * Get human-readable error message for HTTP status codes
   */
  getErrorMessage(statusCode, apiError) {
    const baseMessage = apiError?.message ?? `HTTP ${statusCode}`;
    switch (statusCode) {
      case 401:
        return `Authentication failed: ${baseMessage}. Check your GitHub token.`;
      case 403:
        if (baseMessage.toLowerCase().includes("rate limit")) {
          return `GitHub API rate limit exceeded. ${this.hasToken ? "Try again later." : "Consider using a GitHub token."}`;
        }
        return `Access forbidden: ${baseMessage}. Check repository permissions.`;
      case 404:
        return `Not found: ${baseMessage}`;
      case 422:
        return `Invalid request: ${baseMessage}`;
      default:
        return `GitHub API error: ${baseMessage}`;
    }
  }
};

// src/lib/github-utils.ts
var MAX_RECURSION_DEPTH = 15;
async function withSemaphore(semaphore, fn) {
  await semaphore.acquire();
  try {
    return await fn();
  } finally {
    semaphore.release();
  }
}
async function listDirectoryRecursive(params) {
  const { client, owner, repo, path: path2, ref, depth = 0, semaphore } = params;
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded while listing directory: ${path2}`
    );
  }
  const entries = await withSemaphore(
    semaphore,
    () => client.listDirectory(owner, repo, path2, ref)
  );
  const files = [];
  const directories = [];
  for (const entry of entries) {
    if (entry.type === "file") {
      files.push(entry);
    } else if (entry.type === "dir") {
      directories.push(entry);
    }
  }
  const subResults = await Promise.all(
    directories.map(
      (dir) => listDirectoryRecursive({
        client,
        owner,
        repo,
        path: dir.path,
        ref,
        depth: depth + 1,
        semaphore
      })
    )
  );
  return [...files, ...subResults.flat()];
}

// src/types/git-provider.ts
import { z as z3 } from "zod/mini";
var ALL_GIT_PROVIDERS = ["github", "gitlab"];
var GitProviderSchema = z3.enum(ALL_GIT_PROVIDERS);

// src/lib/source-parser.ts
var GITHUB_HOSTS = /* @__PURE__ */ new Set(["github.com", "www.github.com"]);
var GITLAB_HOSTS = /* @__PURE__ */ new Set(["gitlab.com", "www.gitlab.com"]);
function parseSource(source) {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return parseUrl(source);
  }
  if (source.includes(":") && !source.includes("://")) {
    const colonIndex = source.indexOf(":");
    const prefix = source.substring(0, colonIndex);
    const rest = source.substring(colonIndex + 1);
    const provider = ALL_GIT_PROVIDERS.find((p) => p === prefix);
    if (provider) {
      return { provider, ...parseShorthand(rest) };
    }
    return { provider: "github", ...parseShorthand(source) };
  }
  return { provider: "github", ...parseShorthand(source) };
}
function parseUrl(url) {
  const urlObj = new URL(url);
  const host = urlObj.hostname.toLowerCase();
  let provider;
  if (GITHUB_HOSTS.has(host)) {
    provider = "github";
  } else if (GITLAB_HOSTS.has(host)) {
    provider = "gitlab";
  } else {
    throw new Error(
      `Unknown Git provider for host: ${host}. Supported providers: ${ALL_GIT_PROVIDERS.join(", ")}`
    );
  }
  const segments = urlObj.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`Invalid ${provider} URL: ${url}. Expected format: https://${host}/owner/repo`);
  }
  const owner = segments[0];
  const repo = segments[1]?.replace(/\.git$/, "");
  if (segments.length > 2 && (segments[2] === "tree" || segments[2] === "blob")) {
    const ref = segments[3];
    const path2 = segments.length > 4 ? segments.slice(4).join("/") : void 0;
    return {
      provider,
      owner: owner ?? "",
      repo: repo ?? "",
      ref,
      path: path2
    };
  }
  return {
    provider,
    owner: owner ?? "",
    repo: repo ?? ""
  };
}
function parseShorthand(source) {
  let remaining = source;
  let path2;
  let ref;
  const colonIndex = remaining.indexOf(":");
  if (colonIndex !== -1) {
    path2 = remaining.substring(colonIndex + 1);
    if (!path2) {
      throw new Error(`Invalid source: ${source}. Path cannot be empty after ":".`);
    }
    remaining = remaining.substring(0, colonIndex);
  }
  const atIndex = remaining.indexOf("@");
  if (atIndex !== -1) {
    ref = remaining.substring(atIndex + 1);
    if (!ref) {
      throw new Error(`Invalid source: ${source}. Ref cannot be empty after "@".`);
    }
    remaining = remaining.substring(0, atIndex);
  }
  const slashIndex = remaining.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(
      `Invalid source: ${source}. Expected format: owner/repo, owner/repo@ref, or owner/repo:path`
    );
  }
  const owner = remaining.substring(0, slashIndex);
  const repo = remaining.substring(slashIndex + 1);
  if (!owner || !repo) {
    throw new Error(`Invalid source: ${source}. Both owner and repo are required.`);
  }
  return {
    owner,
    repo,
    ref,
    path: path2
  };
}

// src/lib/fetch.ts
var FEATURE_PATHS = {
  rules: ["rules"],
  commands: ["commands"],
  subagents: ["subagents"],
  skills: ["skills"],
  ignore: [RULESYNC_AIIGNORE_FILE_NAME],
  mcp: [RULESYNC_MCP_FILE_NAME],
  hooks: [RULESYNC_HOOKS_FILE_NAME]
};
function isToolTarget(target) {
  return target !== "rulesync";
}
function validateFileSize(relativePath, size) {
  if (size > MAX_FILE_SIZE) {
    throw new GitHubClientError(
      `File "${relativePath}" exceeds maximum size limit (${(size / 1024 / 1024).toFixed(2)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB)`
    );
  }
}
async function processFeatureConversion(params) {
  const { processor, outputDir } = params;
  const paths = [];
  const toolFiles = await processor.loadToolFiles();
  if (toolFiles.length === 0) {
    return { paths: [] };
  }
  const rulesyncFiles = await processor.convertToolFilesToRulesyncFiles(toolFiles);
  for (const file of rulesyncFiles) {
    const relativePath = join(file.getRelativeDirPath(), file.getRelativeFilePath());
    const outputPath = join(outputDir, relativePath);
    await writeFileContent(outputPath, file.getFileContent());
    paths.push(relativePath);
  }
  return { paths };
}
async function convertFetchedFilesToRulesync(params) {
  const { tempDir, outputDir, target, features } = params;
  const convertedPaths = [];
  const featureConfigs = [
    {
      feature: "rules",
      getTargets: () => RulesProcessor.getToolTargets({ global: false }),
      createProcessor: () => new RulesProcessor({ baseDir: tempDir, toolTarget: target, global: false })
    },
    {
      feature: "commands",
      getTargets: () => CommandsProcessor.getToolTargets({ global: false, includeSimulated: false }),
      createProcessor: () => new CommandsProcessor({ baseDir: tempDir, toolTarget: target, global: false })
    },
    {
      feature: "subagents",
      getTargets: () => SubagentsProcessor.getToolTargets({ global: false, includeSimulated: false }),
      createProcessor: () => new SubagentsProcessor({ baseDir: tempDir, toolTarget: target, global: false })
    },
    {
      feature: "ignore",
      getTargets: () => IgnoreProcessor.getToolTargets(),
      createProcessor: () => new IgnoreProcessor({ baseDir: tempDir, toolTarget: target })
    },
    {
      feature: "mcp",
      getTargets: () => McpProcessor.getToolTargets({ global: false }),
      createProcessor: () => new McpProcessor({ baseDir: tempDir, toolTarget: target, global: false })
    },
    {
      feature: "hooks",
      getTargets: () => HooksProcessor.getToolTargets({ global: false }),
      createProcessor: () => new HooksProcessor({ baseDir: tempDir, toolTarget: target, global: false })
    }
  ];
  for (const config of featureConfigs) {
    if (!features.includes(config.feature)) {
      continue;
    }
    const supportedTargets = config.getTargets();
    if (!supportedTargets.includes(target)) {
      continue;
    }
    const processor = config.createProcessor();
    const result = await processFeatureConversion({ processor, outputDir });
    convertedPaths.push(...result.paths);
  }
  if (features.includes("skills")) {
    logger.debug(
      "Skills conversion is not yet supported in fetch command. Use import command instead."
    );
  }
  return { converted: convertedPaths.length, convertedPaths };
}
function resolveFeatures(features) {
  if (!features || features.length === 0 || features.includes("*")) {
    return [...ALL_FEATURES];
  }
  return features.filter((f) => ALL_FEATURES.includes(f));
}
function hasStatusCode(error) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return false;
  }
  const maybeStatus = Object.getOwnPropertyDescriptor(error, "statusCode")?.value;
  return typeof maybeStatus === "number";
}
function isNotFoundError(error) {
  if (error instanceof GitHubClientError && error.statusCode === 404) {
    return true;
  }
  if (hasStatusCode(error) && error.statusCode === 404) {
    return true;
  }
  return false;
}
async function fetchFiles(params) {
  const { source, options = {}, baseDir = process.cwd() } = params;
  const parsed = parseSource(source);
  if (parsed.provider === "gitlab") {
    throw new Error(
      "GitLab is not yet supported. Currently only GitHub repositories are supported."
    );
  }
  const resolvedRef = options.ref ?? parsed.ref;
  const resolvedPath = options.path ?? parsed.path ?? ".";
  const outputDir = options.output ?? RULESYNC_RELATIVE_DIR_PATH;
  const conflictStrategy = options.conflict ?? "overwrite";
  const enabledFeatures = resolveFeatures(options.features);
  const target = options.target ?? "rulesync";
  checkPathTraversal({
    relativePath: outputDir,
    intendedRootDir: baseDir
  });
  const token = GitHubClient.resolveToken(options.token);
  const client = new GitHubClient({ token });
  logger.debug(`Validating repository: ${parsed.owner}/${parsed.repo}`);
  const isValid = await client.validateRepository(parsed.owner, parsed.repo);
  if (!isValid) {
    throw new GitHubClientError(
      `Repository not found: ${parsed.owner}/${parsed.repo}. Check the repository name and your access permissions.`,
      404
    );
  }
  const ref = resolvedRef ?? await client.getDefaultBranch(parsed.owner, parsed.repo);
  logger.debug(`Using ref: ${ref}`);
  if (isToolTarget(target)) {
    return fetchAndConvertToolFiles({
      client,
      parsed,
      ref,
      resolvedPath,
      enabledFeatures,
      target,
      outputDir,
      baseDir,
      conflictStrategy
    });
  }
  const semaphore = new Semaphore(FETCH_CONCURRENCY_LIMIT);
  const filesToFetch = await collectFeatureFiles({
    client,
    owner: parsed.owner,
    repo: parsed.repo,
    basePath: resolvedPath,
    ref,
    enabledFeatures,
    semaphore
  });
  if (filesToFetch.length === 0) {
    logger.warn(`No files found matching enabled features: ${enabledFeatures.join(", ")}`);
    return {
      source: `${parsed.owner}/${parsed.repo}`,
      ref,
      files: [],
      created: 0,
      overwritten: 0,
      skipped: 0
    };
  }
  const outputBasePath = join(baseDir, outputDir);
  for (const { relativePath, size } of filesToFetch) {
    checkPathTraversal({
      relativePath,
      intendedRootDir: outputBasePath
    });
    validateFileSize(relativePath, size);
  }
  const results = await Promise.all(
    filesToFetch.map(async ({ remotePath, relativePath }) => {
      const localPath = join(outputBasePath, relativePath);
      const exists = await fileExists(localPath);
      if (exists && conflictStrategy === "skip") {
        logger.debug(`Skipping existing file: ${relativePath}`);
        return { relativePath, status: "skipped" };
      }
      const content = await withSemaphore(
        semaphore,
        () => client.getFileContent(parsed.owner, parsed.repo, remotePath, ref)
      );
      await writeFileContent(localPath, content);
      const status = exists ? "overwritten" : "created";
      logger.debug(`Wrote: ${relativePath} (${status})`);
      return { relativePath, status };
    })
  );
  const summary = {
    source: `${parsed.owner}/${parsed.repo}`,
    ref,
    files: results,
    created: results.filter((r) => r.status === "created").length,
    overwritten: results.filter((r) => r.status === "overwritten").length,
    skipped: results.filter((r) => r.status === "skipped").length
  };
  return summary;
}
async function collectFeatureFiles(params) {
  const { client, owner, repo, basePath, ref, enabledFeatures, semaphore } = params;
  const dirCache = /* @__PURE__ */ new Map();
  async function getCachedDirectory(path2) {
    let promise = dirCache.get(path2);
    if (promise === void 0) {
      promise = withSemaphore(semaphore, () => client.listDirectory(owner, repo, path2, ref));
      dirCache.set(path2, promise);
    }
    return promise;
  }
  const tasks = enabledFeatures.flatMap(
    (feature) => FEATURE_PATHS[feature].map((featurePath) => ({ feature, featurePath }))
  );
  const results = await Promise.all(
    tasks.map(async ({ featurePath }) => {
      const fullPath = basePath === "." || basePath === "" ? featurePath : join(basePath, featurePath);
      const collected = [];
      try {
        if (featurePath.includes(".")) {
          try {
            const entries = await getCachedDirectory(
              basePath === "." || basePath === "" ? "." : basePath
            );
            const fileEntry = entries.find((e) => e.name === featurePath && e.type === "file");
            if (fileEntry) {
              collected.push({
                remotePath: fileEntry.path,
                relativePath: featurePath,
                size: fileEntry.size
              });
            }
          } catch (error) {
            if (isNotFoundError(error)) {
              logger.debug(`File not found: ${fullPath}`);
            } else {
              throw error;
            }
          }
        } else {
          const dirFiles = await listDirectoryRecursive({
            client,
            owner,
            repo,
            path: fullPath,
            ref,
            semaphore
          });
          for (const file of dirFiles) {
            const relativePath = basePath === "." || basePath === "" ? file.path : file.path.substring(basePath.length + 1);
            collected.push({
              remotePath: file.path,
              relativePath,
              size: file.size
            });
          }
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          logger.debug(`Feature not found: ${fullPath}`);
          return collected;
        }
        throw error;
      }
      return collected;
    })
  );
  return results.flat();
}
async function fetchAndConvertToolFiles(params) {
  const {
    client,
    parsed,
    ref,
    resolvedPath,
    enabledFeatures,
    target,
    outputDir,
    baseDir,
    conflictStrategy: _conflictStrategy
  } = params;
  const tempDir = await createTempDirectory();
  logger.debug(`Created temp directory: ${tempDir}`);
  const semaphore = new Semaphore(FETCH_CONCURRENCY_LIMIT);
  try {
    const filesToFetch = await collectFeatureFiles({
      client,
      owner: parsed.owner,
      repo: parsed.repo,
      basePath: resolvedPath,
      ref,
      enabledFeatures,
      semaphore
    });
    if (filesToFetch.length === 0) {
      logger.warn(`No files found matching enabled features: ${enabledFeatures.join(", ")}`);
      return {
        source: `${parsed.owner}/${parsed.repo}`,
        ref,
        files: [],
        created: 0,
        overwritten: 0,
        skipped: 0
      };
    }
    for (const { relativePath, size } of filesToFetch) {
      validateFileSize(relativePath, size);
    }
    const toolPaths = getToolPathMapping(target);
    await Promise.all(
      filesToFetch.map(async ({ remotePath, relativePath }) => {
        const toolRelativePath = mapToToolPath(relativePath, toolPaths);
        checkPathTraversal({
          relativePath: toolRelativePath,
          intendedRootDir: tempDir
        });
        const localPath = join(tempDir, toolRelativePath);
        const content = await withSemaphore(
          semaphore,
          () => client.getFileContent(parsed.owner, parsed.repo, remotePath, ref)
        );
        await writeFileContent(localPath, content);
        logger.debug(`Fetched to temp: ${toolRelativePath}`);
      })
    );
    const outputBasePath = join(baseDir, outputDir);
    const { converted, convertedPaths } = await convertFetchedFilesToRulesync({
      tempDir,
      outputDir: outputBasePath,
      target,
      features: enabledFeatures
    });
    const results = convertedPaths.map((relativePath) => ({
      relativePath,
      status: "created"
    }));
    logger.debug(`Converted ${converted} files from ${target} format to rulesync format`);
    return {
      source: `${parsed.owner}/${parsed.repo}`,
      ref,
      files: results,
      created: results.filter((r) => r.status === "created").length,
      overwritten: results.filter((r) => r.status === "overwritten").length,
      skipped: results.filter((r) => r.status === "skipped").length
    };
  } finally {
    await removeTempDirectory(tempDir);
  }
}
function getToolPathMapping(target) {
  const mapping = {};
  const supportedRulesTargets = RulesProcessor.getToolTargets({ global: false });
  if (supportedRulesTargets.includes(target)) {
    const factory = RulesProcessor.getFactory(target);
    if (factory) {
      const paths = factory.class.getSettablePaths({ global: false });
      mapping.rules = {
        root: paths.root?.relativeFilePath,
        nonRoot: paths.nonRoot?.relativeDirPath
      };
    }
  }
  const supportedCommandsTargets = CommandsProcessor.getToolTargets({
    global: false,
    includeSimulated: false
  });
  if (supportedCommandsTargets.includes(target)) {
    const factory = CommandsProcessor.getFactory(target);
    if (factory) {
      const paths = factory.class.getSettablePaths({ global: false });
      mapping.commands = paths.relativeDirPath;
    }
  }
  const supportedSubagentsTargets = SubagentsProcessor.getToolTargets({
    global: false,
    includeSimulated: false
  });
  if (supportedSubagentsTargets.includes(target)) {
    const factory = SubagentsProcessor.getFactory(target);
    if (factory) {
      const paths = factory.class.getSettablePaths({ global: false });
      mapping.subagents = paths.relativeDirPath;
    }
  }
  const supportedSkillsTargets = SkillsProcessor.getToolTargets({ global: false });
  if (supportedSkillsTargets.includes(target)) {
    const factory = SkillsProcessor.getFactory(target);
    if (factory) {
      const paths = factory.class.getSettablePaths({ global: false });
      mapping.skills = paths.relativeDirPath;
    }
  }
  return mapping;
}
function mapToToolPath(relativePath, toolPaths) {
  if (relativePath.startsWith("rules/")) {
    const restPath = relativePath.substring("rules/".length);
    if (toolPaths.rules?.nonRoot) {
      return join(toolPaths.rules.nonRoot, restPath);
    }
  }
  if (toolPaths.rules?.root && relativePath === toolPaths.rules.root) {
    return relativePath;
  }
  if (relativePath.startsWith("commands/")) {
    const restPath = relativePath.substring("commands/".length);
    if (toolPaths.commands) {
      return join(toolPaths.commands, restPath);
    }
  }
  if (relativePath.startsWith("subagents/")) {
    const restPath = relativePath.substring("subagents/".length);
    if (toolPaths.subagents) {
      return join(toolPaths.subagents, restPath);
    }
  }
  if (relativePath.startsWith("skills/")) {
    const restPath = relativePath.substring("skills/".length);
    if (toolPaths.skills) {
      return join(toolPaths.skills, restPath);
    }
  }
  return relativePath;
}
function formatFetchSummary(summary) {
  const lines = [];
  lines.push(`Fetched from ${summary.source}@${summary.ref}:`);
  for (const file of summary.files) {
    const icon = file.status === "skipped" ? "-" : "\u2713";
    const statusText = file.status === "created" ? "(created)" : file.status === "overwritten" ? "(overwritten)" : "(skipped - already exists)";
    lines.push(`  ${icon} ${file.relativePath} ${statusText}`);
  }
  const parts = [];
  if (summary.created > 0) parts.push(`${summary.created} created`);
  if (summary.overwritten > 0) parts.push(`${summary.overwritten} overwritten`);
  if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
  lines.push("");
  const summaryText = parts.length > 0 ? parts.join(", ") : "no files";
  lines.push(`Summary: ${summaryText}`);
  return lines.join("\n");
}

// src/cli/commands/fetch.ts
async function fetchCommand(options) {
  const { source, ...fetchOptions } = options;
  logger.configure({
    verbose: fetchOptions.verbose ?? false,
    silent: fetchOptions.silent ?? false
  });
  logger.debug(`Fetching files from ${source}...`);
  try {
    const summary = await fetchFiles({
      source,
      options: fetchOptions
    });
    const output = formatFetchSummary(summary);
    logger.success(output);
    if (summary.created + summary.overwritten === 0 && summary.skipped === 0) {
      logger.warn("No files were fetched.");
    }
  } catch (error) {
    if (error instanceof GitHubClientError) {
      logGitHubAuthHints(error);
    } else {
      logger.error(formatError(error));
    }
    process.exit(1);
  }
}

// src/utils/result.ts
function calculateTotalCount(result) {
  return result.rulesCount + result.ignoreCount + result.mcpCount + result.commandsCount + result.subagentsCount + result.skillsCount + result.hooksCount;
}

// src/cli/commands/generate.ts
function logFeatureResult(params) {
  const { count, paths, featureName, isPreview, modePrefix } = params;
  if (count > 0) {
    if (isPreview) {
      logger.info(`${modePrefix} Would write ${count} ${featureName}`);
    } else {
      logger.success(`Written ${count} ${featureName}`);
    }
    for (const p of paths) {
      logger.info(`    ${p}`);
    }
  }
}
async function generateCommand(options) {
  const config = await ConfigResolver.resolve(options);
  logger.configure({
    verbose: config.getVerbose(),
    silent: config.getSilent()
  });
  const check = config.getCheck();
  const isPreview = config.isPreviewMode();
  const modePrefix = isPreview ? "[DRY RUN]" : "";
  logger.debug("Generating files...");
  if (!await checkRulesyncDirExists({ baseDir: process.cwd() })) {
    logger.error("\u274C .rulesync directory not found. Run 'rulesync init' first.");
    process.exit(1);
  }
  logger.debug(`Base directories: ${config.getBaseDirs().join(", ")}`);
  const features = config.getFeatures();
  if (features.includes("ignore")) {
    logger.debug("Generating ignore files...");
  }
  if (features.includes("mcp")) {
    logger.debug("Generating MCP files...");
  }
  if (features.includes("commands")) {
    logger.debug("Generating command files...");
  }
  if (features.includes("subagents")) {
    logger.debug("Generating subagent files...");
  }
  if (features.includes("skills")) {
    logger.debug("Generating skill files...");
  }
  if (features.includes("hooks")) {
    logger.debug("Generating hooks...");
  }
  if (features.includes("rules")) {
    logger.debug("Generating rule files...");
  }
  const result = await generate({ config });
  logFeatureResult({
    count: result.ignoreCount,
    paths: result.ignorePaths,
    featureName: "ignore file(s)",
    isPreview,
    modePrefix
  });
  logFeatureResult({
    count: result.mcpCount,
    paths: result.mcpPaths,
    featureName: "MCP configuration(s)",
    isPreview,
    modePrefix
  });
  logFeatureResult({
    count: result.commandsCount,
    paths: result.commandsPaths,
    featureName: "command(s)",
    isPreview,
    modePrefix
  });
  logFeatureResult({
    count: result.subagentsCount,
    paths: result.subagentsPaths,
    featureName: "subagent(s)",
    isPreview,
    modePrefix
  });
  logFeatureResult({
    count: result.skillsCount,
    paths: result.skillsPaths,
    featureName: "skill(s)",
    isPreview,
    modePrefix
  });
  logFeatureResult({
    count: result.hooksCount,
    paths: result.hooksPaths,
    featureName: "hooks file(s)",
    isPreview,
    modePrefix
  });
  logFeatureResult({
    count: result.rulesCount,
    paths: result.rulesPaths,
    featureName: "rule(s)",
    isPreview,
    modePrefix
  });
  const totalGenerated = calculateTotalCount(result);
  if (totalGenerated === 0) {
    const enabledFeatures = features.join(", ");
    logger.info(`\u2713 All files are up to date (${enabledFeatures})`);
    return;
  }
  const parts = [];
  if (result.rulesCount > 0) parts.push(`${result.rulesCount} rules`);
  if (result.ignoreCount > 0) parts.push(`${result.ignoreCount} ignore files`);
  if (result.mcpCount > 0) parts.push(`${result.mcpCount} MCP files`);
  if (result.commandsCount > 0) parts.push(`${result.commandsCount} commands`);
  if (result.subagentsCount > 0) parts.push(`${result.subagentsCount} subagents`);
  if (result.skillsCount > 0) parts.push(`${result.skillsCount} skills`);
  if (result.hooksCount > 0) parts.push(`${result.hooksCount} hooks`);
  if (isPreview) {
    logger.info(`${modePrefix} Would write ${totalGenerated} file(s) total (${parts.join(" + ")})`);
  } else {
    logger.success(`\u{1F389} All done! Written ${totalGenerated} file(s) total (${parts.join(" + ")})`);
  }
  if (check) {
    if (result.hasDiff) {
      logger.error("\u274C Files are not up to date. Run 'rulesync generate' to update.");
      process.exit(1);
    } else {
      logger.success("\u2713 All files are up to date.");
    }
  }
}

// src/cli/commands/gitignore.ts
import { join as join2 } from "path";
var RULESYNC_HEADER = "# Generated by Rulesync";
var LEGACY_RULESYNC_HEADER = "# Generated by rulesync - AI tool configuration files";
var RULESYNC_IGNORE_ENTRIES = [
  // Rulesync curated (fetched) skills
  ".rulesync/skills/.curated/",
  // AGENTS.md
  "**/AGENTS.md",
  "**/.agents/",
  // Augment
  "**/.augmentignore",
  "**/.augment/rules/",
  "**/.augment-guidelines",
  // Claude Code
  "**/CLAUDE.md",
  "**/CLAUDE.local.md",
  "**/.claude/CLAUDE.md",
  "**/.claude/CLAUDE.local.md",
  "**/.claude/memories/",
  "**/.claude/rules/",
  "**/.claude/commands/",
  "**/.claude/agents/",
  "**/.claude/skills/",
  "**/.claude/settings.local.json",
  "**/.mcp.json",
  // Cline
  "**/.clinerules/",
  "**/.clinerules/workflows/",
  "**/.clineignore",
  "**/.cline/mcp.json",
  // Codex
  "**/.codexignore",
  "**/.codex/memories/",
  "**/.codex/skills/",
  "**/.codex/subagents/",
  // Cursor
  "**/.cursor/",
  "**/.cursorignore",
  // Factory Droid
  "**/.factory/rules/",
  "**/.factory/commands/",
  "**/.factory/droids/",
  "**/.factory/skills/",
  "**/.factory/mcp.json",
  "**/.factory/settings.json",
  // Gemini
  "**/GEMINI.md",
  "**/.gemini/memories/",
  "**/.gemini/commands/",
  "**/.gemini/subagents/",
  "**/.gemini/skills/",
  "**/.geminiignore",
  // GitHub Copilot
  "**/.github/copilot-instructions.md",
  "**/.github/instructions/",
  "**/.github/prompts/",
  "**/.github/agents/",
  "**/.github/skills/",
  "**/.vscode/mcp.json",
  // Junie
  "**/.junie/guidelines.md",
  "**/.junie/mcp.json",
  // Kilo Code
  "**/.kilocode/rules/",
  "**/.kilocode/skills/",
  "**/.kilocode/workflows/",
  "**/.kilocode/mcp.json",
  "**/.kilocodeignore",
  // Kiro
  "**/.kiro/steering/",
  "**/.kiro/prompts/",
  "**/.kiro/skills/",
  "**/.kiro/agents/",
  "**/.kiro/settings/mcp.json",
  "**/.aiignore",
  // OpenCode
  "**/.opencode/memories/",
  "**/.opencode/command/",
  "**/.opencode/agent/",
  "**/.opencode/skill/",
  "**/.opencode/plugins/",
  // Qwen
  "**/QWEN.md",
  "**/.qwen/memories/",
  // Replit
  "**/replit.md",
  // Roo
  "**/.roo/rules/",
  "**/.roo/skills/",
  "**/.rooignore",
  "**/.roo/mcp.json",
  "**/.roo/subagents/",
  // Warp
  "**/.warp/",
  "**/WARP.md",
  // Others
  ".rulesync/rules/*.local.md",
  "rulesync.local.jsonc",
  "!.rulesync/.aiignore"
];
var isRulesyncHeader = (line) => {
  const trimmed = line.trim();
  return trimmed === RULESYNC_HEADER || trimmed === LEGACY_RULESYNC_HEADER;
};
var isRulesyncEntry = (line) => {
  const trimmed = line.trim();
  if (trimmed === "" || isRulesyncHeader(line)) {
    return false;
  }
  return RULESYNC_IGNORE_ENTRIES.includes(trimmed);
};
var removeExistingRulesyncEntries = (content) => {
  const lines = content.split("\n");
  const filteredLines = [];
  let inRulesyncBlock = false;
  let consecutiveEmptyLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (isRulesyncHeader(line)) {
      inRulesyncBlock = true;
      continue;
    }
    if (inRulesyncBlock) {
      if (trimmed === "") {
        consecutiveEmptyLines++;
        if (consecutiveEmptyLines >= 2) {
          inRulesyncBlock = false;
          consecutiveEmptyLines = 0;
        }
        continue;
      }
      if (isRulesyncEntry(line)) {
        consecutiveEmptyLines = 0;
        continue;
      }
      inRulesyncBlock = false;
      consecutiveEmptyLines = 0;
    }
    if (isRulesyncEntry(line)) {
      continue;
    }
    filteredLines.push(line);
  }
  let result = filteredLines.join("\n");
  while (result.endsWith("\n\n")) {
    result = result.slice(0, -1);
  }
  return result;
};
var gitignoreCommand = async () => {
  const gitignorePath = join2(process.cwd(), ".gitignore");
  let gitignoreContent = "";
  if (await fileExists(gitignorePath)) {
    gitignoreContent = await readFileContent(gitignorePath);
  }
  const cleanedContent = removeExistingRulesyncEntries(gitignoreContent);
  const rulesyncBlock = [RULESYNC_HEADER, ...RULESYNC_IGNORE_ENTRIES].join("\n");
  const newContent = cleanedContent.trim() ? `${cleanedContent.trimEnd()}

${rulesyncBlock}
` : `${rulesyncBlock}
`;
  if (gitignoreContent === newContent) {
    logger.success(".gitignore is already up to date");
    return;
  }
  await writeFileContent(gitignorePath, newContent);
  logger.success("Updated .gitignore with rulesync entries:");
  for (const entry of RULESYNC_IGNORE_ENTRIES) {
    logger.info(`  ${entry}`);
  }
  logger.info("");
  logger.info(
    "\u{1F4A1} If you're using Google Antigravity, note that rules, workflows, and skills won't load if they're gitignored."
  );
  logger.info("   You can add the following to .git/info/exclude instead:");
  logger.info("   **/.agent/rules/");
  logger.info("   **/.agent/workflows/");
  logger.info("   **/.agent/skills/");
  logger.info("   For more details: https://github.com/dyoshikawa/rulesync/issues/981");
};

// src/cli/commands/import.ts
async function importCommand(options) {
  if (!options.targets) {
    logger.error("No tools found in --targets");
    process.exit(1);
  }
  if (options.targets.length > 1) {
    logger.error("Only one tool can be imported at a time");
    process.exit(1);
  }
  const config = await ConfigResolver.resolve(options);
  logger.configure({
    verbose: config.getVerbose(),
    silent: config.getSilent()
  });
  const tool = config.getTargets()[0];
  logger.debug(`Importing files from ${tool}...`);
  const result = await importFromTool({ config, tool });
  const totalImported = calculateTotalCount(result);
  if (totalImported === 0) {
    const enabledFeatures = config.getFeatures().join(", ");
    logger.warn(`No files imported for enabled features: ${enabledFeatures}`);
    return;
  }
  const parts = [];
  if (result.rulesCount > 0) parts.push(`${result.rulesCount} rules`);
  if (result.ignoreCount > 0) parts.push(`${result.ignoreCount} ignore files`);
  if (result.mcpCount > 0) parts.push(`${result.mcpCount} MCP files`);
  if (result.commandsCount > 0) parts.push(`${result.commandsCount} commands`);
  if (result.subagentsCount > 0) parts.push(`${result.subagentsCount} subagents`);
  if (result.skillsCount > 0) parts.push(`${result.skillsCount} skills`);
  if (result.hooksCount > 0) parts.push(`${result.hooksCount} hooks`);
  logger.success(`Imported ${totalImported} file(s) total (${parts.join(" + ")})`);
}

// src/lib/init.ts
import { join as join3 } from "path";
async function init() {
  const sampleFiles = await createSampleFiles();
  const configFile = await createConfigFile();
  return {
    configFile,
    sampleFiles
  };
}
async function createConfigFile() {
  const path2 = RULESYNC_CONFIG_RELATIVE_FILE_PATH;
  if (await fileExists(path2)) {
    return { created: false, path: path2 };
  }
  await writeFileContent(
    path2,
    JSON.stringify(
      {
        targets: ["copilot", "cursor", "claudecode", "codexcli"],
        features: ["rules", "ignore", "mcp", "commands", "subagents", "skills", "hooks"],
        baseDirs: ["."],
        delete: true,
        verbose: false,
        silent: false,
        global: false,
        simulateCommands: false,
        simulateSubagents: false,
        simulateSkills: false
      },
      null,
      2
    )
  );
  return { created: true, path: path2 };
}
async function createSampleFiles() {
  const results = [];
  const sampleRuleFile = {
    filename: RULESYNC_OVERVIEW_FILE_NAME,
    content: `---
root: true
targets: ["*"]
description: "Project overview and general development guidelines"
globs: ["**/*"]
---

# Project Overview

## General Guidelines

- Use TypeScript for all new code
- Follow consistent naming conventions
- Write self-documenting code with clear variable and function names
- Prefer composition over inheritance
- Use meaningful comments for complex business logic

## Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Use trailing commas in multi-line objects and arrays

## Architecture Principles

- Organize code by feature, not by file type
- Keep related files close together
- Use dependency injection for better testability
- Implement proper error handling
- Follow single responsibility principle
`
  };
  const sampleMcpFile = {
    filename: "mcp.json",
    content: `{
  "mcpServers": {
    "serena": {
      "type": "stdio",
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--context",
        "ide-assistant",
        "--enable-web-dashboard",
        "false",
        "--project",
        "."
      ],
      "env": {}
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp"
      ],
      "env": {}
    }
  }
}
`
  };
  const sampleCommandFile = {
    filename: "review-pr.md",
    content: `---
description: 'Review a pull request'
targets: ["*"]
---

target_pr = $ARGUMENTS

If target_pr is not provided, use the PR of the current branch.

Execute the following in parallel:

1. Check code quality and style consistency
2. Review test coverage
3. Verify documentation updates
4. Check for potential bugs or security issues

Then provide a summary of findings and suggestions for improvement.
`
  };
  const sampleSubagentFile = {
    filename: "planner.md",
    content: `---
name: planner
targets: ["*"]
description: >-
  This is the general-purpose planner. The user asks the agent to plan to
  suggest a specification, implement a new feature, refactor the codebase, or
  fix a bug. This agent can be called by the user explicitly only.
claudecode:
  model: inherit
---

You are the planner for any tasks.

Based on the user's instruction, create a plan while analyzing the related files. Then, report the plan in detail. You can output files to @tmp/ if needed.

Attention, again, you are just the planner, so though you can read any files and run any commands for analysis, please don't write any code.
`
  };
  const sampleSkillFile = {
    dirName: "project-context",
    content: `---
name: project-context
description: "Summarize the project context and key constraints"
targets: ["*"]
---

Summarize the project goals, core constraints, and relevant dependencies.
Call out any architecture decisions, shared conventions, and validation steps.
Keep the summary concise and ready to reuse in future tasks.`
  };
  const sampleIgnoreFile = {
    content: `credentials/
`
  };
  const sampleHooksFile = {
    content: `{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "matcher": "Write|Edit",
        "command": ".rulesync/hooks/format.sh"
      }
    ]
  }
}
`
  };
  const rulePaths = RulesyncRule.getSettablePaths();
  const mcpPaths = RulesyncMcp.getSettablePaths();
  const commandPaths = RulesyncCommand.getSettablePaths();
  const subagentPaths = RulesyncSubagent.getSettablePaths();
  const skillPaths = RulesyncSkill.getSettablePaths();
  const ignorePaths = RulesyncIgnore.getSettablePaths();
  const hooksPaths = RulesyncHooks.getSettablePaths();
  await ensureDir(rulePaths.recommended.relativeDirPath);
  await ensureDir(mcpPaths.recommended.relativeDirPath);
  await ensureDir(commandPaths.relativeDirPath);
  await ensureDir(subagentPaths.relativeDirPath);
  await ensureDir(skillPaths.relativeDirPath);
  await ensureDir(ignorePaths.recommended.relativeDirPath);
  const ruleFilepath = join3(rulePaths.recommended.relativeDirPath, sampleRuleFile.filename);
  results.push(await writeIfNotExists(ruleFilepath, sampleRuleFile.content));
  const mcpFilepath = join3(
    mcpPaths.recommended.relativeDirPath,
    mcpPaths.recommended.relativeFilePath
  );
  results.push(await writeIfNotExists(mcpFilepath, sampleMcpFile.content));
  const commandFilepath = join3(commandPaths.relativeDirPath, sampleCommandFile.filename);
  results.push(await writeIfNotExists(commandFilepath, sampleCommandFile.content));
  const subagentFilepath = join3(subagentPaths.relativeDirPath, sampleSubagentFile.filename);
  results.push(await writeIfNotExists(subagentFilepath, sampleSubagentFile.content));
  const skillDirPath = join3(skillPaths.relativeDirPath, sampleSkillFile.dirName);
  await ensureDir(skillDirPath);
  const skillFilepath = join3(skillDirPath, SKILL_FILE_NAME);
  results.push(await writeIfNotExists(skillFilepath, sampleSkillFile.content));
  const ignoreFilepath = join3(
    ignorePaths.recommended.relativeDirPath,
    ignorePaths.recommended.relativeFilePath
  );
  results.push(await writeIfNotExists(ignoreFilepath, sampleIgnoreFile.content));
  const hooksFilepath = join3(hooksPaths.relativeDirPath, hooksPaths.relativeFilePath);
  results.push(await writeIfNotExists(hooksFilepath, sampleHooksFile.content));
  return results;
}
async function writeIfNotExists(path2, content) {
  if (await fileExists(path2)) {
    return { created: false, path: path2 };
  }
  await writeFileContent(path2, content);
  return { created: true, path: path2 };
}

// src/cli/commands/init.ts
async function initCommand() {
  logger.debug("Initializing rulesync...");
  await ensureDir(RULESYNC_RELATIVE_DIR_PATH);
  const result = await init();
  for (const file of result.sampleFiles) {
    if (file.created) {
      logger.success(`Created ${file.path}`);
    } else {
      logger.info(`Skipped ${file.path} (already exists)`);
    }
  }
  if (result.configFile.created) {
    logger.success(`Created ${result.configFile.path}`);
  } else {
    logger.info(`Skipped ${result.configFile.path} (already exists)`);
  }
  logger.success("rulesync initialized successfully!");
  logger.info("Next steps:");
  logger.info(
    `1. Edit ${RULESYNC_RELATIVE_DIR_PATH}/**/*.md, ${RULESYNC_RELATIVE_DIR_PATH}/skills/*/${SKILL_FILE_NAME}, ${RULESYNC_MCP_RELATIVE_FILE_PATH}, ${RULESYNC_HOOKS_RELATIVE_FILE_PATH} and ${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH}`
  );
  logger.info("2. Run 'rulesync generate' to create configuration files");
}

// src/lib/sources.ts
import { Semaphore as Semaphore2 } from "es-toolkit/promise";
import { join as join5, resolve, sep } from "path";

// src/lib/sources-lock.ts
import { createHash } from "crypto";
import { join as join4 } from "path";
import { optional, z as z4 } from "zod/mini";
var LOCKFILE_VERSION = 1;
var LockedSkillSchema = z4.object({
  integrity: z4.string()
});
var LockedSourceSchema = z4.object({
  requestedRef: optional(z4.string()),
  resolvedRef: z4.string(),
  resolvedAt: optional(z4.string()),
  skills: z4.record(z4.string(), LockedSkillSchema)
});
var SourcesLockSchema = z4.object({
  lockfileVersion: z4.number(),
  sources: z4.record(z4.string(), LockedSourceSchema)
});
var LegacyLockedSourceSchema = z4.object({
  resolvedRef: z4.string(),
  skills: z4.array(z4.string())
});
var LegacySourcesLockSchema = z4.object({
  sources: z4.record(z4.string(), LegacyLockedSourceSchema)
});
function migrateLegacyLock(legacy) {
  const sources = {};
  for (const [key, entry] of Object.entries(legacy.sources)) {
    const skills = {};
    for (const name of entry.skills) {
      skills[name] = { integrity: "" };
    }
    sources[key] = {
      resolvedRef: entry.resolvedRef,
      skills
    };
  }
  logger.info(
    "Migrated legacy sources lockfile to version 1. Run 'rulesync install --update' to populate integrity hashes."
  );
  return { lockfileVersion: LOCKFILE_VERSION, sources };
}
function createEmptyLock() {
  return { lockfileVersion: LOCKFILE_VERSION, sources: {} };
}
async function readLockFile(params) {
  const lockPath = join4(params.baseDir, RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH);
  if (!await fileExists(lockPath)) {
    logger.debug("No sources lockfile found, starting fresh.");
    return createEmptyLock();
  }
  try {
    const content = await readFileContent(lockPath);
    const data = JSON.parse(content);
    const result = SourcesLockSchema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    const legacyResult = LegacySourcesLockSchema.safeParse(data);
    if (legacyResult.success) {
      return migrateLegacyLock(legacyResult.data);
    }
    logger.warn(
      `Invalid sources lockfile format (${RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH}). Starting fresh.`
    );
    return createEmptyLock();
  } catch {
    logger.warn(
      `Failed to read sources lockfile (${RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH}). Starting fresh.`
    );
    return createEmptyLock();
  }
}
async function writeLockFile(params) {
  const lockPath = join4(params.baseDir, RULESYNC_SOURCES_LOCK_RELATIVE_FILE_PATH);
  const content = JSON.stringify(params.lock, null, 2) + "\n";
  await writeFileContent(lockPath, content);
  logger.debug(`Wrote sources lockfile to ${lockPath}`);
}
function computeSkillIntegrity(files) {
  const hash = createHash("sha256");
  const sorted = files.toSorted((a, b) => a.path.localeCompare(b.path));
  for (const file of sorted) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return `sha256-${hash.digest("hex")}`;
}
function normalizeSourceKey(source) {
  let key = source;
  for (const prefix of [
    "https://www.github.com/",
    "https://github.com/",
    "http://www.github.com/",
    "http://github.com/"
  ]) {
    if (key.toLowerCase().startsWith(prefix)) {
      key = key.substring(prefix.length);
      break;
    }
  }
  if (key.startsWith("github:")) {
    key = key.substring("github:".length);
  }
  key = key.replace(/\/+$/, "");
  key = key.replace(/\.git$/, "");
  key = key.toLowerCase();
  return key;
}
function getLockedSource(lock, sourceKey) {
  const normalized = normalizeSourceKey(sourceKey);
  for (const [key, value] of Object.entries(lock.sources)) {
    if (normalizeSourceKey(key) === normalized) {
      return value;
    }
  }
  return void 0;
}
function setLockedSource(lock, sourceKey, entry) {
  const normalized = normalizeSourceKey(sourceKey);
  const filteredSources = {};
  for (const [key, value] of Object.entries(lock.sources)) {
    if (normalizeSourceKey(key) !== normalized) {
      filteredSources[key] = value;
    }
  }
  return {
    lockfileVersion: lock.lockfileVersion,
    sources: {
      ...filteredSources,
      [normalized]: entry
    }
  };
}
function getLockedSkillNames(entry) {
  return Object.keys(entry.skills);
}

// src/lib/sources.ts
async function resolveAndFetchSources(params) {
  const { sources, baseDir, options = {} } = params;
  if (sources.length === 0) {
    return { fetchedSkillCount: 0, sourcesProcessed: 0 };
  }
  if (options.skipSources) {
    logger.info("Skipping source fetching.");
    return { fetchedSkillCount: 0, sourcesProcessed: 0 };
  }
  let lock = options.updateSources ? createEmptyLock() : await readLockFile({ baseDir });
  if (options.frozen) {
    const missingKeys = [];
    for (const source of sources) {
      const locked = getLockedSource(lock, source.source);
      if (!locked) {
        missingKeys.push(source.source);
      }
    }
    if (missingKeys.length > 0) {
      throw new Error(
        `Frozen install failed: lockfile is missing entries for: ${missingKeys.join(", ")}. Run 'rulesync install' to update the lockfile.`
      );
    }
  }
  const originalLockJson = JSON.stringify(lock);
  const token = GitHubClient.resolveToken(options.token);
  const client = new GitHubClient({ token });
  const localSkillNames = await getLocalSkillDirNames(baseDir);
  let totalSkillCount = 0;
  const allFetchedSkillNames = /* @__PURE__ */ new Set();
  for (const sourceEntry of sources) {
    try {
      const { skillCount, fetchedSkillNames, updatedLock } = await fetchSource({
        sourceEntry,
        client,
        baseDir,
        lock,
        localSkillNames,
        alreadyFetchedSkillNames: allFetchedSkillNames,
        updateSources: options.updateSources ?? false
      });
      lock = updatedLock;
      totalSkillCount += skillCount;
      for (const name of fetchedSkillNames) {
        allFetchedSkillNames.add(name);
      }
    } catch (error) {
      if (error instanceof GitHubClientError) {
        logGitHubAuthHints(error);
      } else {
        logger.error(`Failed to fetch source "${sourceEntry.source}": ${formatError(error)}`);
      }
    }
  }
  const sourceKeys = new Set(sources.map((s) => normalizeSourceKey(s.source)));
  const prunedSources = {};
  for (const [key, value] of Object.entries(lock.sources)) {
    if (sourceKeys.has(normalizeSourceKey(key))) {
      prunedSources[key] = value;
    } else {
      logger.debug(`Pruned stale lockfile entry: ${key}`);
    }
  }
  lock = { lockfileVersion: lock.lockfileVersion, sources: prunedSources };
  if (!options.frozen && JSON.stringify(lock) !== originalLockJson) {
    await writeLockFile({ baseDir, lock });
  } else {
    logger.debug("Lockfile unchanged, skipping write.");
  }
  return { fetchedSkillCount: totalSkillCount, sourcesProcessed: sources.length };
}
async function checkLockedSkillsExist(curatedDir, skillNames) {
  if (skillNames.length === 0) return true;
  for (const name of skillNames) {
    if (!await directoryExists(join5(curatedDir, name))) {
      return false;
    }
  }
  return true;
}
async function fetchSource(params) {
  const { sourceEntry, client, baseDir, localSkillNames, alreadyFetchedSkillNames, updateSources } = params;
  let { lock } = params;
  const parsed = parseSource(sourceEntry.source);
  if (parsed.provider === "gitlab") {
    throw new Error("GitLab sources are not yet supported.");
  }
  const sourceKey = sourceEntry.source;
  const locked = getLockedSource(lock, sourceKey);
  const lockedSkillNames = locked ? getLockedSkillNames(locked) : [];
  let ref;
  let resolvedSha;
  let requestedRef;
  if (locked && !updateSources) {
    ref = locked.resolvedRef;
    resolvedSha = locked.resolvedRef;
    requestedRef = locked.requestedRef;
    logger.debug(`Using locked ref for ${sourceKey}: ${resolvedSha}`);
  } else {
    requestedRef = parsed.ref ?? await client.getDefaultBranch(parsed.owner, parsed.repo);
    resolvedSha = await client.resolveRefToSha(parsed.owner, parsed.repo, requestedRef);
    ref = resolvedSha;
    logger.debug(`Resolved ${sourceKey} ref "${requestedRef}" to SHA: ${resolvedSha}`);
  }
  const curatedDir = join5(baseDir, RULESYNC_CURATED_SKILLS_RELATIVE_DIR_PATH);
  if (locked && resolvedSha === locked.resolvedRef && !updateSources) {
    const allExist = await checkLockedSkillsExist(curatedDir, lockedSkillNames);
    if (allExist) {
      logger.debug(`SHA unchanged for ${sourceKey}, skipping re-fetch.`);
      return {
        skillCount: 0,
        fetchedSkillNames: lockedSkillNames,
        updatedLock: lock
      };
    }
  }
  const skillFilter = sourceEntry.skills ?? ["*"];
  const isWildcard = skillFilter.length === 1 && skillFilter[0] === "*";
  const skillsBasePath = parsed.path ?? "skills";
  let remoteSkillDirs;
  try {
    const entries = await client.listDirectory(parsed.owner, parsed.repo, skillsBasePath, ref);
    remoteSkillDirs = entries.filter((e) => e.type === "dir").map((e) => ({ name: e.name, path: e.path }));
  } catch (error) {
    if (error instanceof GitHubClientError && error.statusCode === 404) {
      logger.warn(`No skills/ directory found in ${sourceKey}. Skipping.`);
      return { skillCount: 0, fetchedSkillNames: [], updatedLock: lock };
    }
    throw error;
  }
  const filteredDirs = isWildcard ? remoteSkillDirs : remoteSkillDirs.filter((d) => skillFilter.includes(d.name));
  const semaphore = new Semaphore2(FETCH_CONCURRENCY_LIMIT);
  const fetchedSkills = {};
  if (locked) {
    const resolvedCuratedDir = resolve(curatedDir);
    for (const prevSkill of lockedSkillNames) {
      const prevDir = join5(curatedDir, prevSkill);
      if (!resolve(prevDir).startsWith(resolvedCuratedDir + sep)) {
        logger.warn(
          `Skipping removal of "${prevSkill}": resolved path is outside the curated directory.`
        );
        continue;
      }
      if (await directoryExists(prevDir)) {
        await removeDirectory(prevDir);
      }
    }
  }
  for (const skillDir of filteredDirs) {
    if (skillDir.name.includes("..") || skillDir.name.includes("/") || skillDir.name.includes("\\")) {
      logger.warn(
        `Skipping skill with invalid name "${skillDir.name}" from ${sourceKey}: contains path traversal characters.`
      );
      continue;
    }
    if (localSkillNames.has(skillDir.name)) {
      logger.debug(
        `Skipping remote skill "${skillDir.name}" from ${sourceKey}: local skill takes precedence.`
      );
      continue;
    }
    if (alreadyFetchedSkillNames.has(skillDir.name)) {
      logger.warn(
        `Skipping duplicate skill "${skillDir.name}" from ${sourceKey}: already fetched from another source.`
      );
      continue;
    }
    const allFiles = await listDirectoryRecursive({
      client,
      owner: parsed.owner,
      repo: parsed.repo,
      path: skillDir.path,
      ref,
      semaphore
    });
    const files = allFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        logger.warn(
          `Skipping file "${file.path}" (${(file.size / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit).`
        );
        return false;
      }
      return true;
    });
    const skillFiles = [];
    for (const file of files) {
      const relativeToSkill = file.path.substring(skillDir.path.length + 1);
      const localFilePath = join5(curatedDir, skillDir.name, relativeToSkill);
      checkPathTraversal({
        relativePath: relativeToSkill,
        intendedRootDir: join5(curatedDir, skillDir.name)
      });
      const content = await withSemaphore(
        semaphore,
        () => client.getFileContent(parsed.owner, parsed.repo, file.path, ref)
      );
      await writeFileContent(localFilePath, content);
      skillFiles.push({ path: relativeToSkill, content });
    }
    const integrity = computeSkillIntegrity(skillFiles);
    const lockedSkillEntry = locked?.skills[skillDir.name];
    if (lockedSkillEntry && lockedSkillEntry.integrity && lockedSkillEntry.integrity !== integrity && resolvedSha === locked?.resolvedRef) {
      logger.warn(
        `Integrity mismatch for skill "${skillDir.name}" from ${sourceKey}: expected "${lockedSkillEntry.integrity}", got "${integrity}". Content may have been tampered with.`
      );
    }
    fetchedSkills[skillDir.name] = { integrity };
    logger.debug(`Fetched skill "${skillDir.name}" from ${sourceKey}`);
  }
  const fetchedNames = Object.keys(fetchedSkills);
  const mergedSkills = { ...fetchedSkills };
  if (locked) {
    for (const [skillName, skillEntry] of Object.entries(locked.skills)) {
      if (!(skillName in mergedSkills)) {
        mergedSkills[skillName] = skillEntry;
      }
    }
  }
  lock = setLockedSource(lock, sourceKey, {
    requestedRef,
    resolvedRef: resolvedSha,
    resolvedAt: (/* @__PURE__ */ new Date()).toISOString(),
    skills: mergedSkills
  });
  logger.info(
    `Fetched ${fetchedNames.length} skill(s) from ${sourceKey}: ${fetchedNames.join(", ") || "(none)"}`
  );
  return {
    skillCount: fetchedNames.length,
    fetchedSkillNames: fetchedNames,
    updatedLock: lock
  };
}

// src/cli/commands/install.ts
async function installCommand(options) {
  logger.configure({
    verbose: options.verbose ?? false,
    silent: options.silent ?? false
  });
  const config = await ConfigResolver.resolve({
    configPath: options.configPath,
    verbose: options.verbose,
    silent: options.silent
  });
  const sources = config.getSources();
  if (sources.length === 0) {
    logger.warn("No sources defined in configuration. Nothing to install.");
    return;
  }
  logger.debug(`Installing skills from ${sources.length} source(s)...`);
  const result = await resolveAndFetchSources({
    sources,
    baseDir: process.cwd(),
    options: {
      updateSources: options.update,
      frozen: options.frozen,
      token: options.token
    }
  });
  if (result.fetchedSkillCount > 0) {
    logger.success(
      `Installed ${result.fetchedSkillCount} skill(s) from ${result.sourcesProcessed} source(s).`
    );
  } else {
    logger.success(`All skills up to date (${result.sourcesProcessed} source(s) checked).`);
  }
}

// src/cli/commands/mcp.ts
import { FastMCP } from "fastmcp";

// src/mcp/tools.ts
import { z as z13 } from "zod/mini";

// src/mcp/commands.ts
import { basename, join as join6 } from "path";
import { z as z5 } from "zod/mini";
var maxCommandSizeBytes = 1024 * 1024;
var maxCommandsCount = 1e3;
async function listCommands() {
  const commandsDir = join6(process.cwd(), RULESYNC_COMMANDS_RELATIVE_DIR_PATH);
  try {
    const files = await listDirectoryFiles(commandsDir);
    const mdFiles = files.filter((file) => file.endsWith(".md"));
    const commands = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const command = await RulesyncCommand.fromFile({
            relativeFilePath: file
          });
          const frontmatter = command.getFrontmatter();
          return {
            relativePathFromCwd: join6(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, file),
            frontmatter
          };
        } catch (error) {
          logger.error(`Failed to read command file ${file}: ${formatError(error)}`);
          return null;
        }
      })
    );
    return commands.filter((command) => command !== null);
  } catch (error) {
    logger.error(
      `Failed to read commands directory (${RULESYNC_COMMANDS_RELATIVE_DIR_PATH}): ${formatError(error)}`
    );
    return [];
  }
}
async function getCommand({ relativePathFromCwd }) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename(relativePathFromCwd);
  try {
    const command = await RulesyncCommand.fromFile({
      relativeFilePath: filename
    });
    return {
      relativePathFromCwd: join6(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, filename),
      frontmatter: command.getFrontmatter(),
      body: command.getBody()
    };
  } catch (error) {
    throw new Error(`Failed to read command file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
async function putCommand({
  relativePathFromCwd,
  frontmatter,
  body
}) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename(relativePathFromCwd);
  const estimatedSize = JSON.stringify(frontmatter).length + body.length;
  if (estimatedSize > maxCommandSizeBytes) {
    throw new Error(
      `Command size ${estimatedSize} bytes exceeds maximum ${maxCommandSizeBytes} bytes (1MB) for ${relativePathFromCwd}`
    );
  }
  try {
    const existingCommands = await listCommands();
    const isUpdate = existingCommands.some(
      (command2) => command2.relativePathFromCwd === join6(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, filename)
    );
    if (!isUpdate && existingCommands.length >= maxCommandsCount) {
      throw new Error(
        `Maximum number of commands (${maxCommandsCount}) reached in ${RULESYNC_COMMANDS_RELATIVE_DIR_PATH}`
      );
    }
    const fileContent = stringifyFrontmatter(body, frontmatter);
    const command = new RulesyncCommand({
      baseDir: process.cwd(),
      relativeDirPath: RULESYNC_COMMANDS_RELATIVE_DIR_PATH,
      relativeFilePath: filename,
      frontmatter,
      body,
      fileContent,
      validate: true
    });
    const commandsDir = join6(process.cwd(), RULESYNC_COMMANDS_RELATIVE_DIR_PATH);
    await ensureDir(commandsDir);
    await writeFileContent(command.getFilePath(), command.getFileContent());
    return {
      relativePathFromCwd: join6(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, filename),
      frontmatter: command.getFrontmatter(),
      body: command.getBody()
    };
  } catch (error) {
    throw new Error(`Failed to write command file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
async function deleteCommand({ relativePathFromCwd }) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename(relativePathFromCwd);
  const fullPath = join6(process.cwd(), RULESYNC_COMMANDS_RELATIVE_DIR_PATH, filename);
  try {
    await removeFile(fullPath);
    return {
      relativePathFromCwd: join6(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, filename)
    };
  } catch (error) {
    throw new Error(`Failed to delete command file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
var commandToolSchemas = {
  listCommands: z5.object({}),
  getCommand: z5.object({
    relativePathFromCwd: z5.string()
  }),
  putCommand: z5.object({
    relativePathFromCwd: z5.string(),
    frontmatter: RulesyncCommandFrontmatterSchema,
    body: z5.string()
  }),
  deleteCommand: z5.object({
    relativePathFromCwd: z5.string()
  })
};
var commandTools = {
  listCommands: {
    name: "listCommands",
    description: `List all commands from ${join6(RULESYNC_COMMANDS_RELATIVE_DIR_PATH, "*.md")} with their frontmatter.`,
    parameters: commandToolSchemas.listCommands,
    execute: async () => {
      const commands = await listCommands();
      const output = { commands };
      return JSON.stringify(output, null, 2);
    }
  },
  getCommand: {
    name: "getCommand",
    description: "Get detailed information about a specific command. relativePathFromCwd parameter is required.",
    parameters: commandToolSchemas.getCommand,
    execute: async (args) => {
      const result = await getCommand({ relativePathFromCwd: args.relativePathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  },
  putCommand: {
    name: "putCommand",
    description: "Create or update a command (upsert operation). relativePathFromCwd, frontmatter, and body parameters are required.",
    parameters: commandToolSchemas.putCommand,
    execute: async (args) => {
      const result = await putCommand({
        relativePathFromCwd: args.relativePathFromCwd,
        frontmatter: args.frontmatter,
        body: args.body
      });
      return JSON.stringify(result, null, 2);
    }
  },
  deleteCommand: {
    name: "deleteCommand",
    description: "Delete a command file. relativePathFromCwd parameter is required.",
    parameters: commandToolSchemas.deleteCommand,
    execute: async (args) => {
      const result = await deleteCommand({ relativePathFromCwd: args.relativePathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/generate.ts
import { z as z6 } from "zod/mini";
var generateOptionsSchema = z6.object({
  targets: z6.optional(z6.array(z6.string())),
  features: z6.optional(z6.array(z6.string())),
  delete: z6.optional(z6.boolean()),
  global: z6.optional(z6.boolean()),
  simulateCommands: z6.optional(z6.boolean()),
  simulateSubagents: z6.optional(z6.boolean()),
  simulateSkills: z6.optional(z6.boolean())
});
async function executeGenerate(options = {}) {
  try {
    const exists = await checkRulesyncDirExists({ baseDir: process.cwd() });
    if (!exists) {
      return {
        success: false,
        error: ".rulesync directory does not exist. Please run 'rulesync init' first or create the directory manually."
      };
    }
    const config = await ConfigResolver.resolve({
      // eslint-disable-next-line no-type-assertion/no-type-assertion
      targets: options.targets,
      // eslint-disable-next-line no-type-assertion/no-type-assertion
      features: options.features,
      delete: options.delete,
      global: options.global,
      simulateCommands: options.simulateCommands,
      simulateSubagents: options.simulateSubagents,
      simulateSkills: options.simulateSkills,
      // Always use default baseDirs (process.cwd()) and configPath
      // verbose and silent are meaningless in MCP context
      verbose: false,
      silent: true
    });
    const generateResult = await generate({ config });
    return buildSuccessResponse({ generateResult, config });
  } catch (error) {
    return {
      success: false,
      error: formatError(error)
    };
  }
}
function buildSuccessResponse(params) {
  const { generateResult, config } = params;
  const totalCount = calculateTotalCount(generateResult);
  return {
    success: true,
    result: {
      rulesCount: generateResult.rulesCount,
      ignoreCount: generateResult.ignoreCount,
      mcpCount: generateResult.mcpCount,
      commandsCount: generateResult.commandsCount,
      subagentsCount: generateResult.subagentsCount,
      skillsCount: generateResult.skillsCount,
      hooksCount: generateResult.hooksCount,
      totalCount
    },
    config: {
      targets: config.getTargets(),
      features: config.getFeatures(),
      global: config.getGlobal(),
      delete: config.getDelete(),
      simulateCommands: config.getSimulateCommands(),
      simulateSubagents: config.getSimulateSubagents(),
      simulateSkills: config.getSimulateSkills()
    }
  };
}
var generateToolSchemas = {
  executeGenerate: generateOptionsSchema
};
var generateTools = {
  executeGenerate: {
    name: "executeGenerate",
    description: "Execute the rulesync generate command to create output files for AI tools. Uses rulesync.jsonc settings by default, but options can override them.",
    parameters: generateToolSchemas.executeGenerate,
    execute: async (options = {}) => {
      const result = await executeGenerate(options);
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/ignore.ts
import { join as join7 } from "path";
import { z as z7 } from "zod/mini";
var maxIgnoreFileSizeBytes = 100 * 1024;
async function getIgnoreFile() {
  const ignoreFilePath = join7(process.cwd(), RULESYNC_AIIGNORE_RELATIVE_FILE_PATH);
  try {
    const content = await readFileContent(ignoreFilePath);
    return {
      relativePathFromCwd: RULESYNC_AIIGNORE_RELATIVE_FILE_PATH,
      content
    };
  } catch (error) {
    throw new Error(
      `Failed to read ignore file (${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
async function putIgnoreFile({ content }) {
  const ignoreFilePath = join7(process.cwd(), RULESYNC_AIIGNORE_RELATIVE_FILE_PATH);
  const contentSizeBytes = Buffer.byteLength(content, "utf8");
  if (contentSizeBytes > maxIgnoreFileSizeBytes) {
    throw new Error(
      `Ignore file size ${contentSizeBytes} bytes exceeds maximum ${maxIgnoreFileSizeBytes} bytes (100KB) for ${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH}`
    );
  }
  try {
    await ensureDir(process.cwd());
    await writeFileContent(ignoreFilePath, content);
    return {
      relativePathFromCwd: RULESYNC_AIIGNORE_RELATIVE_FILE_PATH,
      content
    };
  } catch (error) {
    throw new Error(
      `Failed to write ignore file (${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
async function deleteIgnoreFile() {
  const aiignorePath = join7(process.cwd(), RULESYNC_AIIGNORE_RELATIVE_FILE_PATH);
  const legacyIgnorePath = join7(process.cwd(), RULESYNC_IGNORE_RELATIVE_FILE_PATH);
  try {
    await Promise.all([removeFile(aiignorePath), removeFile(legacyIgnorePath)]);
    return {
      // Keep the historical return shape — point to the recommended file path
      // for backward compatibility.
      relativePathFromCwd: RULESYNC_AIIGNORE_RELATIVE_FILE_PATH
    };
  } catch (error) {
    throw new Error(
      `Failed to delete ignore files (${RULESYNC_AIIGNORE_RELATIVE_FILE_PATH}, ${RULESYNC_IGNORE_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
var ignoreToolSchemas = {
  getIgnoreFile: z7.object({}),
  putIgnoreFile: z7.object({
    content: z7.string()
  }),
  deleteIgnoreFile: z7.object({})
};
var ignoreTools = {
  getIgnoreFile: {
    name: "getIgnoreFile",
    description: "Get the content of the .rulesyncignore file from the project root.",
    parameters: ignoreToolSchemas.getIgnoreFile,
    execute: async () => {
      const result = await getIgnoreFile();
      return JSON.stringify(result, null, 2);
    }
  },
  putIgnoreFile: {
    name: "putIgnoreFile",
    description: "Create or update the .rulesync/.aiignore file (upsert operation). content parameter is required.",
    parameters: ignoreToolSchemas.putIgnoreFile,
    execute: async (args) => {
      const result = await putIgnoreFile({ content: args.content });
      return JSON.stringify(result, null, 2);
    }
  },
  deleteIgnoreFile: {
    name: "deleteIgnoreFile",
    description: "Delete the .rulesyncignore and .rulesync/.aiignore files.",
    parameters: ignoreToolSchemas.deleteIgnoreFile,
    execute: async () => {
      const result = await deleteIgnoreFile();
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/import.ts
import { z as z8 } from "zod/mini";
var importOptionsSchema = z8.object({
  target: z8.string(),
  features: z8.optional(z8.array(z8.string())),
  global: z8.optional(z8.boolean())
});
async function executeImport(options) {
  try {
    if (!options.target) {
      return {
        success: false,
        error: "target is required. Please specify a tool to import from."
      };
    }
    const config = await ConfigResolver.resolve({
      // eslint-disable-next-line no-type-assertion/no-type-assertion
      targets: [options.target],
      // eslint-disable-next-line no-type-assertion/no-type-assertion
      features: options.features,
      global: options.global,
      // Always use default baseDirs (process.cwd()) and configPath
      // verbose and silent are meaningless in MCP context
      verbose: false,
      silent: true
    });
    const tool = config.getTargets()[0];
    const importResult = await importFromTool({ config, tool });
    return buildSuccessResponse2({ importResult, config, tool });
  } catch (error) {
    return {
      success: false,
      error: formatError(error)
    };
  }
}
function buildSuccessResponse2(params) {
  const { importResult, config, tool } = params;
  const totalCount = calculateTotalCount(importResult);
  return {
    success: true,
    result: {
      rulesCount: importResult.rulesCount,
      ignoreCount: importResult.ignoreCount,
      mcpCount: importResult.mcpCount,
      commandsCount: importResult.commandsCount,
      subagentsCount: importResult.subagentsCount,
      skillsCount: importResult.skillsCount,
      hooksCount: importResult.hooksCount,
      totalCount
    },
    config: {
      target: tool,
      features: config.getFeatures(),
      global: config.getGlobal()
    }
  };
}
var importToolSchemas = {
  executeImport: importOptionsSchema
};
var importTools = {
  executeImport: {
    name: "executeImport",
    description: "Execute the rulesync import command to import configuration files from an AI tool into .rulesync directory. Requires exactly one target tool to import from.",
    parameters: importToolSchemas.executeImport,
    execute: async (options) => {
      const result = await executeImport(options);
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/mcp.ts
import { join as join8 } from "path";
import { z as z9 } from "zod/mini";
var maxMcpSizeBytes = 1024 * 1024;
async function getMcpFile() {
  try {
    const rulesyncMcp = await RulesyncMcp.fromFile({
      validate: true
    });
    const relativePathFromCwd = join8(
      rulesyncMcp.getRelativeDirPath(),
      rulesyncMcp.getRelativeFilePath()
    );
    return {
      relativePathFromCwd,
      content: rulesyncMcp.getFileContent()
    };
  } catch (error) {
    throw new Error(
      `Failed to read MCP file (${RULESYNC_MCP_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
async function putMcpFile({ content }) {
  if (content.length > maxMcpSizeBytes) {
    throw new Error(
      `MCP file size ${content.length} bytes exceeds maximum ${maxMcpSizeBytes} bytes (1MB) for ${RULESYNC_MCP_RELATIVE_FILE_PATH}`
    );
  }
  try {
    JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Invalid JSON format in MCP file (${RULESYNC_MCP_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
  try {
    const baseDir = process.cwd();
    const paths = RulesyncMcp.getSettablePaths();
    const relativeDirPath = paths.recommended.relativeDirPath;
    const relativeFilePath = paths.recommended.relativeFilePath;
    const fullPath = join8(baseDir, relativeDirPath, relativeFilePath);
    const rulesyncMcp = new RulesyncMcp({
      baseDir,
      relativeDirPath,
      relativeFilePath,
      fileContent: content,
      validate: true
    });
    await ensureDir(join8(baseDir, relativeDirPath));
    await writeFileContent(fullPath, content);
    const relativePathFromCwd = join8(relativeDirPath, relativeFilePath);
    return {
      relativePathFromCwd,
      content: rulesyncMcp.getFileContent()
    };
  } catch (error) {
    throw new Error(
      `Failed to write MCP file (${RULESYNC_MCP_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
async function deleteMcpFile() {
  try {
    const baseDir = process.cwd();
    const paths = RulesyncMcp.getSettablePaths();
    const recommendedPath = join8(
      baseDir,
      paths.recommended.relativeDirPath,
      paths.recommended.relativeFilePath
    );
    const legacyPath = join8(baseDir, paths.legacy.relativeDirPath, paths.legacy.relativeFilePath);
    await removeFile(recommendedPath);
    await removeFile(legacyPath);
    const relativePathFromCwd = join8(
      paths.recommended.relativeDirPath,
      paths.recommended.relativeFilePath
    );
    return {
      relativePathFromCwd
    };
  } catch (error) {
    throw new Error(
      `Failed to delete MCP file (${RULESYNC_MCP_RELATIVE_FILE_PATH}): ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
var mcpToolSchemas = {
  getMcpFile: z9.object({}),
  putMcpFile: z9.object({
    content: z9.string()
  }),
  deleteMcpFile: z9.object({})
};
var mcpTools = {
  getMcpFile: {
    name: "getMcpFile",
    description: `Get the MCP configuration file (${RULESYNC_MCP_RELATIVE_FILE_PATH}).`,
    parameters: mcpToolSchemas.getMcpFile,
    execute: async () => {
      const result = await getMcpFile();
      return JSON.stringify(result, null, 2);
    }
  },
  putMcpFile: {
    name: "putMcpFile",
    description: "Create or update the MCP configuration file (upsert operation). content parameter is required and must be valid JSON.",
    parameters: mcpToolSchemas.putMcpFile,
    execute: async (args) => {
      const result = await putMcpFile({ content: args.content });
      return JSON.stringify(result, null, 2);
    }
  },
  deleteMcpFile: {
    name: "deleteMcpFile",
    description: "Delete the MCP configuration file.",
    parameters: mcpToolSchemas.deleteMcpFile,
    execute: async () => {
      const result = await deleteMcpFile();
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/rules.ts
import { basename as basename2, join as join9 } from "path";
import { z as z10 } from "zod/mini";
var maxRuleSizeBytes = 1024 * 1024;
var maxRulesCount = 1e3;
async function listRules() {
  const rulesDir = join9(process.cwd(), RULESYNC_RULES_RELATIVE_DIR_PATH);
  try {
    const files = await listDirectoryFiles(rulesDir);
    const mdFiles = files.filter((file) => file.endsWith(".md"));
    const rules = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const rule = await RulesyncRule.fromFile({
            relativeFilePath: file,
            validate: true
          });
          const frontmatter = rule.getFrontmatter();
          return {
            relativePathFromCwd: join9(RULESYNC_RULES_RELATIVE_DIR_PATH, file),
            frontmatter
          };
        } catch (error) {
          logger.error(`Failed to read rule file ${file}: ${formatError(error)}`);
          return null;
        }
      })
    );
    return rules.filter((rule) => rule !== null);
  } catch (error) {
    logger.error(
      `Failed to read rules directory (${RULESYNC_RULES_RELATIVE_DIR_PATH}): ${formatError(error)}`
    );
    return [];
  }
}
async function getRule({ relativePathFromCwd }) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename2(relativePathFromCwd);
  try {
    const rule = await RulesyncRule.fromFile({
      relativeFilePath: filename,
      validate: true
    });
    return {
      relativePathFromCwd: join9(RULESYNC_RULES_RELATIVE_DIR_PATH, filename),
      frontmatter: rule.getFrontmatter(),
      body: rule.getBody()
    };
  } catch (error) {
    throw new Error(`Failed to read rule file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
async function putRule({
  relativePathFromCwd,
  frontmatter,
  body
}) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename2(relativePathFromCwd);
  const estimatedSize = JSON.stringify(frontmatter).length + body.length;
  if (estimatedSize > maxRuleSizeBytes) {
    throw new Error(
      `Rule size ${estimatedSize} bytes exceeds maximum ${maxRuleSizeBytes} bytes (1MB) for ${relativePathFromCwd}`
    );
  }
  try {
    const existingRules = await listRules();
    const isUpdate = existingRules.some(
      (rule2) => rule2.relativePathFromCwd === join9(RULESYNC_RULES_RELATIVE_DIR_PATH, filename)
    );
    if (!isUpdate && existingRules.length >= maxRulesCount) {
      throw new Error(
        `Maximum number of rules (${maxRulesCount}) reached in ${RULESYNC_RULES_RELATIVE_DIR_PATH}`
      );
    }
    const rule = new RulesyncRule({
      baseDir: process.cwd(),
      relativeDirPath: RULESYNC_RULES_RELATIVE_DIR_PATH,
      relativeFilePath: filename,
      frontmatter,
      body,
      validate: true
    });
    const rulesDir = join9(process.cwd(), RULESYNC_RULES_RELATIVE_DIR_PATH);
    await ensureDir(rulesDir);
    await writeFileContent(rule.getFilePath(), rule.getFileContent());
    return {
      relativePathFromCwd: join9(RULESYNC_RULES_RELATIVE_DIR_PATH, filename),
      frontmatter: rule.getFrontmatter(),
      body: rule.getBody()
    };
  } catch (error) {
    throw new Error(`Failed to write rule file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
async function deleteRule({ relativePathFromCwd }) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename2(relativePathFromCwd);
  const fullPath = join9(process.cwd(), RULESYNC_RULES_RELATIVE_DIR_PATH, filename);
  try {
    await removeFile(fullPath);
    return {
      relativePathFromCwd: join9(RULESYNC_RULES_RELATIVE_DIR_PATH, filename)
    };
  } catch (error) {
    throw new Error(`Failed to delete rule file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
var ruleToolSchemas = {
  listRules: z10.object({}),
  getRule: z10.object({
    relativePathFromCwd: z10.string()
  }),
  putRule: z10.object({
    relativePathFromCwd: z10.string(),
    frontmatter: RulesyncRuleFrontmatterSchema,
    body: z10.string()
  }),
  deleteRule: z10.object({
    relativePathFromCwd: z10.string()
  })
};
var ruleTools = {
  listRules: {
    name: "listRules",
    description: `List all rules from ${join9(RULESYNC_RULES_RELATIVE_DIR_PATH, "*.md")} with their frontmatter.`,
    parameters: ruleToolSchemas.listRules,
    execute: async () => {
      const rules = await listRules();
      const output = { rules };
      return JSON.stringify(output, null, 2);
    }
  },
  getRule: {
    name: "getRule",
    description: "Get detailed information about a specific rule. relativePathFromCwd parameter is required.",
    parameters: ruleToolSchemas.getRule,
    execute: async (args) => {
      const result = await getRule({ relativePathFromCwd: args.relativePathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  },
  putRule: {
    name: "putRule",
    description: "Create or update a rule (upsert operation). relativePathFromCwd, frontmatter, and body parameters are required.",
    parameters: ruleToolSchemas.putRule,
    execute: async (args) => {
      const result = await putRule({
        relativePathFromCwd: args.relativePathFromCwd,
        frontmatter: args.frontmatter,
        body: args.body
      });
      return JSON.stringify(result, null, 2);
    }
  },
  deleteRule: {
    name: "deleteRule",
    description: "Delete a rule file. relativePathFromCwd parameter is required.",
    parameters: ruleToolSchemas.deleteRule,
    execute: async (args) => {
      const result = await deleteRule({ relativePathFromCwd: args.relativePathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/skills.ts
import { basename as basename3, dirname, join as join10 } from "path";
import { z as z11 } from "zod/mini";
var maxSkillSizeBytes = 1024 * 1024;
var maxSkillsCount = 1e3;
function aiDirFileToMcpSkillFile(file) {
  return {
    name: file.relativeFilePathToDirPath,
    body: file.fileBuffer.toString("utf-8")
  };
}
function mcpSkillFileToAiDirFile(file) {
  return {
    relativeFilePathToDirPath: file.name,
    fileBuffer: Buffer.from(file.body, "utf-8")
  };
}
function extractDirName(relativeDirPathFromCwd) {
  const dirName = basename3(relativeDirPathFromCwd);
  if (!dirName) {
    throw new Error(`Invalid path: ${relativeDirPathFromCwd}`);
  }
  return dirName;
}
async function listSkills() {
  const skillsDir = join10(process.cwd(), RULESYNC_SKILLS_RELATIVE_DIR_PATH);
  try {
    const skillDirPaths = await findFilesByGlobs(join10(skillsDir, "*"), { type: "dir" });
    const skills = await Promise.all(
      skillDirPaths.map(async (dirPath) => {
        const dirName = basename3(dirPath);
        if (!dirName) return null;
        try {
          const skill = await RulesyncSkill.fromDir({
            dirName
          });
          const frontmatter = skill.getFrontmatter();
          return {
            relativeDirPathFromCwd: join10(RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName),
            frontmatter
          };
        } catch (error) {
          logger.error(`Failed to read skill directory ${dirName}: ${formatError(error)}`);
          return null;
        }
      })
    );
    return skills.filter((skill) => skill !== null);
  } catch (error) {
    logger.error(
      `Failed to read skills directory (${RULESYNC_SKILLS_RELATIVE_DIR_PATH}): ${formatError(error)}`
    );
    return [];
  }
}
async function getSkill({ relativeDirPathFromCwd }) {
  checkPathTraversal({
    relativePath: relativeDirPathFromCwd,
    intendedRootDir: process.cwd()
  });
  const dirName = extractDirName(relativeDirPathFromCwd);
  try {
    const skill = await RulesyncSkill.fromDir({
      dirName
    });
    return {
      relativeDirPathFromCwd: join10(RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName),
      frontmatter: skill.getFrontmatter(),
      body: skill.getBody(),
      otherFiles: skill.getOtherFiles().map(aiDirFileToMcpSkillFile)
    };
  } catch (error) {
    throw new Error(
      `Failed to read skill directory ${relativeDirPathFromCwd}: ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
async function putSkill({
  relativeDirPathFromCwd,
  frontmatter,
  body,
  otherFiles = []
}) {
  checkPathTraversal({
    relativePath: relativeDirPathFromCwd,
    intendedRootDir: process.cwd()
  });
  const dirName = extractDirName(relativeDirPathFromCwd);
  const estimatedSize = JSON.stringify(frontmatter).length + body.length + otherFiles.reduce((acc, file) => acc + file.name.length + file.body.length, 0);
  if (estimatedSize > maxSkillSizeBytes) {
    throw new Error(
      `Skill size ${estimatedSize} bytes exceeds maximum ${maxSkillSizeBytes} bytes (1MB) for ${relativeDirPathFromCwd}`
    );
  }
  try {
    const existingSkills = await listSkills();
    const isUpdate = existingSkills.some(
      (skill2) => skill2.relativeDirPathFromCwd === join10(RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName)
    );
    if (!isUpdate && existingSkills.length >= maxSkillsCount) {
      throw new Error(
        `Maximum number of skills (${maxSkillsCount}) reached in ${RULESYNC_SKILLS_RELATIVE_DIR_PATH}`
      );
    }
    const aiDirFiles = otherFiles.map(mcpSkillFileToAiDirFile);
    const skill = new RulesyncSkill({
      baseDir: process.cwd(),
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName,
      frontmatter,
      body,
      otherFiles: aiDirFiles,
      validate: true
    });
    const skillDirPath = join10(process.cwd(), RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName);
    await ensureDir(skillDirPath);
    const skillFilePath = join10(skillDirPath, SKILL_FILE_NAME);
    const skillFileContent = stringifyFrontmatter(body, frontmatter);
    await writeFileContent(skillFilePath, skillFileContent);
    for (const file of otherFiles) {
      checkPathTraversal({
        relativePath: file.name,
        intendedRootDir: skillDirPath
      });
      const filePath = join10(skillDirPath, file.name);
      const fileDir = join10(skillDirPath, dirname(file.name));
      if (fileDir !== skillDirPath) {
        await ensureDir(fileDir);
      }
      await writeFileContent(filePath, file.body);
    }
    return {
      relativeDirPathFromCwd: join10(RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName),
      frontmatter: skill.getFrontmatter(),
      body: skill.getBody(),
      otherFiles: skill.getOtherFiles().map(aiDirFileToMcpSkillFile)
    };
  } catch (error) {
    throw new Error(
      `Failed to write skill directory ${relativeDirPathFromCwd}: ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
async function deleteSkill({
  relativeDirPathFromCwd
}) {
  checkPathTraversal({
    relativePath: relativeDirPathFromCwd,
    intendedRootDir: process.cwd()
  });
  const dirName = extractDirName(relativeDirPathFromCwd);
  const skillDirPath = join10(process.cwd(), RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName);
  try {
    if (await directoryExists(skillDirPath)) {
      await removeDirectory(skillDirPath);
    }
    return {
      relativeDirPathFromCwd: join10(RULESYNC_SKILLS_RELATIVE_DIR_PATH, dirName)
    };
  } catch (error) {
    throw new Error(
      `Failed to delete skill directory ${relativeDirPathFromCwd}: ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
var McpSkillFileSchema = z11.object({
  name: z11.string(),
  body: z11.string()
});
var skillToolSchemas = {
  listSkills: z11.object({}),
  getSkill: z11.object({
    relativeDirPathFromCwd: z11.string()
  }),
  putSkill: z11.object({
    relativeDirPathFromCwd: z11.string(),
    frontmatter: RulesyncSkillFrontmatterSchema,
    body: z11.string(),
    otherFiles: z11.optional(z11.array(McpSkillFileSchema))
  }),
  deleteSkill: z11.object({
    relativeDirPathFromCwd: z11.string()
  })
};
var skillTools = {
  listSkills: {
    name: "listSkills",
    description: `List all skills from ${join10(RULESYNC_SKILLS_RELATIVE_DIR_PATH, "*", SKILL_FILE_NAME)} with their frontmatter.`,
    parameters: skillToolSchemas.listSkills,
    execute: async () => {
      const skills = await listSkills();
      const output = { skills };
      return JSON.stringify(output, null, 2);
    }
  },
  getSkill: {
    name: "getSkill",
    description: "Get detailed information about a specific skill including SKILL.md content and other files. relativeDirPathFromCwd parameter is required.",
    parameters: skillToolSchemas.getSkill,
    execute: async (args) => {
      const result = await getSkill({ relativeDirPathFromCwd: args.relativeDirPathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  },
  putSkill: {
    name: "putSkill",
    description: "Create or update a skill (upsert operation). relativeDirPathFromCwd, frontmatter, and body parameters are required. otherFiles is optional.",
    parameters: skillToolSchemas.putSkill,
    execute: async (args) => {
      const result = await putSkill({
        relativeDirPathFromCwd: args.relativeDirPathFromCwd,
        frontmatter: args.frontmatter,
        body: args.body,
        otherFiles: args.otherFiles
      });
      return JSON.stringify(result, null, 2);
    }
  },
  deleteSkill: {
    name: "deleteSkill",
    description: "Delete a skill directory and all its contents. relativeDirPathFromCwd parameter is required.",
    parameters: skillToolSchemas.deleteSkill,
    execute: async (args) => {
      const result = await deleteSkill({ relativeDirPathFromCwd: args.relativeDirPathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/subagents.ts
import { basename as basename4, join as join11 } from "path";
import { z as z12 } from "zod/mini";
var maxSubagentSizeBytes = 1024 * 1024;
var maxSubagentsCount = 1e3;
async function listSubagents() {
  const subagentsDir = join11(process.cwd(), RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH);
  try {
    const files = await listDirectoryFiles(subagentsDir);
    const mdFiles = files.filter((file) => file.endsWith(".md"));
    const subagents = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const subagent = await RulesyncSubagent.fromFile({
            relativeFilePath: file,
            validate: true
          });
          const frontmatter = subagent.getFrontmatter();
          return {
            relativePathFromCwd: join11(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, file),
            frontmatter
          };
        } catch (error) {
          logger.error(`Failed to read subagent file ${file}: ${formatError(error)}`);
          return null;
        }
      })
    );
    return subagents.filter(
      (subagent) => subagent !== null
    );
  } catch (error) {
    logger.error(
      `Failed to read subagents directory (${RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH}): ${formatError(error)}`
    );
    return [];
  }
}
async function getSubagent({ relativePathFromCwd }) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename4(relativePathFromCwd);
  try {
    const subagent = await RulesyncSubagent.fromFile({
      relativeFilePath: filename,
      validate: true
    });
    return {
      relativePathFromCwd: join11(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, filename),
      frontmatter: subagent.getFrontmatter(),
      body: subagent.getBody()
    };
  } catch (error) {
    throw new Error(`Failed to read subagent file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
async function putSubagent({
  relativePathFromCwd,
  frontmatter,
  body
}) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename4(relativePathFromCwd);
  const estimatedSize = JSON.stringify(frontmatter).length + body.length;
  if (estimatedSize > maxSubagentSizeBytes) {
    throw new Error(
      `Subagent size ${estimatedSize} bytes exceeds maximum ${maxSubagentSizeBytes} bytes (1MB) for ${relativePathFromCwd}`
    );
  }
  try {
    const existingSubagents = await listSubagents();
    const isUpdate = existingSubagents.some(
      (subagent2) => subagent2.relativePathFromCwd === join11(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, filename)
    );
    if (!isUpdate && existingSubagents.length >= maxSubagentsCount) {
      throw new Error(
        `Maximum number of subagents (${maxSubagentsCount}) reached in ${RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH}`
      );
    }
    const subagent = new RulesyncSubagent({
      baseDir: process.cwd(),
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: filename,
      frontmatter,
      body,
      validate: true
    });
    const subagentsDir = join11(process.cwd(), RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH);
    await ensureDir(subagentsDir);
    await writeFileContent(subagent.getFilePath(), subagent.getFileContent());
    return {
      relativePathFromCwd: join11(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, filename),
      frontmatter: subagent.getFrontmatter(),
      body: subagent.getBody()
    };
  } catch (error) {
    throw new Error(`Failed to write subagent file ${relativePathFromCwd}: ${formatError(error)}`, {
      cause: error
    });
  }
}
async function deleteSubagent({ relativePathFromCwd }) {
  checkPathTraversal({
    relativePath: relativePathFromCwd,
    intendedRootDir: process.cwd()
  });
  const filename = basename4(relativePathFromCwd);
  const fullPath = join11(process.cwd(), RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, filename);
  try {
    await removeFile(fullPath);
    return {
      relativePathFromCwd: join11(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, filename)
    };
  } catch (error) {
    throw new Error(
      `Failed to delete subagent file ${relativePathFromCwd}: ${formatError(error)}`,
      {
        cause: error
      }
    );
  }
}
var subagentToolSchemas = {
  listSubagents: z12.object({}),
  getSubagent: z12.object({
    relativePathFromCwd: z12.string()
  }),
  putSubagent: z12.object({
    relativePathFromCwd: z12.string(),
    frontmatter: RulesyncSubagentFrontmatterSchema,
    body: z12.string()
  }),
  deleteSubagent: z12.object({
    relativePathFromCwd: z12.string()
  })
};
var subagentTools = {
  listSubagents: {
    name: "listSubagents",
    description: `List all subagents from ${join11(RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH, "*.md")} with their frontmatter.`,
    parameters: subagentToolSchemas.listSubagents,
    execute: async () => {
      const subagents = await listSubagents();
      const output = { subagents };
      return JSON.stringify(output, null, 2);
    }
  },
  getSubagent: {
    name: "getSubagent",
    description: "Get detailed information about a specific subagent. relativePathFromCwd parameter is required.",
    parameters: subagentToolSchemas.getSubagent,
    execute: async (args) => {
      const result = await getSubagent({ relativePathFromCwd: args.relativePathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  },
  putSubagent: {
    name: "putSubagent",
    description: "Create or update a subagent (upsert operation). relativePathFromCwd, frontmatter, and body parameters are required.",
    parameters: subagentToolSchemas.putSubagent,
    execute: async (args) => {
      const result = await putSubagent({
        relativePathFromCwd: args.relativePathFromCwd,
        frontmatter: args.frontmatter,
        body: args.body
      });
      return JSON.stringify(result, null, 2);
    }
  },
  deleteSubagent: {
    name: "deleteSubagent",
    description: "Delete a subagent file. relativePathFromCwd parameter is required.",
    parameters: subagentToolSchemas.deleteSubagent,
    execute: async (args) => {
      const result = await deleteSubagent({ relativePathFromCwd: args.relativePathFromCwd });
      return JSON.stringify(result, null, 2);
    }
  }
};

// src/mcp/tools.ts
var rulesyncFeatureSchema = z13.enum([
  "rule",
  "command",
  "subagent",
  "skill",
  "ignore",
  "mcp",
  "generate",
  "import"
]);
var rulesyncOperationSchema = z13.enum(["list", "get", "put", "delete", "run"]);
var skillFileSchema = z13.object({
  name: z13.string(),
  body: z13.string()
});
var rulesyncToolSchema = z13.object({
  feature: rulesyncFeatureSchema,
  operation: rulesyncOperationSchema,
  targetPathFromCwd: z13.optional(z13.string()),
  frontmatter: z13.optional(z13.unknown()),
  body: z13.optional(z13.string()),
  otherFiles: z13.optional(z13.array(skillFileSchema)),
  content: z13.optional(z13.string()),
  generateOptions: z13.optional(generateOptionsSchema),
  importOptions: z13.optional(importOptionsSchema)
});
var supportedOperationsByFeature = {
  rule: ["list", "get", "put", "delete"],
  command: ["list", "get", "put", "delete"],
  subagent: ["list", "get", "put", "delete"],
  skill: ["list", "get", "put", "delete"],
  ignore: ["get", "put", "delete"],
  mcp: ["get", "put", "delete"],
  generate: ["run"],
  import: ["run"]
};
function assertSupported({
  feature,
  operation
}) {
  const supportedOperations = supportedOperationsByFeature[feature];
  if (!supportedOperations.includes(operation)) {
    throw new Error(
      `Operation ${operation} is not supported for feature ${feature}. Supported operations: ${supportedOperations.join(
        ", "
      )}`
    );
  }
}
function requireTargetPath({ targetPathFromCwd, feature, operation }) {
  if (!targetPathFromCwd) {
    throw new Error(`targetPathFromCwd is required for ${feature} ${operation} operation`);
  }
  return targetPathFromCwd;
}
function parseFrontmatter({
  feature,
  frontmatter
}) {
  switch (feature) {
    case "rule": {
      return RulesyncRuleFrontmatterSchema.parse(frontmatter);
    }
    case "command": {
      return RulesyncCommandFrontmatterSchema.parse(frontmatter);
    }
    case "subagent": {
      return RulesyncSubagentFrontmatterSchema.parse(frontmatter);
    }
    case "skill": {
      return RulesyncSkillFrontmatterSchema.parse(frontmatter);
    }
  }
}
function ensureBody({ body, feature, operation }) {
  if (!body) {
    throw new Error(`body is required for ${feature} ${operation} operation`);
  }
  return body;
}
var rulesyncTool = {
  name: "rulesyncTool",
  description: "Manage Rulesync files through a single MCP tool. Features: rule/command/subagent/skill support list/get/put/delete; ignore/mcp support get/put/delete only; generate supports run only; import supports run only. Parameters: list requires no targetPathFromCwd (lists all items); get/delete require targetPathFromCwd; put requires targetPathFromCwd, frontmatter, and body (or content for ignore/mcp); generate/run uses generateOptions to configure generation; import/run uses importOptions to configure import.",
  parameters: rulesyncToolSchema,
  execute: async (args) => {
    const parsed = rulesyncToolSchema.parse(args);
    assertSupported({ feature: parsed.feature, operation: parsed.operation });
    switch (parsed.feature) {
      case "rule": {
        if (parsed.operation === "list") {
          return ruleTools.listRules.execute();
        }
        if (parsed.operation === "get") {
          return ruleTools.getRule.execute({ relativePathFromCwd: requireTargetPath(parsed) });
        }
        if (parsed.operation === "put") {
          return ruleTools.putRule.execute({
            relativePathFromCwd: requireTargetPath(parsed),
            frontmatter: parseFrontmatter({
              feature: "rule",
              frontmatter: parsed.frontmatter ?? {}
            }),
            body: ensureBody(parsed)
          });
        }
        return ruleTools.deleteRule.execute({ relativePathFromCwd: requireTargetPath(parsed) });
      }
      case "command": {
        if (parsed.operation === "list") {
          return commandTools.listCommands.execute();
        }
        if (parsed.operation === "get") {
          return commandTools.getCommand.execute({
            relativePathFromCwd: requireTargetPath(parsed)
          });
        }
        if (parsed.operation === "put") {
          return commandTools.putCommand.execute({
            relativePathFromCwd: requireTargetPath(parsed),
            frontmatter: parseFrontmatter({
              feature: "command",
              frontmatter: parsed.frontmatter ?? {}
            }),
            body: ensureBody(parsed)
          });
        }
        return commandTools.deleteCommand.execute({
          relativePathFromCwd: requireTargetPath(parsed)
        });
      }
      case "subagent": {
        if (parsed.operation === "list") {
          return subagentTools.listSubagents.execute();
        }
        if (parsed.operation === "get") {
          return subagentTools.getSubagent.execute({
            relativePathFromCwd: requireTargetPath(parsed)
          });
        }
        if (parsed.operation === "put") {
          return subagentTools.putSubagent.execute({
            relativePathFromCwd: requireTargetPath(parsed),
            frontmatter: parseFrontmatter({
              feature: "subagent",
              frontmatter: parsed.frontmatter ?? {}
            }),
            body: ensureBody(parsed)
          });
        }
        return subagentTools.deleteSubagent.execute({
          relativePathFromCwd: requireTargetPath(parsed)
        });
      }
      case "skill": {
        if (parsed.operation === "list") {
          return skillTools.listSkills.execute();
        }
        if (parsed.operation === "get") {
          return skillTools.getSkill.execute({ relativeDirPathFromCwd: requireTargetPath(parsed) });
        }
        if (parsed.operation === "put") {
          return skillTools.putSkill.execute({
            relativeDirPathFromCwd: requireTargetPath(parsed),
            frontmatter: parseFrontmatter({
              feature: "skill",
              frontmatter: parsed.frontmatter ?? {}
            }),
            body: ensureBody(parsed),
            otherFiles: parsed.otherFiles ?? []
          });
        }
        return skillTools.deleteSkill.execute({
          relativeDirPathFromCwd: requireTargetPath(parsed)
        });
      }
      case "ignore": {
        if (parsed.operation === "get") {
          return ignoreTools.getIgnoreFile.execute();
        }
        if (parsed.operation === "put") {
          if (!parsed.content) {
            throw new Error("content is required for ignore put operation");
          }
          return ignoreTools.putIgnoreFile.execute({ content: parsed.content });
        }
        return ignoreTools.deleteIgnoreFile.execute();
      }
      case "mcp": {
        if (parsed.operation === "get") {
          return mcpTools.getMcpFile.execute();
        }
        if (parsed.operation === "put") {
          if (!parsed.content) {
            throw new Error("content is required for mcp put operation");
          }
          return mcpTools.putMcpFile.execute({ content: parsed.content });
        }
        return mcpTools.deleteMcpFile.execute();
      }
      case "generate": {
        return generateTools.executeGenerate.execute(parsed.generateOptions ?? {});
      }
      case "import": {
        if (!parsed.importOptions) {
          throw new Error("importOptions is required for import feature");
        }
        return importTools.executeImport.execute(parsed.importOptions);
      }
      default: {
        throw new Error(`Unknown feature: ${parsed.feature}`);
      }
    }
  }
};

// src/cli/commands/mcp.ts
async function mcpCommand({ version }) {
  const server = new FastMCP({
    name: "Rulesync MCP Server",
    // eslint-disable-next-line no-type-assertion/no-type-assertion
    version,
    instructions: "This server handles Rulesync files including rules, commands, MCP, ignore files, subagents and skills for any AI agents. It should be used when you need those files."
  });
  server.addTool(rulesyncTool);
  logger.info("Rulesync MCP server started via stdio");
  void server.start({
    transportType: "stdio"
  });
}

// src/lib/update.ts
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
var RULESYNC_REPO_OWNER = "dyoshikawa";
var RULESYNC_REPO_NAME = "rulesync";
var RELEASES_URL = `https://github.com/${RULESYNC_REPO_OWNER}/${RULESYNC_REPO_NAME}/releases`;
var MAX_DOWNLOAD_SIZE = 500 * 1024 * 1024;
var ALLOWED_DOWNLOAD_DOMAINS = [
  "github.com",
  "objects.githubusercontent.com",
  "github-releases.githubusercontent.com",
  "release-assets.githubusercontent.com"
];
var UpdatePermissionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UpdatePermissionError";
  }
};
function detectExecutionEnvironment() {
  const execPath = process.execPath;
  const scriptPath = process.argv[1] ?? "";
  const isRulesyncBinary = /rulesync(-[a-z0-9]+(-[a-z0-9]+)?)?(\.exe)?$/i.test(execPath);
  if (isRulesyncBinary) {
    if (execPath.includes("/homebrew/") || execPath.includes("/Cellar/")) {
      return "homebrew";
    }
    return "single-binary";
  }
  if ((scriptPath.includes("/homebrew/") || scriptPath.includes("/Cellar/")) && scriptPath.includes("rulesync")) {
    return "homebrew";
  }
  return "npm";
}
function getPlatformAssetName() {
  const platform2 = os.platform();
  const arch2 = os.arch();
  const platformMap = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows"
  };
  const archMap = {
    x64: "x64",
    arm64: "arm64"
  };
  const platformName = platformMap[platform2];
  const archName = archMap[arch2];
  if (!platformName || !archName) {
    return null;
  }
  const extension = platform2 === "win32" ? ".exe" : "";
  return `rulesync-${platformName}-${archName}${extension}`;
}
function normalizeVersion(v) {
  return v.replace(/^v/, "").replace(/-.*$/, "");
}
function compareVersions(a, b) {
  const aParts = normalizeVersion(a).split(".").map(Number);
  const bParts = normalizeVersion(b).split(".").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] ?? 0;
    const bNum = bParts[i] ?? 0;
    if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) {
      throw new Error(`Invalid version format: cannot compare "${a}" and "${b}"`);
    }
    if (aNum > bNum) return 1;
    if (aNum < bNum) return -1;
  }
  return 0;
}
function validateDownloadUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid download URL: ${url}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`Download URL must use HTTPS: ${url}`);
  }
  const isAllowed = ALLOWED_DOWNLOAD_DOMAINS.some((domain) => parsed.hostname === domain);
  if (!isAllowed) {
    throw new Error(
      `Download URL domain "${parsed.hostname}" is not in the allowed list: ${ALLOWED_DOWNLOAD_DOMAINS.join(", ")}`
    );
  }
  if (parsed.hostname === "github.com") {
    const expectedPrefix = `/${RULESYNC_REPO_OWNER}/${RULESYNC_REPO_NAME}/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      throw new Error(
        `Download URL path must belong to ${RULESYNC_REPO_OWNER}/${RULESYNC_REPO_NAME}: ${url}`
      );
    }
  }
}
async function checkForUpdate(currentVersion, token) {
  const client = new GitHubClient({
    token: GitHubClient.resolveToken(token)
  });
  const release = await client.getLatestRelease(RULESYNC_REPO_OWNER, RULESYNC_REPO_NAME);
  const latestVersion = normalizeVersion(release.tag_name);
  const normalizedCurrentVersion = normalizeVersion(currentVersion);
  return {
    currentVersion: normalizedCurrentVersion,
    latestVersion,
    hasUpdate: compareVersions(latestVersion, normalizedCurrentVersion) > 0,
    release
  };
}
function findAsset(release, assetName) {
  return release.assets.find((asset) => asset.name === assetName) ?? null;
}
async function downloadFile(url, destPath) {
  validateDownloadUrl(url);
  const response = await fetch(url, {
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  if (response.url) {
    validateDownloadUrl(response.url);
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_DOWNLOAD_SIZE) {
    throw new Error(
      `Download too large: ${contentLength} bytes exceeds limit of ${MAX_DOWNLOAD_SIZE} bytes`
    );
  }
  if (!response.body) {
    throw new Error("Response body is empty");
  }
  const fileStream = fs.createWriteStream(destPath);
  let downloadedBytes = 0;
  const bodyReader = Readable.fromWeb(
    // eslint-disable-next-line no-type-assertion/no-type-assertion
    response.body
  );
  const sizeChecker = new Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      if (downloadedBytes > MAX_DOWNLOAD_SIZE) {
        callback(
          new Error(
            `Download too large: exceeded limit of ${MAX_DOWNLOAD_SIZE} bytes during streaming`
          )
        );
        return;
      }
      callback(null, chunk);
    }
  });
  await pipeline(bodyReader, sizeChecker, fileStream);
}
async function calculateSha256(filePath) {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}
function parseSha256Sums(content) {
  const result = /* @__PURE__ */ new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = /^([a-f0-9]{64})\s+(.+)$/.exec(trimmed);
    if (match && match[1] && match[2]) {
      result.set(match[2].trim(), match[1]);
    }
  }
  return result;
}
async function performBinaryUpdate(currentVersion, options = {}) {
  const { force = false, token } = options;
  const updateCheck = await checkForUpdate(currentVersion, token);
  if (!updateCheck.hasUpdate && !force) {
    return `Already at the latest version (${currentVersion})`;
  }
  const assetName = getPlatformAssetName();
  if (!assetName) {
    throw new Error(
      `Unsupported platform: ${os.platform()} ${os.arch()}. Please download manually from ${RELEASES_URL}`
    );
  }
  const binaryAsset = findAsset(updateCheck.release, assetName);
  if (!binaryAsset) {
    throw new Error(
      `Binary for ${assetName} not found in release. Please download manually from ${RELEASES_URL}`
    );
  }
  const checksumAsset = findAsset(updateCheck.release, "SHA256SUMS");
  if (!checksumAsset) {
    throw new Error(
      `SHA256SUMS not found in release. Cannot verify download integrity. Please download manually from ${RELEASES_URL}`
    );
  }
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "rulesync-update-"));
  let restoreFailed = false;
  try {
    if (os.platform() !== "win32") {
      await fs.promises.chmod(tempDir, 448);
    }
    const tempBinaryPath = path.join(tempDir, assetName);
    await downloadFile(binaryAsset.browser_download_url, tempBinaryPath);
    const checksumsPath = path.join(tempDir, "SHA256SUMS");
    await downloadFile(checksumAsset.browser_download_url, checksumsPath);
    const checksumsContent = await fs.promises.readFile(checksumsPath, "utf-8");
    const checksums = parseSha256Sums(checksumsContent);
    const expectedChecksum = checksums.get(assetName);
    if (!expectedChecksum) {
      throw new Error(
        `Checksum entry for "${assetName}" not found in SHA256SUMS. Cannot verify download integrity.`
      );
    }
    const actualChecksum = await calculateSha256(tempBinaryPath);
    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        `Checksum verification failed. Expected: ${expectedChecksum}, Got: ${actualChecksum}. The download may be corrupted.`
      );
    }
    const currentExePath = await fs.promises.realpath(process.execPath);
    const currentDir = path.dirname(currentExePath);
    const backupPath = path.join(tempDir, "rulesync.backup");
    try {
      await fs.promises.copyFile(currentExePath, backupPath);
    } catch (error) {
      if (isPermissionError(error)) {
        throw new UpdatePermissionError(
          `Permission denied: Cannot read ${currentExePath}. Try running with sudo.`
        );
      }
      throw error;
    }
    try {
      const tempInPlace = path.join(currentDir, `.rulesync-update-${crypto.randomUUID()}`);
      try {
        await fs.promises.copyFile(tempBinaryPath, tempInPlace);
        if (os.platform() !== "win32") {
          await fs.promises.chmod(tempInPlace, 493);
        }
        await fs.promises.rename(tempInPlace, currentExePath);
      } catch {
        try {
          await fs.promises.unlink(tempInPlace);
        } catch {
        }
        await fs.promises.copyFile(tempBinaryPath, currentExePath);
        if (os.platform() !== "win32") {
          await fs.promises.chmod(currentExePath, 493);
        }
      }
      return `Successfully updated from ${currentVersion} to ${updateCheck.latestVersion}`;
    } catch (error) {
      try {
        await fs.promises.copyFile(backupPath, currentExePath);
      } catch {
        restoreFailed = true;
        throw new Error(
          `Failed to replace binary and restore failed. Backup is preserved at: ${backupPath} (in ${tempDir}). Please manually copy it to ${currentExePath}. Original error: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        );
      }
      if (isPermissionError(error)) {
        throw new UpdatePermissionError(
          `Permission denied: Cannot write to ${path.dirname(currentExePath)}. Try running with sudo.`
        );
      }
      throw error;
    }
  } finally {
    if (!restoreFailed) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {
      }
    }
  }
}
function isPermissionError(error) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const record = error;
    return record["code"] === "EACCES" || record["code"] === "EPERM";
  }
  return false;
}
function getNpmUpgradeInstructions() {
  return `This rulesync installation was installed via npm/npx.

To upgrade, run one of the following commands:

  Global installation:
    npm install -g rulesync@latest

  Project dependency:
    npm install rulesync@latest

  Or use npx to always run the latest version:
    npx rulesync@latest --version`;
}
function getHomebrewUpgradeInstructions() {
  return `This rulesync installation was installed via Homebrew.

To upgrade, run:
  brew upgrade rulesync`;
}

// src/cli/commands/update.ts
async function updateCommand(currentVersion, options) {
  const { check = false, force = false, verbose = false, silent = false, token } = options;
  logger.configure({ verbose, silent });
  try {
    const environment = detectExecutionEnvironment();
    logger.debug(`Detected environment: ${environment}`);
    if (environment === "npm") {
      logger.info(getNpmUpgradeInstructions());
      return;
    }
    if (environment === "homebrew") {
      logger.info(getHomebrewUpgradeInstructions());
      return;
    }
    if (check) {
      logger.info("Checking for updates...");
      const updateCheck = await checkForUpdate(currentVersion, token);
      if (updateCheck.hasUpdate) {
        logger.success(
          `Update available: ${updateCheck.currentVersion} -> ${updateCheck.latestVersion}`
        );
      } else {
        logger.info(`Already at the latest version (${updateCheck.currentVersion})`);
      }
      return;
    }
    logger.info("Checking for updates...");
    const message = await performBinaryUpdate(currentVersion, { force, token });
    logger.success(message);
  } catch (error) {
    if (error instanceof GitHubClientError) {
      logGitHubAuthHints(error);
    } else if (error instanceof UpdatePermissionError) {
      logger.error(error.message);
      logger.info("Tip: Run with elevated privileges (e.g., sudo rulesync update)");
    } else {
      logger.error(formatError(error));
    }
    process.exit(1);
  }
}

// src/cli/index.ts
var getVersion = () => "7.3.0";
var main = async () => {
  const program = new Command();
  const version = getVersion();
  program.hook("postAction", () => {
    if (ANNOUNCEMENT.length > 0) {
      logger.info(ANNOUNCEMENT);
    }
  });
  program.name("rulesync").description("Unified AI rules management CLI tool").version(version, "-v, --version", "Show version");
  program.command("init").description("Initialize rulesync in current directory").action(initCommand);
  program.command("gitignore").description("Add generated files to .gitignore").action(gitignoreCommand);
  program.command("fetch <source>").description("Fetch files from a Git repository (GitHub/GitLab)").option(
    "-t, --target <target>",
    "Target format to interpret files as (e.g., 'rulesync', 'claudecode'). Default: rulesync"
  ).option(
    "-f, --features <features>",
    `Comma-separated list of features to fetch (${ALL_FEATURES.join(",")}) or '*' for all`,
    (value) => {
      return value.split(",").map((f) => f.trim());
    }
  ).option("-r, --ref <ref>", "Branch, tag, or commit SHA to fetch from").option("-p, --path <path>", "Subdirectory path within the repository").option("-o, --output <dir>", "Output directory (default: .rulesync)").option(
    "-c, --conflict <strategy>",
    "Conflict resolution strategy: skip, overwrite (default: overwrite)"
  ).option("--token <token>", "Git provider token for private repositories").option("-V, --verbose", "Verbose output").option("-s, --silent", "Suppress all output").action(async (source, options) => {
    await fetchCommand({
      source,
      target: options.target,
      features: options.features,
      ref: options.ref,
      path: options.path,
      output: options.output,
      conflict: options.conflict,
      token: options.token,
      verbose: options.verbose,
      silent: options.silent
    });
  });
  program.command("import").description("Import configurations from AI tools to rulesync format").option(
    "-t, --targets <tool>",
    "Tool to import from (e.g., 'copilot', 'cursor', 'cline')",
    (value) => {
      return value.split(",").map((t) => t.trim());
    }
  ).option(
    "-f, --features <features>",
    `Comma-separated list of features to import (${ALL_FEATURES.join(",")}) or '*' for all`,
    (value) => {
      return value.split(",").map((f) => f.trim());
    }
  ).option("-V, --verbose", "Verbose output").option("-s, --silent", "Suppress all output").option("-g, --global", "Import for global(user scope) configuration files").action(async (options) => {
    try {
      await importCommand({
        targets: options.targets,
        features: options.features,
        verbose: options.verbose,
        silent: options.silent,
        configPath: options.config,
        global: options.global
      });
    } catch (error) {
      logger.error(formatError(error));
      process.exit(1);
    }
  });
  program.command("mcp").description("Start MCP server for rulesync").action(async () => {
    try {
      await mcpCommand({ version });
    } catch (error) {
      logger.error(formatError(error));
      process.exit(1);
    }
  });
  program.command("install").description("Install skills from declarative sources in rulesync.jsonc").option("--update", "Force re-resolve all source refs, ignoring lockfile").option(
    "--frozen",
    "Fail if lockfile is missing or out of sync (for CI); fetches missing skills using locked refs"
  ).option("--token <token>", "GitHub token for private repos").option("-c, --config <path>", "Path to configuration file").option("-V, --verbose", "Verbose output").option("-s, --silent", "Suppress all output").action(async (options) => {
    try {
      await installCommand({
        update: options.update,
        frozen: options.frozen,
        token: options.token,
        configPath: options.config,
        verbose: options.verbose,
        silent: options.silent
      });
    } catch (error) {
      logger.error(formatError(error));
      process.exit(1);
    }
  });
  program.command("generate").description("Generate configuration files for AI tools").option(
    "-t, --targets <tools>",
    "Comma-separated list of tools to generate for (e.g., 'copilot,cursor,cline' or '*' for all)",
    (value) => {
      return value.split(",").map((t) => t.trim());
    }
  ).option(
    "-f, --features <features>",
    `Comma-separated list of features to generate (${ALL_FEATURES.join(",")}) or '*' for all`,
    (value) => {
      return value.split(",").map((f) => f.trim());
    }
  ).option("--delete", "Delete all existing files in output directories before generating").option(
    "-b, --base-dir <paths>",
    "Base directories to generate files (comma-separated for multiple paths)"
  ).option("-V, --verbose", "Verbose output").option("-s, --silent", "Suppress all output").option("-c, --config <path>", "Path to configuration file").option("-g, --global", "Generate for global(user scope) configuration files").option(
    "--simulate-commands",
    "Generate simulated commands. This feature is only available for copilot, cursor and codexcli."
  ).option(
    "--simulate-subagents",
    "Generate simulated subagents. This feature is only available for copilot and codexcli."
  ).option(
    "--simulate-skills",
    "Generate simulated skills. This feature is only available for copilot, cursor and codexcli."
  ).option("--dry-run", "Dry run: show changes without writing files").option("--check", "Check if files are up to date (exits with code 1 if changes needed)").action(async (options) => {
    try {
      await generateCommand({
        targets: options.targets,
        features: options.features,
        verbose: options.verbose,
        silent: options.silent,
        delete: options.delete,
        baseDirs: options.baseDirs,
        configPath: options.config,
        global: options.global,
        simulateCommands: options.simulateCommands,
        simulateSubagents: options.simulateSubagents,
        simulateSkills: options.simulateSkills,
        dryRun: options.dryRun,
        check: options.check
      });
    } catch (error) {
      logger.error(formatError(error));
      process.exit(1);
    }
  });
  program.command("update").description("Update rulesync to the latest version").option("--check", "Check for updates without installing").option("--force", "Force update even if already at latest version").option("--token <token>", "GitHub token for API access").option("-V, --verbose", "Verbose output").option("-s, --silent", "Suppress all output").action(async (options) => {
    await updateCommand(version, {
      check: options.check,
      force: options.force,
      token: options.token,
      verbose: options.verbose,
      silent: options.silent
    });
  });
  program.parse();
};
main().catch((error) => {
  logger.error(formatError(error));
  process.exit(1);
});
