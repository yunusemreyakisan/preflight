import { fetchAppStoreConnectData } from "../app-store-connect/read-app-store-connect";
import { loadConfigFromFile } from "../config/load-config";
import { collectFieldSources, mergeKnownValues } from "../config/object-helpers";
import {
  defaultPreflightConfig,
  preflightConfigSchema,
  type PreflightConfigOverride
} from "../config/schema";
import { discoverProject } from "../discovery/discover-project";
import { createTranslator, resolveLocale } from "../i18n";
import { formatJsonReport, formatReviewReadinessJson } from "../output/format-json";
import {
  formatHumanReviewReadiness,
  formatHumanScanReport
} from "../output/format-human";
import { evaluateReviewReadiness } from "../review-readiness/evaluate-review-readiness";
import { assessRisk, getExitCode } from "../risk/assess-risk";
import { evaluateRuleRegistry, RULE_REGISTRY } from "../rules/registry";
import { buildScanInput, collectMissingInputs } from "./build-scan-input";
import { compareAgainstBaseline } from "./compare-baseline";
import type {
  AppStoreConnectReport,
  DiscoveryReport,
  FieldSource,
  Issue,
  ReviewReadinessCommandOptions,
  ReviewReadinessReport,
  ScanCommandOptions,
  ScanResult,
  Translator
} from "../types";

type UnknownRecord = Record<string, unknown>;

interface PreparedLocalScanContextSuccess {
  ok: true;
  configDir: string;
  configPath: string;
  configWarnings: string[];
  discoveredConfig: PreflightConfigOverride;
  discovery: DiscoveryReport;
  discoveryFieldSources: Record<string, FieldSource>;
  localInput: ReturnType<typeof buildScanInput>;
  overrideConfig: PreflightConfigOverride;
  overrideFieldSources: Record<string, FieldSource>;
  translator: Translator;
}

interface PreparedLocalScanContextFailure {
  ok: false;
  configPath: string;
  configWarnings: string[];
  discovery: DiscoveryReport;
  blockingIssues: Issue[];
  translator: Translator;
}

type PreparedLocalScanContext =
  | PreparedLocalScanContextSuccess
  | PreparedLocalScanContextFailure;

interface PreparedScanContextSuccess {
  ok: true;
  appStoreConnect: AppStoreConnectReport;
  configPath: string;
  configWarnings: string[];
  discovery: DiscoveryReport;
  input: ReturnType<typeof buildScanInput>;
  translator: Translator;
}

interface PreparedScanContextFailure {
  ok: false;
  appStoreConnect: AppStoreConnectReport;
  blockingIssues: Issue[];
  configPath: string;
  configWarnings: string[];
  discovery: DiscoveryReport;
  translator: Translator;
}

type PreparedScanContext = PreparedScanContextSuccess | PreparedScanContextFailure;

function buildEmptyReviewReadiness(): ReviewReadinessReport {
  return {
    status: "incomplete",
    items: [],
    missing: ["Valid configuration"],
    notes: ["Fix the configuration before relying on review readiness output."],
    suggestedReviewNotes: undefined
  };
}

