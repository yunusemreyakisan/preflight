import { loadConfigFromFile } from "../config/load-config";
import { collectFieldSources, mergeKnownValues } from "../config/object-helpers";
import {
  defaultPreflightConfig,
  preflightConfigSchema,
  type PreflightConfigOverride
} from "../config/schema";
import { discoverProject } from "../discovery/discover-project";
import { createTranslator, resolveLocale } from "../i18n";
import { formatJsonReport, formatReviewerPackJson } from "../output/format-json";
import {
  formatHumanReviewerPack,
  formatHumanScanReport
} from "../output/format-human";
import { evaluateReviewerPack } from "../reviewer-pack/evaluate-reviewer-pack";
import { assessRisk, getExitCode } from "../risk/assess-risk";
import { evaluateRuleRegistry, RULE_REGISTRY } from "../rules/registry";
import { buildScanInput, collectMissingInputs } from "./build-scan-input";
import type {
  DiscoveryReport,
  Issue,
  ReviewerPackCommandOptions,
  ReviewerPackReport,
  ScanCommandOptions,
  ScanResult,
  Translator
} from "../types";

type UnknownRecord = Record<string, unknown>;

interface PreparedScanContextSuccess {
  ok: true;
  translator: Translator;
  configPath: string;
  configWarnings: string[];
  discovery: DiscoveryReport;
  input: ReturnType<typeof buildScanInput>;
}

interface PreparedScanContextFailure {
  ok: false;
  translator: Translator;
  configPath: string;
  configWarnings: string[];
  discovery: DiscoveryReport;
  blockingIssues: Issue[];
}

type PreparedScanContext = PreparedScanContextSuccess | PreparedScanContextFailure;

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

function mergeResolvedConfig(
  discoveredConfig: PreflightConfigOverride,
  overrideConfig: PreflightConfigOverride
) {
  const mergedDefault = mergeKnownValues(
    {},
    defaultPreflightConfig as unknown as UnknownRecord
  );
  const mergedDiscovered = mergeKnownValues(
    mergedDefault,
    discoveredConfig as UnknownRecord
  );
  const mergedOverride = mergeKnownValues(
    mergedDiscovered,
    overrideConfig as UnknownRecord
  );

  return preflightConfigSchema.parse(mergedOverride);
}

function buildFailureResult(
  preparation: PreparedScanContextFailure
): ScanResult {
  return {
    risk_level: "HIGH",
    risk_score: 100,
    likely_rejection: true,
    primary_reason: preparation.blockingIssues[0]?.title,
    blocking_issues: preparation.blockingIssues,
    warnings: [],
    passed_checks: [],
    reviewer_pack: buildEmptyReviewerPack(),
    discovery: preparation.discovery,
    evidence: preparation.discovery.evidence,
    missing_inputs: [],
    rule_coverage_note: getCoverageNote(preparation.translator),
    exit_code: 2,
    locale: preparation.translator.locale,
    scanned_at: new Date().toISOString(),
    config_path: preparation.configPath,
    config_warnings: preparation.configWarnings
  };
}

