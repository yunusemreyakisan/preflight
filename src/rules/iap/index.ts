import type { RuleDefinition } from "../../types";
import type { ScanInput } from "../../scanner/build-scan-input";

const LAST_VERIFIED = "2026-03-23";

export const iapRules: RuleDefinition<ScanInput>[] = [
  {
    id: "IAP_001",
    guideline: "3.1.2 Subscriptions",
    category: "business-iap",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.IAP_001.title",
    messageKey: "issue.IAP_001.message",
    fixKey: "issue.IAP_001.fix",
    evaluate(input) {
      if (!input.config.business.hasIap) {
        return { passed: true };
      }

      const unreachableProducts = input.config.business.iapProducts
        .filter((product) => !product.reachableFromPaywall)
        .map((product) => product.productId);

      return unreachableProducts.length > 0 || input.config.business.iapProducts.length === 0
        ? {
            passed: false,
            details:
              unreachableProducts.length > 0 ? unreachableProducts : ["No IAP products declared"]
          }
        : { passed: true };
    }
  },
  {
    id: "IAP_002",
    guideline: "3.1.2 Subscriptions",
    category: "business-iap",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.IAP_002.title",
    messageKey: "issue.IAP_002.message",
    fixKey: "issue.IAP_002.fix",
    evaluate(input) {
      return input.config.business.hasIap && !input.config.business.subscriptionTermsDisplayed
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "IAP_003",
    guideline: "3.1 Payments",
    category: "business-iap",
    severity: "high",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.IAP_003.title",
    messageKey: "issue.IAP_003.message",
    fixKey: "issue.IAP_003.fix",
    evaluate(input) {
      return input.config.business.externalPaymentLinksPresent
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "IAP_004",
    guideline: "3.1.2 Subscriptions",
    category: "business-iap",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.IAP_004.title",
    messageKey: "issue.IAP_004.message",
    fixKey: "issue.IAP_004.fix",
    evaluate(input) {
      return input.config.business.hasIap && !input.config.business.restorePurchasesPresent
        ? { passed: false }
        : { passed: true };
    }
  },
  {
    id: "IAP_005",
    guideline: "3.1.2 Subscriptions",
    category: "business-iap",
    severity: "medium",
    lastVerified: LAST_VERIFIED,
    titleKey: "issue.IAP_005.title",
    messageKey: "issue.IAP_005.message",
    fixKey: "issue.IAP_005.fix",
    evaluate(input) {
      return input.config.business.hasIap &&
        input.config.business.offersFreeTrial &&
        !input.config.business.freeTrialTermsDisplayed
        ? { passed: false }
        : { passed: true };
    }
  }
];

