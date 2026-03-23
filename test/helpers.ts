import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { PreflightConfig } from "../src";

interface IosProjectFixtureOptions {
  projectName?: string;
  bundleId?: string;
  displayName?: string;
  iosRoot?: string;
  includePrivacyManifest?: boolean;
  includeRequiredReasonApis?: boolean;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeIosProjectFixture(
  projectDir: string,
  options: IosProjectFixtureOptions = {}
): void {
  const projectName = options.projectName ?? "PreflightApp";
  const bundleId = options.bundleId ?? "com.example.preflight";
  const displayName = options.displayName ?? "Preflight App";
  const iosRoot = path.join(projectDir, options.iosRoot ?? "");
  const xcodeprojPath = path.join(iosRoot, `${projectName}.xcodeproj`, "project.pbxproj");
  const appDir = path.join(iosRoot, projectName);
  const infoPlistPath = path.join(appDir, "Info.plist");
  const entitlementsPath = path.join(appDir, `${projectName}.entitlements`);

  const pbxproj = `PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};
PRODUCT_NAME = ${projectName};
INFOPLIST_FILE = ${projectName}/Info.plist;
CODE_SIGN_ENTITLEMENTS = ${projectName}/${projectName}.entitlements;
`;

  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>${displayName}</string>
</dict>
</plist>
`;

  writeFile(xcodeprojPath, pbxproj);
  writeFile(infoPlistPath, infoPlist);
  writeFile(entitlementsPath, "{}");

  if (options.includePrivacyManifest) {
    const privacyManifestPath = path.join(appDir, "PrivacyInfo.xcprivacy");
    const requiredReasonApis = options.includeRequiredReasonApis
      ? `
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
    </dict>
  </array>`
      : "";

    writeFile(
      privacyManifestPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>${requiredReasonApis}
</dict>
</plist>
`
    );
  }
}

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

export function writeConfig(
  projectDir: string,
  config: unknown,
  fileName = "preflight.config.json"
): string {
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

export function writeDiscoveredScreenshots(
  projectDir: string,
  locale = "en-US",
  fileNames = ["iphone-6.7-1.png", "iphone-6.7-2.png", "iphone-6.7-3.png"]
): void {
  writeScreenshots(
    projectDir,
    fileNames.map((fileName) => path.join("fastlane", "screenshots", locale, fileName))
  );
}

export function writeNativeIosProject(
  projectDir: string,
  options: Omit<IosProjectFixtureOptions, "iosRoot"> = {}
): void {
  writeIosProjectFixture(projectDir, options);
}

export function writeFlutterIosProject(
  projectDir: string,
  options: Omit<IosProjectFixtureOptions, "iosRoot"> = {}
): void {
  writeFile(
    path.join(projectDir, "pubspec.yaml"),
    "name: preflight_flutter\nversion: 1.0.0\n"
  );
  writeIosProjectFixture(projectDir, {
    projectName: "Runner",
    iosRoot: "ios",
    ...options
  });
}

export function writeReactNativeIosProject(
  projectDir: string,
  options: Omit<IosProjectFixtureOptions, "iosRoot"> = {}
): void {
  writeFile(
    path.join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "preflight-rn",
        version: "1.0.0",
        dependencies: {
          "react-native": "0.76.0"
        }
      },
      null,
      2
    )
  );
  writeIosProjectFixture(projectDir, {
    projectName: "PreflightRN",
    iosRoot: "ios",
    ...options
  });
}
