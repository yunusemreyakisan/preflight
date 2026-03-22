import type { Issue, ReviewerPackReport, RiskLevel, RiskReport, Severity } from "../types";

const severityWeights: Record<Severity, number> = {
  high: 30,
  medium: 12,
  low: 4
};

export function assessRisk(options: {
  blockingIssues: Issue[];
  warnings: Issue[];
  passedChecks: RiskReport["passed_checks"];
  reviewerPack: ReviewerPackReport;
}): RiskReport {
  const warningSeverityCounts = options.warnings.reduce<Record<Severity, number>>(
    (counts, issue) => {
      counts[issue.severity] += 1;
      return counts;
    },
    {
      high: 0,
      medium: 0,
      low: 0
    }
  );

  const issueScore =
    options.blockingIssues.reduce((total, issue) => total + severityWeights[issue.severity], 0) +
    options.warnings.reduce((total, issue) => total + severityWeights[issue.severity], 0) +
    (options.reviewerPack.status === "incomplete" ? 10 : 0);

  let riskLevel: RiskLevel = "LOW";

  if (options.blockingIssues.length > 0) {
    riskLevel = "HIGH";
  } else if (warningSeverityCounts.medium > 0) {
    riskLevel = "MEDIUM";
  }

  const primaryIssue = options.blockingIssues[0] ?? options.warnings[0];

  return {
    risk_level: riskLevel,
    risk_score: Math.min(100, issueScore),
    likely_rejection: riskLevel === "HIGH",
    primary_reason: primaryIssue?.title,
    blocking_issues: options.blockingIssues,
    warnings: options.warnings,
    passed_checks: options.passedChecks
  };
}

export function getExitCode(riskLevel: RiskLevel, strict = false): number {
  if (riskLevel === "HIGH") {
    return 2;
  }

  if (riskLevel === "MEDIUM") {
    return strict ? 2 : 1;
  }

  return 0;
}