function buildAppStoreConnectReport(
  status: AppStoreConnectReport["status"],
  warnings: string[] = [],
  notes: string[] = [],
  missingEnv: string[] = []
): AppStoreConnectReport {
  return {
    status,
    missing_env: missingEnv,
    value_checks: [],
    screenshot_checks: [],
    iap_checks: [],
    available_territories: [],
    warnings,
    notes,
    summary: {
      value_matches: 0,
      value_mismatches: 0,
      value_remote_only: 0,
      value_local_only: 0,
      screenshot_matches: 0,
      screenshot_mismatches: 0,
      screenshot_remote_only: 0,
      screenshot_local_only: 0,
      iap_matches: 0,
      iap_mismatches: 0,
      iap_remote_only: 0,
      iap_local_only: 0
    }
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

function mergeResolvedConfig(...sources: PreflightConfigOverride[]) {
  const mergedDefault = mergeKnownValues(
    {},
    defaultPreflightConfig as unknown as UnknownRecord
  );

  sources.forEach((source) => {
    mergeKnownValues(mergedDefault, source as UnknownRecord);
  });

  return preflightConfigSchema.parse(mergedDefault);
}

function removeEmptyStringOverrides(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => removeEmptyStringOverrides(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value !== null && typeof value === "object") {
    const next: UnknownRecord = {};

    Object.entries(value as UnknownRecord).forEach(([key, entry]) => {
      const normalized = removeEmptyStringOverrides(entry);

      if (normalized !== undefined) {
        next[key] = normalized;
      }
    });

    return Object.keys(next).length > 0 ? next : undefined;
  }

  if (typeof value === "string") {
    return value.trim() ? value : undefined;
  }

  return value;
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
    review_readiness: buildEmptyReviewReadiness(),
    app_store_connect: preparation.appStoreConnect,
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

function withBaselineComparison(
  result: ScanResult,
  options: Pick<ScanCommandOptions, "baselinePath" | "cwd">,
  translator: Translator
): ScanResult {
  if (!options.baselinePath) {
    return result;
  }

  return {
    ...result,
    baseline: compareAgainstBaseline(result, {
      baselinePath: options.baselinePath,
      cwd: options.cwd,
      translator
    })
  };
}

function prepareLocalScanContext(
  options: Pick<ScanCommandOptions, "cwd" | "configPath" | "lang">
): PreparedLocalScanContext {
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
  const discoveredConfig = discovery.ok ? discovery.config : {};
  const discoveryFieldSources = discovery.ok ? discovery.fieldSources : {};
  const localConfig = mergeResolvedConfig(discoveredConfig, loadedConfig.config);
  const localFieldSources = {
    ...collectFieldSources(defaultPreflightConfig, "default"),
    ...discoveryFieldSources,
    ...loadedConfig.fieldSources
  };
  const localInput = buildScanInput({
    config: localConfig,
    configDir: loadedConfig.configDir,
    configPath: loadedConfig.configPath,
    projectRoot: discoveryReport.project_root,
    discovery: discoveryReport,
    fieldSources: localFieldSources
  });

  return {
    ok: true,
    translator,
    configDir: loadedConfig.configDir,
    configPath: loadedConfig.configPath,
    configWarnings,
    discoveredConfig,
    discovery: discoveryReport,
    discoveryFieldSources,
    overrideConfig: loadedConfig.config,
    overrideFieldSources: loadedConfig.fieldSources,
    localInput
  };
}

async function prepareScanContext(
  options: Pick<
    ScanCommandOptions,
    | "allowInteractiveAppStoreConnectSetup"
    | "appStoreConnectRuntime"
    | "configPath"
    | "cwd"
    | "env"
    | "fetchImpl"
    | "lang"
    | "skipAppStoreConnect"
  >
): Promise<PreparedScanContext> {
  const localPreparation = prepareLocalScanContext(options);

  if (!localPreparation.ok) {
    return {
      ...localPreparation,
      appStoreConnect: buildAppStoreConnectReport(
        "skipped",
        [],
        [localPreparation.translator.t("appStoreConnect.note.localPreparationFailed")]
      )
    };
  }

  const appStoreConnectSync = await fetchAppStoreConnectData({
    allowInteractiveSetup: options.allowInteractiveAppStoreConnectSetup,
    baseConfig: localPreparation.localInput.config,
    env: options.env,
    fetchImpl: options.fetchImpl,
    runtime: options.appStoreConnectRuntime,
    screenshotAssets: localPreparation.localInput.screenshotAssets,
    skip: options.skipAppStoreConnect,
    translator: localPreparation.translator
  });
  const remoteCompatibleOverride =
    (removeEmptyStringOverrides(localPreparation.overrideConfig) as
      | PreflightConfigOverride
      | undefined) ?? {};
  const config = mergeResolvedConfig(
    localPreparation.discoveredConfig,
    appStoreConnectSync.config,
    remoteCompatibleOverride
  );
  const fieldSources = {
    ...collectFieldSources(defaultPreflightConfig, "default"),
    ...localPreparation.discoveryFieldSources,
    ...appStoreConnectSync.fieldSources,
    ...collectFieldSources(remoteCompatibleOverride, "config")
  };
  const input = buildScanInput({
    config,
    configDir: localPreparation.configDir,
    configPath: localPreparation.configPath,
    projectRoot: localPreparation.discovery.project_root,
    discovery: localPreparation.discovery,
    fieldSources
  });

  return {
    ok: true,
    translator: localPreparation.translator,
    configPath: localPreparation.configPath,
    configWarnings: localPreparation.configWarnings,
    discovery: localPreparation.discovery,
    appStoreConnect: appStoreConnectSync.report,
    input
  };
}

export async function scanProject(options: ScanCommandOptions = {}): Promise<ScanResult> {
  const preparation = await prepareScanContext(options);

  if (!preparation.ok) {
    return withBaselineComparison(
      buildFailureResult(preparation),
      options,
      preparation.translator
    );
  }

  const ruleResults = evaluateRuleRegistry(preparation.input, preparation.translator);
  const reviewReadiness = evaluateReviewReadiness(preparation.input, preparation.translator);
  const missingInputs = collectMissingInputs(preparation.input, preparation.translator);
  const risk = assessRisk({
    blockingIssues: ruleResults.blockingIssues,
    warnings: ruleResults.warnings,
    passedChecks: ruleResults.passedChecks,
    reviewReadiness,
    missingInputs
  });

  return withBaselineComparison(
    {
      ...risk,
      primary_reason: risk.primary_reason ?? missingInputs[0]?.message,
      review_readiness: reviewReadiness,
      app_store_connect: preparation.appStoreConnect,
      discovery: preparation.discovery,
      evidence: preparation.discovery.evidence,
      missing_inputs: missingInputs,
      rule_coverage_note: getCoverageNote(preparation.translator),
      exit_code: getExitCode(risk.risk_level, options.strict),
      locale: preparation.translator.locale,
      scanned_at: new Date().toISOString(),
      config_path: preparation.configPath,
      config_warnings: preparation.configWarnings
    },
    options,
    preparation.translator
  );
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

export async function buildReviewReadinessReport(
  options: ReviewReadinessCommandOptions = {}
): Promise<{
  reviewReadiness: ReviewReadinessReport;
  locale: ReturnType<typeof createTranslatorFromOptions>["locale"];
  exitCode: number;
  configPath: string;
  appStoreConnect: AppStoreConnectReport;
}> {
  const preparation = await prepareScanContext(options);

  if (!preparation.ok) {
    return {
      reviewReadiness: buildEmptyReviewReadiness(),
      locale: preparation.translator.locale,
      exitCode: 2,
      configPath: preparation.configPath,
      appStoreConnect: preparation.appStoreConnect
    };
  }

  const reviewReadiness = evaluateReviewReadiness(
    preparation.input,
    preparation.translator
  );

  return {
    reviewReadiness,
    locale: preparation.translator.locale,
    exitCode: reviewReadiness.status === "complete" ? 0 : 1,
    configPath: preparation.configPath,
    appStoreConnect: preparation.appStoreConnect
  };
}

export function renderReviewReadinessResult(
  reviewReadiness: ReviewReadinessReport,
  options: Pick<ReviewReadinessCommandOptions, "json" | "lang" | "plain"> = {}
): string {
  const translator = createTranslatorFromOptions(options.lang);

  if (options.json) {
    return formatReviewReadinessJson(reviewReadiness);
  }

  return formatHumanReviewReadiness(reviewReadiness, translator, {
    plain: options.plain
  });
}
