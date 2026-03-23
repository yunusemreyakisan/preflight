import type { RuleDefinition } from "../../types";
import type { ScanInput } from "../../scanner/build-scan-input";

const LAST_VERIFIED = "2026-03-23";

export const completenessRules: RuleDefinition<ScanInput>[] = [
  {
    id: "COMPLETE_001",
    guideline: "2.1 App Completeness",
    category: "app-completeness",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.COMPLETE_001.title",
    messageKey: "issue.COMPLETE_001.message",
    fixKey: "issue.COMPLETE_001.fix",
    evaluate(input) {
      return input.isFieldExplicitlyTrue("appCapabilities.placeholderContentPresent")
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "COMPLETE_002",
    guideline: "2.1 App Completeness",
    category: "app-completeness",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.COMPLETE_002.title",
    messageKey: "issue.COMPLETE_002.message",
    fixKey: "issue.COMPLETE_002.fix",
    evaluate(input) {
      return input.isFieldKnown("appCapabilities.inaccessibleFeatures") &&
        input.config.appCapabilities.inaccessibleFeatures.length > 0
        ? {
            passed: false,
            details: input.config.appCapabilities.inaccessibleFeatures
          }
        : { passed: true };
    }
  },
  {
    id: "COMPLETE_003",
    guideline: "2.1 App Completeness",
    category: "app-completeness",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.COMPLETE_003.title",
    messageKey: "issue.COMPLETE_003.message",
    fixKey: "issue.COMPLETE_003.fix",
    evaluate(input) {
      if (!input.config.appCapabilities.paywallPresent) {
        return { passed: true };
      }

      if (input.isFieldExplicitlyFalse("appCapabilities.paywallReachable")) {
        return { passed: false };
      }

      return input.hasAnyReviewerDocumentation && !input.paywallDocumented
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "COMPLETE_004",
    guideline: "2.1 App Completeness",
    category: "app-completeness",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.COMPLETE_004.title",
    messageKey: "issue.COMPLETE_004.message",
    fixKey: "issue.COMPLETE_004.fix",
    evaluate(input) {
      return input.isFieldKnown("appCapabilities.brokenFlows") &&
        input.config.appCapabilities.brokenFlows.length > 0
        ? {
            passed: false,
            details: input.config.appCapabilities.brokenFlows
          }
        : { passed: true };
    }
  },
  {
    id: "COMPLETE_005",
    guideline: "2.1 App Completeness",
    category: "app-completeness",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.COMPLETE_005.title",
    messageKey: "issue.COMPLETE_005.message",
    fixKey: "issue.COMPLETE_005.fix",
    evaluate(input) {
      return input.isFieldExplicitlyTrue(
        "appCapabilities.onboardingRequiresExternalDependency"
      )
        ? { passed: false }
        : { passed: true };
    }
  }
];
