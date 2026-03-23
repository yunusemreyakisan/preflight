import type { RuleDefinition } from "../../types";
import type { ScanInput } from "../../scanner/build-scan-input";

const LAST_VERIFIED = "2026-03-23";

export const reviewerRules: RuleDefinition<ScanInput>[] = [
  {
    id: "REVIEWER_001",
    guideline: "2.1 App Completeness",
    category: "reviewer-access",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.REVIEWER_001.title",
    messageKey: "issue.REVIEWER_001.message",
    fixKey: "issue.REVIEWER_001.fix",
    evaluate(input) {
      return input.effectiveDemoAccountRequired && !input.hasDemoAccountObject
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "REVIEWER_002",
    guideline: "2.1 App Completeness",
    category: "reviewer-access",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.REVIEWER_002.title",
    messageKey: "issue.REVIEWER_002.message",
    fixKey: "issue.REVIEWER_002.fix",
    evaluate(input) {
      return input.effectiveDemoAccountRequired && !input.hasValidDemoCredentialFormat
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "REVIEWER_003",
    guideline: "2.1 App Completeness",
    category: "reviewer-access",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.REVIEWER_003.title",
    messageKey: "issue.REVIEWER_003.message",
    fixKey: "issue.REVIEWER_003.fix",
    evaluate(input) {
      return input.config.appCapabilities.loginRequired && !input.loginDocumented
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "REVIEWER_004",
    guideline: "App Review Information",
    category: "reviewer-access",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.REVIEWER_004.title",
    messageKey: "issue.REVIEWER_004.message",
    fixKey: "issue.REVIEWER_004.fix",
    evaluate(input) {
      return !input.hasCompleteReviewerContact ? { passed: false } : { passed: true };
    }
  },
  {
    id: "REVIEWER_005",
    guideline: "2.1 App Completeness",
    category: "reviewer-access",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.REVIEWER_005.title",
    messageKey: "issue.REVIEWER_005.message",
    fixKey: "issue.REVIEWER_005.fix",
    evaluate(input) {
      return (
        input.isFieldExplicitlyTrue("appCapabilities.regionRestricted") ||
        input.isFieldExplicitlyTrue("appCapabilities.vpnRequired")
      ) &&
        !input.regionRestrictionDocumented
        ? { passed: false }
        : { passed: true };
    }
  }
];
