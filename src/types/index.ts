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
export type FieldSource = "default" | "discovered" | "app-store-connect" | "config";
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

export interface ReviewReadinessItem {
  key: string;
  label: string;
  status: "pass" | "fail";
  value?: string;
  source?: FieldSource | "missing";
}

export interface ReviewReadinessReport {
  status: "complete" | "incomplete";
  items: ReviewReadinessItem[];
  missing: string[];
  notes: string[];
  suggestedReviewNotes?: string;
}

export type AppStoreConnectStatus = "connected" | "skipped" | "unavailable";
export type AppStoreConnectAuthSource = "env" | "local-config";
export type AppStoreConnectComparisonStatus =
  | "match"
  | "mismatch"
  | "remote-only"
  | "local-only";

export interface AppStoreConnectInteractiveRuntime {
  configPath?: string;
  cwd?: string;
  isInteractive?: boolean;
  prompt?: (question: string) => Promise<string>;
  openUrl?: (url: string) => Promise<boolean>;
}

export interface AppStoreConnectValueCheck {
  key: string;
  label: string;
  status: AppStoreConnectComparisonStatus;
  local_value?: string;
  remote_value?: string;
}

export interface AppStoreConnectScreenshotCheck {
  locale: string;
  device_type: string;
  status: AppStoreConnectComparisonStatus;
  local_count: number;
  remote_count: number;
}

export interface AppStoreConnectIapCheck {
  product_id: string;
  status: AppStoreConnectComparisonStatus;
  local_display_name?: string;
  remote_display_name?: string;
  remote_state?: string;
  has_price_schedule?: boolean;
}

export interface AppStoreConnectSummary {
  value_matches: number;
  value_mismatches: number;
  value_remote_only: number;
  value_local_only: number;
  screenshot_matches: number;
  screenshot_mismatches: number;
  screenshot_remote_only: number;
  screenshot_local_only: number;
  iap_matches: number;
  iap_mismatches: number;
  iap_remote_only: number;
  iap_local_only: number;
}

export interface AppStoreConnectReport {
  status: AppStoreConnectStatus;
  auth_source?: AppStoreConnectAuthSource;
  app_id?: string;
  app_name?: string;
  bundle_id?: string;
  version_id?: string;
  version_string?: string;
  version_state?: string;
  version_source?: "editable" | "latest-live" | "latest-any";
  missing_env: string[];
  value_checks: AppStoreConnectValueCheck[];
  screenshot_checks: AppStoreConnectScreenshotCheck[];
  iap_checks: AppStoreConnectIapCheck[];
  available_territories: string[];
  has_app_price_schedule?: boolean;
  review_attachment_count?: number;
  warnings: string[];
  notes: string[];
  summary: AppStoreConnectSummary;
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

export type NextStepPriority = "now" | "soon" | "later";
export type NextStepKind =
  | "missing-input"
  | "issue-fix"
  | "config-followup"
  | "app-store-connect-followup";

export interface NextStep {
  id: string;
  title: string;
  detail: string;
  priority: NextStepPriority;
  kind: NextStepKind;
  related_issue_ids?: string[];
  config_paths?: string[];
  suggested_value?: string;
}

export interface ScanResult extends RiskReport {
  review_readiness: ReviewReadinessReport;
  app_store_connect: AppStoreConnectReport;
  discovery: DiscoveryReport;
  evidence: DiscoveryEvidence[];
  missing_inputs: MissingInput[];
  next_steps: NextStep[];
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
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  skipAppStoreConnect?: boolean;
  plain?: boolean;
  strict?: boolean;
  lang?: string;
  allowInteractiveAppStoreConnectSetup?: boolean;
  appStoreConnectRuntime?: AppStoreConnectInteractiveRuntime;
}

export interface ReviewReadinessCommandOptions {
  configPath?: string;
  cwd?: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  json?: boolean;
  plain?: boolean;
  lang?: string;
  appStoreConnectRuntime?: AppStoreConnectInteractiveRuntime;
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
