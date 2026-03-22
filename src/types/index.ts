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

export interface ScanResult extends RiskReport {
  reviewer_pack: ReviewerPackReport;
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
  strict?: boolean;
  lang?: string;
}

export interface ReviewerPackCommandOptions {
  configPath?: string;
  cwd?: string;
  json?: boolean;
  lang?: string;
}

export interface RulesCommandOptions {
  json?: boolean;
  update?: boolean;
  lang?: string;
}

export interface InitCommandOptions {
  cwd?: string;
  outputPath?: string;
  force?: boolean;
  lang?: string;
}

