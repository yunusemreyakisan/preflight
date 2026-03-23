import type { RuleDefinition } from "../../types";
import type { ScanInput } from "../../scanner/build-scan-input";

const LAST_VERIFIED = "2026-03-23";

export const contentRules: RuleDefinition<ScanInput>[] = [
  {
    id: "CONTENT_001",
    guideline: "1.1 Safety",
    category: "content",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.CONTENT_001.title",
    messageKey: "issue.CONTENT_001.message",
    fixKey: "issue.CONTENT_001.fix",
    evaluate(input) {
      if (
        input.isFieldUnknown("content.ageRatingDeclared") ||
        input.isFieldUnknown("content.ageRatingRecommended")
      ) {
        return { passed: true };
      }

      return input.config.content.ageRatingDeclared < input.config.content.ageRatingRecommended
        ? {
            passed: false,
            details: [
              `Declared: ${input.config.content.ageRatingDeclared}`,
              `Recommended: ${input.config.content.ageRatingRecommended}`
            ]
          }
        : { passed: true };
    }
  },
  {
    id: "CONTENT_002",
    guideline: "1.2 User Generated Content",
    category: "content",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.CONTENT_002.title",
    messageKey: "issue.CONTENT_002.message",
    fixKey: "issue.CONTENT_002.fix",
    evaluate(input) {
      return input.config.appCapabilities.ugcPresent &&
        input.isFieldKnown("content.ugcModerationDeclared") &&
        !input.config.content.ugcModerationDeclared
        ? { passed: false }
        : { passed: true };
    }
  }
];
