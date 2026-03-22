import fs from "node:fs";
import path from "node:path";

import type { PreflightConfig } from "../config/schema";
import type { ScreenshotAssetStatus } from "../types";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface ScanInput {
  config: PreflightConfig;
  configDir: string;
  configPath: string;
  screenshotAssets: ScreenshotAssetStatus[];
  declaredLocales: string[];
  normalizedDescriptions: string[];
  normalizedTitles: string[];
  normalizedSubtitles: string[];
  normalizedKeywords: string[];
  reviewNotesNormalized: string;
  loginInstructionsNormalized: string;
  hasDemoAccountObject: boolean;
  hasCompleteDemoAccount: boolean;
  hasValidDemoCredentialFormat: boolean;
  hasCompleteReviewerContact: boolean;
  effectiveDemoAccountRequired: boolean;
  requiredScreenshotDeviceTypes: string[];
  availableScreenshotDeviceTypes: string[];
  missingScreenshotDeviceTypes: string[];
  primaryMarkets: string[];
  paywallDocumented: boolean;
  loginDocumented: boolean;
  regionRestrictionDocumented: boolean;
}

export function buildScanInput(options: {
  config: PreflightConfig;
  configDir: string;
  configPath: string;
}): ScanInput {
  const { config, configDir, configPath } = options;

  const screenshotAssets = config.metadata.screenshots.map((screenshot) => {
    const absolutePath = path.resolve(configDir, screenshot.path);

    return {
      absolutePath,
      declaredPath: screenshot.path,
      deviceType: screenshot.deviceType,
      locales: screenshot.locales,
      exists: fs.existsSync(absolutePath)
    };
  });

  const normalizedDescriptions = [
    config.metadata.description,
    ...config.metadata.localizations.map((entry) => entry.description)
  ]
    .filter(Boolean)
    .map(normalizeText);
  const normalizedTitles = [config.app.name, ...config.metadata.localizations.map((entry) => entry.title)]
    .filter(Boolean)
    .map(normalizeText);
  const normalizedSubtitles = [
    config.metadata.subtitle,
    ...config.metadata.localizations.map((entry) => entry.subtitle)
  ]
    .filter(Boolean)
    .map(normalizeText);
  const normalizedKeywords = [
    config.metadata.keywords,
    ...config.metadata.localizations.map((entry) => entry.keywords)
  ]
    .filter(Boolean)
    .map(normalizeText);

  const reviewNotesNormalized = normalizeText(config.review.notes);
  const loginInstructionsNormalized = normalizeText(config.review.loginInstructions);
  const hasDemoAccountObject = Boolean(
    config.review.demoAccount?.username || config.review.demoAccount?.password
  );
  const hasCompleteDemoAccount = Boolean(
    config.review.demoAccount?.username?.trim() &&
      config.review.demoAccount?.password?.trim()
  );
  const hasValidDemoCredentialFormat = Boolean(
    config.review.demoAccount?.username?.trim() &&
      config.review.demoAccount?.password?.trim() &&
      (looksLikeEmail(config.review.demoAccount.username) ||
        config.review.demoAccount.username.trim().length >= 3)
  );
  const hasCompleteReviewerContact = Boolean(
    config.review.contact?.name?.trim() && config.review.contact?.email?.trim()
  );
  const effectiveDemoAccountRequired =
    config.review.demoAccountRequired ?? config.appCapabilities.loginRequired;
  const requiredScreenshotDeviceTypes = uniqueStrings(
    config.metadata.requiredScreenshotDeviceTypes.length > 0
      ? config.metadata.requiredScreenshotDeviceTypes
      : ["iphone-6.7"]
  );
  const availableScreenshotDeviceTypes = uniqueStrings(
    screenshotAssets.map((asset) => asset.deviceType)
  );
  const missingScreenshotDeviceTypes = requiredScreenshotDeviceTypes.filter(
    (deviceType) => !availableScreenshotDeviceTypes.includes(deviceType)
  );
  const declaredLocales = uniqueStrings(
    config.metadata.localizations.map((entry) => entry.locale)
  );
  const primaryMarkets = uniqueStrings([
    ...config.submission.primaryMarkets,
    ...config.metadata.primaryMarkets
  ]);
  const paywallDocumented = /paywall|subscription|premium|purchase|upgrade|unlock/.test(
    `${reviewNotesNormalized} ${loginInstructionsNormalized}`
  );
  const loginDocumented = /login|log in|sign in|oturum|giris/.test(
    `${reviewNotesNormalized} ${loginInstructionsNormalized}`
  );
  const regionRestrictionDocumented = /vpn|region|country|availability|ulke|bolge/.test(
    `${reviewNotesNormalized} ${loginInstructionsNormalized} ${normalizeText(
      config.appCapabilities.regionRestrictionNotes
    )}`
  );

  return {
    config,
    configDir,
    configPath,
    screenshotAssets,
    declaredLocales,
    normalizedDescriptions,
    normalizedTitles,
    normalizedSubtitles,
    normalizedKeywords,
    reviewNotesNormalized,
    loginInstructionsNormalized,
    hasDemoAccountObject,
    hasCompleteDemoAccount,
    hasValidDemoCredentialFormat,
    hasCompleteReviewerContact,
    effectiveDemoAccountRequired,
    requiredScreenshotDeviceTypes,
    availableScreenshotDeviceTypes,
    missingScreenshotDeviceTypes,
    primaryMarkets,
    paywallDocumented,
    loginDocumented,
    regionRestrictionDocumented
  };
}

