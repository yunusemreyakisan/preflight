import { createTranslator, resolveLocale } from "../../i18n";
import { formatGithubAnnotations } from "../../output/format-annotations";
import { formatScanUpdateNotice } from "../../output/format-human";
import { renderScanResult, scanProject } from "../../scanner/scan-project";
import { checkForCliUpdate } from "../../updates/check-for-cli-update";
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

export async function runScan(options: ScanCommandOptions = {}): Promise<RunScanResult> {
  const annotationTarget = resolveAnnotationTarget(options.annotations, options.lang);
  const result = await scanProject({
    ...options,
    allowInteractiveAppStoreConnectSetup:
      options.allowInteractiveAppStoreConnectSetup ?? true
  });
  const annotationLines =
    annotationTarget === "github" ? formatGithubAnnotations(result) : [];

  if (annotationLines.length > 0) {
    process.stderr.write(`${annotationLines.join("\n")}\n`);
  }

  let output = renderScanResult(result, options);

  if (options.checkForUpdates && !options.json) {
    const updateInfo = await checkForCliUpdate({
      fetchImpl: options.updateCheckFetchImpl ?? options.fetchImpl
    });

    if (updateInfo) {
      const translator = createTranslator(resolveLocale(options.lang ?? result.locale));
      output = `${output}\n\n${formatScanUpdateNotice(updateInfo, translator, {
        ci: options.ci,
        plain: options.plain
      })}`;
    }
  }

  return {
    exitCode: result.exit_code,
    output,
    result
  };
}
