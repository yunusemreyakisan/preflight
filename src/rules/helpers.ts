import type {
  Issue,
  PassedCheck,
  RuleDefinition,
  RuleEvaluationFailure,
  RuleCategory,
  Severity,
  Translator
} from "../types";
import type { ScanInput } from "../scanner/build-scan-input";

const severityOrder: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2
};

const categoryOrder: Record<RuleCategory, number> = {
  configuration: 0,
  "reviewer-access": 1,
  "app-completeness": 2,
  metadata: 3,
  privacy: 4,
  "business-iap": 5,
  content: 6
};

export function createIssueFromRule(
  rule: RuleDefinition<ScanInput>,
  failure: RuleEvaluationFailure,
  translator: Translator
): Issue {
  return {
    id: rule.id,
    title: translator.t(rule.titleKey, failure.vars),
    guideline: rule.guideline,
    severity: rule.severity,
    category: rule.category,
    message: translator.t(rule.messageKey, failure.vars),
    fix: translator.t(rule.fixKey, failure.vars),
    lastVerified: rule.lastVerified,
    details: failure.details,
    autoFixTemplate: rule.autoFixTemplateKey
      ? translator.t(rule.autoFixTemplateKey, failure.autoFixVars ?? failure.vars)
      : undefined
  };
}

export function createPassedCheck(
  rule: RuleDefinition<ScanInput>,
  translator: Translator
): PassedCheck {
  return {
    id: rule.id,
    title: translator.t("output.passedCheckTitle", {
      id: rule.id
    }),
    category: rule.category,
    lastVerified: rule.lastVerified
  };
}

export function compareIssues(left: Issue, right: Issue): number {
  return (
    severityOrder[left.severity] - severityOrder[right.severity] ||
    categoryOrder[left.category] - categoryOrder[right.category] ||
    left.id.localeCompare(right.id)
  );
}
