import { createTranslator, resolveLocale } from "../../i18n";
import { formatGithubAnnotations } from "../../output/format-annotations";
import { renderScanResult, scanProject } from "../../scanner/scan-project";
import type { AnnotationTarget, ScanCommandOptions, ScanResult } from "../../types";

export interface RunScanResult {
  exitCode: number;
  output: string;
  result: ScanResult;
}

function resolveAnnotationTarget(
  target: ScanCommandOptions["annotations"],
  lang?: string
): AnnotationTarget | undefined {
  if (!target) {
    return undefined;
  }

  const normalizedTarget = target.trim().toLowerCase();

  if (normalizedTarget === "github") {
    return "github";
  }

  const translator = createTranslator(resolveLocale(lang));

  throw new Error(
    translator.t("cli.error.annotationsUnsupported", {
      target
    })
  );
}

export function runScan(options: ScanCommandOptions = {}): RunScanResult {
  const annotationTarget = resolveAnnotationTarget(options.annotations, options.lang);
  const result = scanProject(options);
  const annotationLines =
    annotationTarget === "github" ? formatGithubAnnotations(result) : [];

  if (annotationLines.length > 0) {
    process.stderr.write(`${annotationLines.join("\n")}\n`);
  }

  const output = renderScanResult(result, options);

  return {
    exitCode: result.exit_code,
    output,
    result
  };
}
