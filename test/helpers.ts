import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { PreflightConfig } from "../src";

export function createTempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "preflight-test-"));
}

export function buildValidConfig(): PreflightConfig {
  return {
    app: {
      name: "Preflight App",
      bundleId: "com.example.preflight"
    },
    submission: {
      platform: "ios",
      primaryMarkets: ["en-US", "tr-TR"]
    },
    appCapabilities: {
      loginRequired: false,
      paywallPresent: false,
      paywallReachable: true,
      placeholderContentPresent: false,
      declaredFeatures: ["home", "settings"],
      inaccessibleFeatures: [],
      brokenFlows: [],
      onboardingRequiresExternalDependency: false,
      regionRestricted: false,
      regionRestrictionNotes: "",
      vpnRequired: false,
      ugcPresent: false
    },
    review: {
      demoAccountRequired: false,
      contact: {
        name: "Release Team",
        email: "mobile@example.com",
        phone: ""
      },
      notes: "Review build is ready. No paywall or login is required for core features.",
      loginInstructions: "",
      internetRequired: true
    },
    metadata: {
      subtitle: "Release safety",
      description: "Prevent avoidable review issues before App Store submission.",
      keywords: "ios,review,release",
      primaryMarkets: ["en-US", "tr-TR"],
      requiredScreenshotDeviceTypes: ["iphone-6.7", "iphone-6.5"],
      localizations: [
        {
          locale: "en-US",
          title: "Preflight App",
          subtitle: "Release safety",
          description: "Prevent avoidable review issues before App Store submission.",
          keywords: "ios,review,release"
        },
        {
          locale: "tr-TR",
          title: "Preflight App TR",
          subtitle: "Yayin guvenligi",
          description: "App Store gonderimi oncesinde review sorunlarini yakalayin.",
          keywords: "ios,review,yayin"
        }
      ],
      screenshots: [
        {
          path: "assets/iphone-6.7-1.png",
          locales: ["en-US", "tr-TR"],
          deviceType: "iphone-6.7"
        },
        {
          path: "assets/iphone-6.7-2.png",
          locales: ["en-US", "tr-TR"],
          deviceType: "iphone-6.7"
        },
        {
          path: "assets/iphone-6.5-1.png",
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
      hasIap: false,
      iapProducts: [],
      subscriptionTermsDisplayed: false,
      externalPaymentLinksPresent: false,
      restorePurchasesPresent: false,
      offersFreeTrial: false,
      freeTrialTermsDisplayed: false
    },
    content: {
      ageRatingDeclared: 4,
      ageRatingRecommended: 4,
      ugcModerationDeclared: false
    }
  };
}

export function writeConfig(projectDir: string, config: unknown, fileName = "preflight.config.json"): string {
  const configPath = path.join(projectDir, fileName);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return configPath;
}

export function writeScreenshots(projectDir: string, relativePaths: string[]): void {
  relativePaths.forEach((relativePath) => {
    const absolutePath = path.join(projectDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "image");
  });
}

