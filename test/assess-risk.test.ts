import { describe, expect, it } from "vitest";

import {
  assessRisk,
  getExitCode,
  type Issue,
  type PassedCheck,
  type ReviewReadinessReport
} from "../src";

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: "TEST_001",
    title: "Test issue",
    guideline: "2.1 App Completeness",
    severity: "medium",
    category: "metadata",
    message: "A test issue",
    fix: "Fix it",
    lastVerified: "2026-03-23",
    ...overrides
  };
}

const reviewReadinessComplete: ReviewReadinessReport = {
  status: "complete",
  items: [],
  missing: [],
  notes: [],
  suggestedReviewNotes: ""
};

const passedChecks: PassedCheck[] = [
  {
    id: "PASS_001",
    title: "Passed rule",
    category: "metadata",
    lastVerified: "2026-03-23"
  }
];

describe("assessRisk", () => {
  it("maps blocking issues to HIGH risk", () => {
    const result = assessRisk({
      blockingIssues: [issue({ severity: "high" })],
      warnings: [],
      passedChecks,
      reviewReadiness: reviewReadinessComplete
    });

    expect(result.risk_level).toBe("HIGH");
    expect(result.likely_rejection).toBe(true);
    expect(getExitCode(result.risk_level)).toBe(2);
  });

  it("maps medium warnings to MEDIUM risk", () => {
    const result = assessRisk({
      blockingIssues: [],
      warnings: [issue({ id: "WARN_001", severity: "medium" })],
      passedChecks,
      reviewReadiness: reviewReadinessComplete
    });

    expect(result.risk_level).toBe("MEDIUM");
    expect(result.likely_rejection).toBe(false);
    expect(getExitCode(result.risk_level)).toBe(1);
  });

  it("keeps low-only runs at LOW risk", () => {
    const result = assessRisk({
      blockingIssues: [],
      warnings: [issue({ severity: "low" })],
      passedChecks,
      reviewReadiness: reviewReadinessComplete
    });

    expect(result.risk_level).toBe("LOW");
    expect(getExitCode(result.risk_level)).toBe(0);
  });

  it("upgrades medium risk to blocking in strict mode", () => {
    expect(getExitCode("MEDIUM", true)).toBe(2);
  });
});
