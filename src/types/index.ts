export type Severity = "low" | "medium" | "high";

export type RuleCategory =
  | "configuration"
  | "reviewer-access"
  | "app-completeness"
  | "metadata"
  | "privacy"
  | "business-iap"
  | "content";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type HumanOutputMode = "plain" | "branded";
export type FieldSource = "default" | "discovered" | "config";
export type AnnotationTarget = "github";
export type ProjectType =
  | "native-ios"
  | "flutter-ios"
  | "react-native-ios"
  | "unknown";

export const SUPPORTED_LOCALES = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "it",
  "pt-BR",
  "ja",
  "ko",
  "zh-CN"
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface TranslationVars {
  [key: string]: string | number | boolean | undefined;
}

export interface Translator {
  locale: SupportedLocale;
  t: (key: string, vars?: TranslationVars) => string;
}

export interface ScreenshotAssetStatus {
  absolutePath: string;
  declaredPath: string;
  deviceType: string;
  locales: string[];
  exists: boolean;
}

export interface ConfigWarning {
  code: string;
  message: string;
}

export interface DiscoveryEvidence {
  key: string;
  source: string;
  value?: string;
  detail?: string;
}

export interface ResolvedField<TValue = unknown> {
  key: string;
  value: TValue;
  known: boolean;
  source: FieldSource;
  evidence: DiscoveryEvidence[];
}

export interface DiscoveryReport {
  project_type: ProjectType;
  project_root: string;
  ios_root?: string;
  xcodeproj_path?: string;
  info_plist_path?: string;
  entitlements_path?: string;
  privacy_manifest_path?: string;
  capability_hints: string[];
  sources: string[];
  warnings: string[];
  evidence: DiscoveryEvidence[];
}

export interface MissingInput {
  key: string;
  label: string;
  category: RuleCategory;
  severity: Severity;
  message: string;
}

export interface Issue {
  id: string;
  title: string;
  guideline: string;
  severity: Severity;
  category: RuleCategory;
  message: string;
  fix: string;
  lastVerified: string;
  details?: string[];
  autoFixTemplate?: string;
}

export interface PassedCheck {
  id: string;
  title: string;
  category: RuleCategory;
  lastVerified: string;
}

export interface RuleEvaluationFailure {
  passed: false;
  details?: string[];
  vars?: TranslationVars;
  autoFixVars?: TranslationVars;
}

export interface RuleEvaluationPass {
  passed: true;
}

export type RuleEvaluation = RuleEvaluationPass | RuleEvaluationFailure;

export interface RuleDefinition<TInput> {
  id: string;
  guideline: string;
  category: RuleCategory;
  severity: Severity;
  lastVerified: string;
  titleKey: string;
  messageKey: string;
  fixKey: string;
  autoFixTemplateKey?: string;
  evaluate: (input: TInput) => RuleEvaluation;
}

export interface RuleVersionMetadata {
  version: string;
  lastVerified: string;
  remoteUpdatesAvailable: boolean;
}

export interface ReviewerPackItem {
  key: string;
  label: string;
  status: "pass" | "fail";
  value?: string;
  source?: FieldSource | "missing";
}

export interface ReviewerPackReport {
  status: "complete" | "incomplete";
  items: ReviewerPackItem[];
  missing: string[];
  notes: string[];
  generatedReviewNotesTemplate?: string;
}

export interface RiskReport {
  risk_level: RiskLevel;
  risk_score: number;
  likely_rejection: boolean;
  primary_reason?: string;
  blocking_issues: Issue[];
  warnings: Issue[];
  passed_checks: PassedCheck[];
}

export interface BaselineIssueDiff {
  new_ids: string[];
  resolved_ids: string[];
}

export interface BaselineMissingInputDiff {
  new_keys: string[];
  resolved_keys: string[];
}

export interface BaselineComparisonSummary {
  new_items: number;
  resolved_items: number;
}

export interface BaselineComparison {
  path: string;
  baseline_scanned_at?: string;
  has_changes: boolean;
  summary: BaselineComparisonSummary;
  blocking_issues: BaselineIssueDiff;
  warnings: BaselineIssueDiff;
  missing_inputs: BaselineMissingInputDiff;
}

export interface ScanResult extends RiskReport {
  reviewer_pack: ReviewerPackReport;
  discovery: DiscoveryReport;
  evidence: DiscoveryEvidence[];
  missing_inputs: MissingInput[];
  baseline?: BaselineComparison;
  rule_coverage_note: string;
  exit_code: number;
  locale: SupportedLocale;
  scanned_at: string;
  config_path: string;
  config_warnings: string[];
}

export interface ScanCommandOptions {
  configPath?: string;
  cwd?: string;
  ci?: boolean;
  json?: boolean;
  baselinePath?: string;
  annotations?: AnnotationTarget | string;
  plain?: boolean;
  strict?: boolean;
  lang?: string;
}

export interface ReviewerPackCommandOptions {
  configPath?: string;
  cwd?: string;
  json?: boolean;
  plain?: boolean;
  lang?: string;
}

export interface RulesCommandOptions {
  json?: boolean;
  plain?: boolean;
  update?: boolean;
  lang?: string;
}

export interface InitCommandOptions {
  cwd?: string;
  outputPath?: string;
  force?: boolean;
  lang?: string;
}
