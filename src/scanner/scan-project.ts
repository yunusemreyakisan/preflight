import { createTranslator, resolveLocale } from "../i18n";
import { formatJsonReport, formatReviewerPackJson } from "../output/format-json";
import {
  formatHumanReviewerPack,
  formatHumanScanReport
} from "../output/format-human";
import { evaluateReviewerPack } from "../reviewer-pack/evaluate-reviewer-pack";
import { assessRisk, getExitCode } from "../risk/assess-risk";
import { evaluateRuleRegistry, RULE_REGISTRY } from "../rules/registry";
import { loadConfigFromFile } from "../config/load-config";
import { buildScanInput } from "./build-scan-input";
import type {
  ReviewerPackCommandOptions,
  ReviewerPackReport,
  ScanCommandOptions,
  ScanResult,
  Translator
} from "../types";

function buildEmptyReviewerPack(): ReviewerPackReport {
  return {
    status: "incomplete",
    items: [],
    missing: ["Valid configuration"],
    notes: ["Fix the configuration before relying on reviewer-pack output."],
    generatedReviewNotesTemplate: undefined
  };
}

function createTranslatorFromOptions(lang?: string): Translator {
  return createTranslator(resolveLocale(lang));
}

function getCoverageNote(translator: Translator): string {
  return translator.t("output.coverageNote", {
    ruleCount: RULE_REGISTRY.length
  });
}

export function scanProject(options: ScanCommandOptions = {}): ScanResult {
  const translator = createTranslatorFromOptions(options.lang);
  const loadedConfig = loadConfigFromFile({
    cwd: options.cwd,
    configPath: options.configPath,
    translator
  });

  if (!loadedConfig.ok) {
    const exitCode = 2;

    return {
      risk_level: "HIGH",
      risk_score: 100,
      likely_rejection: true,
      primary_reason: loadedConfig.issue.title,
      blocking_issues: [loadedConfig.issue],
      warnings: [],
      passed_checks: [],
      reviewer_pack: buildEmptyReviewerPack(),
      rule_coverage_note: getCoverageNote(translator),
      exit_code: exitCode,
      locale: translator.locale,
      scanned_at: new Date().toISOString(),
      config_path: loadedConfig.configPath,
      config_warnings: loadedConfig.warnings.map((warning) => warning.message)
    };
  }

  const input = buildScanInput({
    config: loadedConfig.config,
    configDir: loadedConfig.configDir,
    configPath: loadedConfig.configPath
  });
  const ruleResults = evaluateRuleRegistry(input, translator);
  const reviewerPack = evaluateReviewerPack(input, translator);
  const risk = assessRisk({
    blockingIssues: ruleResults.blockingIssues,
    warnings: ruleResults.warnings,
    passedChecks: ruleResults.passedChecks,
    reviewerPack
  });

  return {
    ...risk,
    reviewer_pack: reviewerPack,
    rule_coverage_note: getCoverageNote(translator),
    exit_code: getExitCode(risk.risk_level, options.strict),
    locale: translator.locale,
    scanned_at: new Date().toISOString(),
    config_path: loadedConfig.configPath,
    config_warnings: loadedConfig.warnings.map((warning) => warning.message)
  };
}

export function renderScanResult(
  result: ScanResult,
  options: Pick<ScanCommandOptions, "ci" | "json" | "lang"> = {}
): string {
  const translator = createTranslatorFromOptions(options.lang ?? result.locale);

  if (options.json) {
    return formatJsonReport(result);
  }

  return formatHumanScanReport(result, translator, {
    ci: options.ci
  });
}

export function buildReviewerPackReport(
  options: ReviewerPackCommandOptions = {}
): {
  reviewerPack: ReviewerPackReport;
  locale: ReturnType<typeof createTranslatorFromOptions>["locale"];
  exitCode: number;
  configPath: string;
} {
  const translator = createTranslatorFromOptions(options.lang);
  const loadedConfig = loadConfigFromFile({
    cwd: options.cwd,
    configPath: options.configPath,
    translator
  });

  if (!loadedConfig.ok) {
    return {
      reviewerPack: buildEmptyReviewerPack(),
      locale: translator.locale,
      exitCode: 2,
      configPath: loadedConfig.configPath
    };
  }

  const input = buildScanInput({
    config: loadedConfig.config,
    configDir: loadedConfig.configDir,
    configPath: loadedConfig.configPath
  });
  const reviewerPack = evaluateReviewerPack(input, translator);

  return {
    reviewerPack,
    locale: translator.locale,
    exitCode: reviewerPack.status === "complete" ? 0 : 1,
    configPath: loadedConfig.configPath
  };
}

export function renderReviewerPackResult(
  reviewerPack: ReviewerPackReport,
  options: Pick<ReviewerPackCommandOptions, "json" | "lang"> = {}
): string {
  const translator = createTranslatorFromOptions(options.lang);

  if (options.json) {
    return formatReviewerPackJson(reviewerPack);
  }

  return formatHumanReviewerPack(reviewerPack, translator);
}
