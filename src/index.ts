export { buildProgram, main } from "./cli/index";
export { runInit, type RunInitResult } from "./cli/commands/init";
export { runReviewerPack, type RunReviewerPackResult } from "./cli/commands/reviewer-pack";
export { runRules, type RunRulesResult } from "./cli/commands/rules";
export { runScan, type RunScanResult } from "./cli/commands/scan";
export { SUPPORTED_LOCALES } from "./types";
export {
  preflightConfigSchema,
  type PreflightConfig,
  normalizePreflightConfig
} from "./config/schema";
export {
  loadConfigFromFile,
  resolveConfigPath,
  type LoadedConfigResult
} from "./config/load-config";
export { createTranslator, resolveLocale, resolveLocaleFromArgv } from "./i18n";
export { formatJsonReport, formatReviewerPackJson, formatRulesJson } from "./output/format-json";
export {
  formatHumanReviewerPack,
  formatHumanScanReport,
  formatRulesTable
} from "./output/format-human";
export { generateReviewerPackTemplate } from "./reviewer-pack/generator";
export { evaluateReviewerPack } from "./reviewer-pack/evaluate-reviewer-pack";
export { assessRisk, getExitCode } from "./risk/assess-risk";
export { RULE_REGISTRY, RULESET_METADATA, evaluateRuleRegistry } from "./rules/registry";
export {
  buildReviewerPackReport,
  renderReviewerPackResult,
  renderScanResult,
  scanProject
} from "./scanner/scan-project";
export type {
  ConfigWarning,
  InitCommandOptions,
  Issue,
  PassedCheck,
  ReviewerPackCommandOptions,
  ReviewerPackItem,
  ReviewerPackReport,
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
