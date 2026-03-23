import type { Translator } from "../types";

export function createInitConfigTemplate(translator: Translator): string {
  const config = {
    submission: {
      primaryMarkets: ["en-US", "tr-TR"]
    },
    appCapabilities: {
      loginRequired: true,
      placeholderContentPresent: false,
      inaccessibleFeatures: [],
      brokenFlows: [],
      onboardingRequiresExternalDependency: false,
      regionRestricted: false,
      regionRestrictionNotes: "",
      vpnRequired: false,
      ugcPresent: false
    },
    review: {
      demoAccountRequired: true,
      demoAccount: {
        username: "reviewer@example.com",
        password: "password123",
        notes: ""
      },
      contact: {
        name: translator.t("template.init.contactName"),
        email: "mobile@example.com",
        phone: ""
      },
      notes: translator.t("template.init.reviewNotes"),
      loginInstructions: translator.t("template.init.loginInstructions"),
      internetRequired: true
    },
    privacy: {
      policyUrl: "https://example.com/privacy",
      nutritionLabelComplete: true
    },
    business: {
      subscriptionTermsDisplayed: true,
      restorePurchasesPresent: true,
      offersFreeTrial: false,
      freeTrialTermsDisplayed: false
    },
    content: {
      ageRatingDeclared: 4,
      ageRatingRecommended: 4,
      ugcModerationDeclared: false
    }
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}
