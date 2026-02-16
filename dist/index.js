import {
  ALL_FEATURES,
  ALL_TOOL_TARGETS,
  ConfigResolver,
  checkRulesyncDirExists,
  generate,
  importFromTool,
  logger
} from "./chunk-NRNUPCXY.js";

// src/index.ts
async function generate2(options = {}) {
  const { silent = true, verbose = false, ...rest } = options;
  logger.configure({ verbose, silent });
  const config = await ConfigResolver.resolve({
    ...rest,
    verbose,
    silent
  });
  for (const baseDir of config.getBaseDirs()) {
    if (!await checkRulesyncDirExists({ baseDir })) {
      throw new Error(".rulesync directory not found. Run 'rulesync init' first.");
    }
  }
  return generate({ config });
}
async function importFromTool2(options) {
  const { target, silent = true, verbose = false, ...rest } = options;
  logger.configure({ verbose, silent });
  const config = await ConfigResolver.resolve({
    ...rest,
    targets: [target],
    verbose,
    silent
  });
  return importFromTool({ config, tool: target });
}
export {
  ALL_FEATURES,
  ALL_TOOL_TARGETS,
  generate2 as generate,
  importFromTool2 as importFromTool
};
