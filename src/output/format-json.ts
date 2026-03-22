import type { ReviewerPackReport, RuleDefinition, RuleVersionMetadata, ScanResult } from "../types";

export function formatJsonReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatReviewerPackJson(reviewerPack: ReviewerPackReport): string {
  return JSON.stringify(reviewerPack, null, 2);
}

export function formatRulesJson(
  rules: RuleDefinition<any>[],
  metadata: RuleVersionMetadata
): string {
  return JSON.stringify(
    {
      metadata,
      rules: rules.map((rule) => ({
        id: rule.id,
        guideline: rule.guideline,
        category: rule.category,
        severity: rule.severity,
        lastVerified: rule.lastVerified
      }))
    },
    null,
    2
  );
}
