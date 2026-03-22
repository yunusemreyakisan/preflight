import type { Translator } from "../types";

export function createInitConfigTemplate(translator: Translator): string {
  const config = {
    app: {
      name: translator.t("template.init.appName"),
      bundleId: "com.example.app"
    },
    submission: {
      platform: "ios",
      primaryMarkets: ["en-US", "tr-TR"]
    },
    appCapabilities: {
      loginRequired: true,
      paywallPresent: true,
      paywallReachable: true,
      placeholderContentPresent: false,
      declaredFeatures: ["sign-in", "paywall", "settings"],
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
    metadata: {
      subtitle: translator.t("template.init.subtitle"),
      description: translator.t("template.init.description"),
      keywords: "ios,appstore,release,review",
      primaryMarkets: ["en-US", "tr-TR"],
      requiredScreenshotDeviceTypes: ["iphone-6.7", "iphone-6.5"],
      localizations: [
        {
          locale: "en-US",
          title: "Example App",
          subtitle: "Release safety",
          description: "Prevent avoidable App Store review issues before submission.",
          keywords: "ios,review,release"
        },
        {
          locale: "tr-TR",
          title: "Ornek Uygulama",
          subtitle: "Yayin guvenligi",
          description:
            "Gonderim oncesinde onlenebilir App Store review sorunlarini yakalayin.",
          keywords: "ios,review,yayin"
        }
      ],
      screenshots: [
        {
          path: "assets/screenshots/iphone-6.7-1.png",
          locales: ["en-US", "tr-TR"],
          deviceType: "iphone-6.7"
        },
        {
          path: "assets/screenshots/iphone-6.7-2.png",
          locales: ["en-US", "tr-TR"],
          deviceType: "iphone-6.7"
        },
        {
          path: "assets/screenshots/iphone-6.5-1.png",
          locales: ["en-US", "tr-TR"],
          deviceType: "iphone-6.5"
        }
      ]
    },
    privacy: {
      policyUrl: "https://example.com/privacy",
      policyReachable: true,
      nutritionLabelComplete: true,
      privacyManifestPresent: true,
      requiredReasonApisDeclared: true,
      trackingUsed: false,
      trackingUsageDescriptionPresent: false,
      dataCollectionMatchesLabel: true
    },
    business: {
      hasIap: true,
      iapProducts: [
        {
          productId: "pro.monthly",
          displayName: "Pro Monthly",
          reachableFromPaywall: true
        }
      ],
      subscriptionTermsDisplayed: true,
      externalPaymentLinksPresent: false,
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

