import { completenessRules } from "./completeness";
import { contentRules } from "./content";
import { createIssueFromRule, createPassedCheck, compareIssues } from "./helpers";
import { iapRules } from "./iap";
import { metadataRules } from "./metadata";
import { privacyRules } from "./privacy";
import { reviewerRules } from "./reviewer";
import type { Issue, PassedCheck, RuleDefinition, RuleVersionMetadata, Translator } from "../types";
import type { ScanInput } from "../scanner/build-scan-input";

export const RULESET_METADATA: RuleVersionMetadata = {
  version: "2.0.0",
  lastVerified: "2026-03-23",
  remoteUpdatesAvailable: false
};

export const RULE_REGISTRY: RuleDefinition<ScanInput>[] = [
  ...reviewerRules,
  ...completenessRules,
  ...metadataRules,
  ...privacyRules,
  ...iapRules,
  ...contentRules
];

export interface RuleExecutionResult {
  blockingIssues: Issue[];
  warnings: Issue[];
  passedChecks: PassedCheck[];
}

export function evaluateRuleRegistry(
  input: ScanInput,
  translator: Translator
): RuleExecutionResult {
  const blockingIssues: Issue[] = [];
  const warnings: Issue[] = [];
  const passedChecks: PassedCheck[] = [];

  for (const rule of RULE_REGISTRY) {
    const result = rule.evaluate(input);

    if (result.passed) {
      passedChecks.push(createPassedCheck(rule, translator));
      continue;
    }

    const issue = createIssueFromRule(rule, result, translator);

    if (issue.severity === "high") {
      blockingIssues.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  blockingIssues.sort(compareIssues);
  warnings.sort(compareIssues);
  passedChecks.sort((left, right) => left.id.localeCompare(right.id));

  return {
    blockingIssues,
    warnings,
    passedChecks
  };
}