function prepareScanContext(
  options: Pick<ScanCommandOptions, "cwd" | "configPath" | "lang">
): PreparedScanContext {
  const translator = createTranslatorFromOptions(options.lang);
  const loadedConfig = loadConfigFromFile({
    cwd: options.cwd,
    configPath: options.configPath,
    translator
  });
  const discovery = discoverProject({
    cwd: options.cwd,
    translator
  });
  const configWarnings = loadedConfig.warnings.map((warning) => warning.message);
  const hasMeaningfulConfig =
    loadedConfig.ok && Object.keys(loadedConfig.fieldSources).length > 0;

  if (!loadedConfig.ok) {
    return {
      ok: false,
      translator,
      configPath: loadedConfig.configPath,
      configWarnings,
      discovery: discovery.report,
      blockingIssues: [
        loadedConfig.issue,
        ...(!discovery.ok ? [discovery.issue] : [])
      ]
    };
  }

  if (!discovery.ok && !hasMeaningfulConfig) {
    return {
      ok: false,
      translator,
      configPath: loadedConfig.configPath,
      configWarnings,
      discovery: discovery.report,
      blockingIssues: [discovery.issue]
    };
  }

  const discoveryReport = !discovery.ok
    ? {
        ...discovery.report,
        warnings: [
          ...discovery.report.warnings,
          translator.t("discovery.warning.configFallback")
        ]
      }
    : discovery.report;
  const config = mergeResolvedConfig(
    discovery.ok ? discovery.config : {},
    loadedConfig.config
  );
  const fieldSources = {
    ...collectFieldSources(defaultPreflightConfig, "default"),
    ...(discovery.ok ? discovery.fieldSources : {}),
    ...loadedConfig.fieldSources
  };
  const input = buildScanInput({
    config,
    configDir: loadedConfig.configDir,
    configPath: loadedConfig.configPath,
    projectRoot: discoveryReport.project_root,
    discovery: discoveryReport,
    fieldSources
  });

  return {
    ok: true,
    translator,
    configPath: loadedConfig.configPath,
    configWarnings,
    discovery: discoveryReport,
    input
  };
}

export function scanProject(options: ScanCommandOptions = {}): ScanResult {
  const preparation = prepareScanContext(options);

  if (!preparation.ok) {
    return buildFailureResult(preparation);
  }

  const ruleResults = evaluateRuleRegistry(preparation.input, preparation.translator);
  const reviewerPack = evaluateReviewerPack(preparation.input, preparation.translator);
  const missingInputs = collectMissingInputs(preparation.input, preparation.translator);
  const risk = assessRisk({
    blockingIssues: ruleResults.blockingIssues,
    warnings: ruleResults.warnings,
    passedChecks: ruleResults.passedChecks,
    reviewerPack,
    missingInputs
  });

  return {
    ...risk,
    primary_reason: risk.primary_reason ?? missingInputs[0]?.message,
    reviewer_pack: reviewerPack,
    discovery: preparation.discovery,
    evidence: preparation.discovery.evidence,
    missing_inputs: missingInputs,
    rule_coverage_note: getCoverageNote(preparation.translator),
    exit_code: getExitCode(risk.risk_level, options.strict),
    locale: preparation.translator.locale,
    scanned_at: new Date().toISOString(),
    config_path: preparation.configPath,
    config_warnings: preparation.configWarnings
  };
}

export function renderScanResult(
  result: ScanResult,
  options: Pick<ScanCommandOptions, "ci" | "json" | "lang" | "plain"> = {}
): string {
  const translator = createTranslatorFromOptions(options.lang ?? result.locale);

  if (options.json) {
    return formatJsonReport(result);
  }

  return formatHumanScanReport(result, translator, {
    ci: options.ci,
    plain: options.plain
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
  const preparation = prepareScanContext(options);

  if (!preparation.ok) {
    return {
      reviewerPack: buildEmptyReviewerPack(),
      locale: preparation.translator.locale,
      exitCode: 2,
      configPath: preparation.configPath
    };
  }

  const reviewerPack = evaluateReviewerPack(preparation.input, preparation.translator);

  return {
    reviewerPack,
    locale: preparation.translator.locale,
    exitCode: reviewerPack.status === "complete" ? 0 : 1,
    configPath: preparation.configPath
  };
}

export function renderReviewerPackResult(
  reviewerPack: ReviewerPackReport,
  options: Pick<ReviewerPackCommandOptions, "json" | "lang" | "plain"> = {}
): string {
  const translator = createTranslatorFromOptions(options.lang);

  if (options.json) {
    return formatReviewerPackJson(reviewerPack);
  }

  return formatHumanReviewerPack(reviewerPack, translator, {
    plain: options.plain
  });
}
