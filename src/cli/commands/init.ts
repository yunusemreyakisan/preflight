import fs from "node:fs";
import path from "node:path";

import { createTranslator, resolveLocale } from "../../i18n";
import { createInitConfigTemplate } from "../../config/init-template";
import type { InitCommandOptions } from "../../types";

export interface RunInitResult {
  exitCode: number;
  output: string;
  outputPath: string;
}

export function runInit(options: InitCommandOptions = {}): RunInitResult {
  const translator = createTranslator(resolveLocale(options.lang));
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "preflight.config.json");

  if (fs.existsSync(outputPath) && !options.force) {
    return {
      exitCode: 1,
      output: translator.t("output.init.exists", {
        path: outputPath
      }),
      outputPath
    };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, createInitConfigTemplate(translator));

  return {
    exitCode: 0,
    output: `${translator.t("output.init.created", {
      path: outputPath
    })}\n${translator.t("output.init.gitignoreHint")}`,
    outputPath
  };
}
