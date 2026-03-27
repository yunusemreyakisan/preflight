export { buildProgram, main } from "./cli/index";
export { runInit, type RunInitResult } from "./cli/commands/init";
export { runRules, type RunRulesResult } from "./cli/commands/rules";
export { runScan, type RunScanResult } from "./cli/commands/scan";
export { fetchAppStoreConnectData } from "./app-store-connect/read-app-store-connect";
export { SUPPORTED_LOCALES } from "./types";
export {
  preflightConfigSchema,
  preflightConfigOverrideSchema,
  defaultPreflightConfig,
  type PreflightConfig,
  type PreflightConfigOverride,
  normalizePreflightConfigOverride,
  normalizePreflightConfig
} from "./config/schema";
export {
  loadConfigFromFile,
  resolveConfigPath,
  type LoadedConfigResult
} from "./config/load-config";
export { createTranslator, resolveLocale, resolveLocaleFromArgv } from "./i18n";
export { formatJsonReport, formatReviewReadinessJson, formatRulesJson } from "./output/format-json";
export {
  formatHumanReviewReadiness,
  formatHumanScanReport,
  formatRulesTable
} from "./output/format-human";
export { generateSuggestedReviewNotes } from "./review-readiness/generator";
export { evaluateReviewReadiness } from "./review-readiness/evaluate-review-readiness";
export { assessRisk, getExitCode } from "./risk/assess-risk";
export { RULE_REGISTRY, RULESET_METADATA, evaluateRuleRegistry } from "./rules/registry";
export { discoverProject } from "./discovery/discover-project";
export {
  buildReviewReadinessReport,
  renderReviewReadinessResult,
  renderScanResult,
  scanProject
} from "./scanner/scan-project";
export { buildScanInput, collectMissingInputs } from "./scanner/build-scan-input";
export type {
  AppStoreConnectAuthSource,
  AppStoreConnectComparisonStatus,
  AppStoreConnectInteractiveRuntime,
  AppStoreConnectIapCheck,
  AppStoreConnectReport,
  AppStoreConnectScreenshotCheck,
  AppStoreConnectStatus,
  AppStoreConnectSummary,
  AppStoreConnectValueCheck,
  AnnotationTarget,
  BaselineComparison,
  BaselineComparisonSummary,
  BaselineIssueDiff,
  BaselineMissingInputDiff,
  ConfigWarning,
  DiscoveryEvidence,
  DiscoveryReport,
  FieldSource,
  InitCommandOptions,
  Issue,
  MissingInput,
  NextStep,
  NextStepKind,
  NextStepPriority,
  PassedCheck,
  ProjectType,
  ResolvedField,
  ReviewReadinessCommandOptions,
  ReviewReadinessItem,
  ReviewReadinessReport,
  RiskLevel,
  RiskReport,
  RuleCategory,
  RuleDefinition,
  RuleEvaluation,
  RuleVersionMetadata,
  RulesCommandOptions,
  ScanCommandOptions,
  ScanResult,
  ScreenshotAssetStatus,
  Severity,
  SupportedLocale,
  Translator
} from "./types";
