import type { RuleDefinition } from "../../types";
import type { ScanInput } from "../../scanner/build-scan-input";

const LAST_VERIFIED = "2026-03-23";

export const privacyRules: RuleDefinition<ScanInput>[] = [
  {
    id: "PRIVACY_001",
    guideline: "5.1 Privacy",
    category: "privacy",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.PRIVACY_001.title",
    messageKey: "issue.PRIVACY_001.message",
    fixKey: "issue.PRIVACY_001.fix",
    evaluate(input) {
      return !input.config.privacy.policyUrl || !input.config.privacy.policyReachable
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "PRIVACY_002",
    guideline: "5.1 Privacy",
    category: "privacy",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.PRIVACY_002.title",
    messageKey: "issue.PRIVACY_002.message",
    fixKey: "issue.PRIVACY_002.fix",
    evaluate(input) {
      return !input.config.privacy.nutritionLabelComplete
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "PRIVACY_003",
    guideline: "5.1 Privacy",
    category: "privacy",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.PRIVACY_003.title",
    messageKey: "issue.PRIVACY_003.message",
    fixKey: "issue.PRIVACY_003.fix",
    evaluate(input) {
      return input.config.privacy.trackingUsed &&
        !input.config.privacy.trackingUsageDescriptionPresent
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "PRIVACY_004",
    guideline: "5.1 Privacy",
    category: "privacy",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.PRIVACY_004.title",
    messageKey: "issue.PRIVACY_004.message",
    fixKey: "issue.PRIVACY_004.fix",
    evaluate(input) {
      return !input.config.privacy.requiredReasonApisDeclared
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "PRIVACY_005",
    guideline: "5.1 Privacy",
    category: "privacy",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.PRIVACY_005.title",
    messageKey: "issue.PRIVACY_005.message",
    fixKey: "issue.PRIVACY_005.fix",
    evaluate(input) {
      return !input.config.privacy.dataCollectionMatchesLabel
        ? { passed: false }
        : { passed: true };
    }
  }
];

