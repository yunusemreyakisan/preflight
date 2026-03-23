import type { RuleDefinition } from "../../types";
import type { ScanInput } from "../../scanner/build-scan-input";

const LAST_VERIFIED = "2026-03-23";
const competitorPatterns = [
  "instagram",
  "tiktok",
  "whatsapp",
  "telegram",
  "duolingo",
  "strava",
  "forest",
  "spotify",
  "netflix",
  "chatgpt"
];
const pricingClaimPattern =
  /\bfree\b|\bdiscount\b|\bsale\b|\blimited time\b|\bbest free\b|\$\d+/i;

function collectTitleViolations(input: ScanInput): string[] {
  const entries = [input.config.app.name, ...input.config.metadata.localizations.map((entry) => entry.title)];
  return entries.filter((value) => value.trim().length > 30);
}

function collectSubtitleViolations(input: ScanInput): string[] {
  const entries = [
    input.config.metadata.subtitle,
    ...input.config.metadata.localizations.map((entry) => entry.subtitle)
  ].filter(Boolean);

  return entries.filter((value) => value.trim().length > 30);
}

function collectKeywordViolations(input: ScanInput): string[] {
  const entries = [
    input.config.metadata.keywords,
    ...input.config.metadata.localizations.map((entry) => entry.keywords)
  ].filter(Boolean);

  return entries.filter((value) => value.trim().length > 100);
}

function collectCompetitors(input: ScanInput): string[] {
  const found = new Set<string>();

  for (const description of input.normalizedDescriptions) {
    for (const competitor of competitorPatterns) {
      if (description.includes(competitor)) {
        found.add(competitor);
      }
    }
  }

  return [...found];
}

export const metadataRules: RuleDefinition<ScanInput>[] = [
  {
    id: "META_001",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_001.title",
    messageKey: "issue.META_001.message",
    fixKey: "issue.META_001.fix",
    evaluate(input) {
      if (
        input.isFieldUnknown("metadata.screenshots") &&
        input.isFieldUnknown("metadata.requiredScreenshotDeviceTypes")
      ) {
        return { passed: true };
      }

      return input.missingScreenshotDeviceTypes.length > 0
        ? {
            passed: false,
            details: input.missingScreenshotDeviceTypes
          }
        : { passed: true };
    }
  },
  {
    id: "META_002",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_002.title",
    messageKey: "issue.META_002.message",
    fixKey: "issue.META_002.fix",
    evaluate(input) {
      if (input.isFieldUnknown("metadata.screenshots")) {
        return { passed: true };
      }

      const existingAssets = input.screenshotAssets.filter((asset) => asset.exists);

      return existingAssets.length < 3
        ? {
            passed: false,
            details: [
              `${existingAssets.length} screenshot file(s) available`,
              ...input.screenshotAssets
                .filter((asset) => !asset.exists)
                .map((asset) => `Missing file: ${asset.declaredPath}`)
            ]
          }
        : { passed: true };
    }
  },
  {
    id: "META_003",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_003.title",
    messageKey: "issue.META_003.message",
    fixKey: "issue.META_003.fix",
    evaluate(input) {
      const competitors = collectCompetitors(input);

      return competitors.length > 0
        ? {
            passed: false,
            details: competitors
          }
        : { passed: true };
    }
  },
  {
    id: "META_004",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "low",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_004.title",
    messageKey: "issue.META_004.message",
    fixKey: "issue.META_004.fix",
    evaluate(input) {
      const violations = collectTitleViolations(input);

      return violations.length > 0
        ? {
            passed: false,
            details: violations
          }
        : { passed: true };
    }
  },
  {
    id: "META_005",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "low",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_005.title",
    messageKey: "issue.META_005.message",
    fixKey: "issue.META_005.fix",
    evaluate(input) {
      const violations = collectSubtitleViolations(input);

      return violations.length > 0
        ? {
            passed: false,
            details: violations
          }
        : { passed: true };
    }
  },
  {
    id: "META_006",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "low",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_006.title",
    messageKey: "issue.META_006.message",
    fixKey: "issue.META_006.fix",
    evaluate(input) {
      const violations = collectKeywordViolations(input);

      return violations.length > 0
        ? {
            passed: false,
            details: violations
          }
        : { passed: true };
    }
  },
  {
    id: "META_007",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_007.title",
    messageKey: "issue.META_007.message",
    fixKey: "issue.META_007.fix",
    evaluate(input) {
      const matched = input.normalizedDescriptions.filter((description) =>
        pricingClaimPattern.test(description)
      );

      return matched.length > 0
        ? {
            passed: false,
            details: matched
          }
        : { passed: true };
    }
  },
  {
    id: "META_008",
    guideline: "2.3 Accurate Metadata",
    category: "metadata",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.META_008.title",
    messageKey: "issue.META_008.message",
    fixKey: "issue.META_008.fix",
    evaluate(input) {
      const missingMarkets = input.primaryMarkets.filter(
        (market) => !input.declaredLocales.includes(market)
      );

      return missingMarkets.length > 0
        ? {
            passed: false,
            details: missingMarkets
          }
        : { passed: true };
    }
  }
];
