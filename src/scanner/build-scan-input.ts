import fs from "node:fs";
import path from "node:path";

import type { PreflightConfig } from "../config/schema";
import type {
  DiscoveryEvidence,
  DiscoveryReport,
  FieldSource,
  MissingInput,
  ResolvedField,
  RuleCategory,
  ScreenshotAssetStatus,
  Severity,
  Translator
} from "../types";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getValueAtPath(value: unknown, fieldPath: string): unknown {
  return fieldPath.split(".").reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

function resolveFieldSource(
  fieldSources: Record<string, FieldSource>,
  fieldPath: string
): FieldSource {
  let currentPath = fieldPath;

  while (currentPath.length > 0) {
    if (fieldSources[currentPath]) {
      return fieldSources[currentPath];
    }

    const separatorIndex = currentPath.lastIndexOf(".");
    if (separatorIndex === -1) {
      break;
    }

    currentPath = currentPath.slice(0, separatorIndex);
  }

  return "default";
}

function collectFieldEvidence(
  evidence: DiscoveryEvidence[],
  fieldPath: string
): DiscoveryEvidence[] {
  return evidence.filter((entry) => {
    return entry.key === fieldPath || entry.key.startsWith(`${fieldPath}.`);
  });
}

function hasNonEmptyText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function buildMissingInput(
  key: string,
  label: string,
  message: string,
  category: RuleCategory,
  severity: Severity
): MissingInput {
  return {
    key,
    label,
    category,
    severity,
    message
  };
}

function sortMissingInputs(inputs: MissingInput[]): MissingInput[] {
  const severityOrder: Record<Severity, number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  return [...inputs].sort((left, right) => {
    return (
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.category.localeCompare(right.category) ||
      left.key.localeCompare(right.key)
    );
  });
}

export interface ScanInput {
  config: PreflightConfig;
  configDir: string;
  configPath: string;
  projectRoot: string;
  discovery: DiscoveryReport;
  fieldSources: Record<string, FieldSource>;
  getFieldSource: (fieldPath: string) => FieldSource;
  getFieldValue: (fieldPath: string) => unknown;
  getFieldEvidence: (fieldPath: string) => DiscoveryEvidence[];
  getResolvedField: <TValue = unknown>(fieldPath: string) => ResolvedField<TValue>;
  isFieldKnown: (fieldPath: string) => boolean;
  isFieldUnknown: (fieldPath: string) => boolean;
  isFieldFromConfig: (fieldPath: string) => boolean;
  isFieldFromDiscovery: (fieldPath: string) => boolean;
  isFieldExplicitlyTrue: (fieldPath: string) => boolean;
  isFieldExplicitlyFalse: (fieldPath: string) => boolean;
  screenshotAssets: ScreenshotAssetStatus[];
  declaredLocales: string[];
  normalizedDescriptions: string[];
  normalizedTitles: string[];
  normalizedSubtitles: string[];
  normalizedKeywords: string[];
  reviewNotesNormalized: string;
  loginInstructionsNormalized: string;
  hasReviewNotes: boolean;
  hasLoginInstructions: boolean;
  hasAnyReviewerDocumentation: boolean;
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
  projectRoot: string;
  discovery: DiscoveryReport;
  fieldSources: Record<string, FieldSource>;
}): ScanInput {
  const { config, configDir, configPath, projectRoot, discovery, fieldSources } = options;
  const getFieldSource = (fieldPath: string): FieldSource =>
    resolveFieldSource(fieldSources, fieldPath);
  const getFieldValue = (fieldPath: string): unknown => getValueAtPath(config, fieldPath);
  const getFieldEvidence = (fieldPath: string): DiscoveryEvidence[] =>
    collectFieldEvidence(discovery.evidence, fieldPath);
  const isFieldKnown = (fieldPath: string): boolean => getFieldSource(fieldPath) !== "default";
  const isFieldUnknown = (fieldPath: string): boolean => !isFieldKnown(fieldPath);
  const isFieldFromConfig = (fieldPath: string): boolean =>
    getFieldSource(fieldPath) === "config";
  const isFieldFromDiscovery = (fieldPath: string): boolean =>
    getFieldSource(fieldPath) === "discovered";
  const isFieldExplicitlyTrue = (fieldPath: string): boolean =>
    isFieldKnown(fieldPath) && getFieldValue(fieldPath) === true;
  const isFieldExplicitlyFalse = (fieldPath: string): boolean =>
    isFieldKnown(fieldPath) && getFieldValue(fieldPath) === false;
  const getResolvedField = <TValue = unknown>(fieldPath: string): ResolvedField<TValue> => ({
    key: fieldPath,
    value: getFieldValue(fieldPath) as TValue,
    known: isFieldKnown(fieldPath),
    source: getFieldSource(fieldPath),
    evidence: getFieldEvidence(fieldPath)
  });

  const screenshotBaseDir =
    getFieldSource("metadata.screenshots") === "discovered" ? projectRoot : configDir;
  const screenshotAssets = config.metadata.screenshots.map((screenshot) => {
    const absolutePath = path.isAbsolute(screenshot.path)
      ? screenshot.path
      : path.resolve(screenshotBaseDir, screenshot.path);

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
  const normalizedTitles = [
    config.app.name,
    ...config.metadata.localizations.map((entry) => entry.title)
  ]
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
  const hasReviewNotes = hasNonEmptyText(config.review.notes);
  const hasLoginInstructions = hasNonEmptyText(config.review.loginInstructions);
  const hasAnyReviewerDocumentation = hasReviewNotes || hasLoginInstructions;
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
  const shouldValidateScreenshots =
    isFieldKnown("metadata.screenshots") || isFieldKnown("metadata.requiredScreenshotDeviceTypes");
  const requiredScreenshotDeviceTypes = uniqueStrings(
    shouldValidateScreenshots
      ? config.metadata.requiredScreenshotDeviceTypes.length > 0
        ? config.metadata.requiredScreenshotDeviceTypes
        : ["iphone-6.7"]
      : []
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
    projectRoot,
    discovery,
    fieldSources,
    getFieldSource,
    getFieldValue,
    getFieldEvidence,
    getResolvedField,
    isFieldKnown,
    isFieldUnknown,
    isFieldFromConfig,
    isFieldFromDiscovery,
    isFieldExplicitlyTrue,
    isFieldExplicitlyFalse,
    screenshotAssets,
    declaredLocales,
    normalizedDescriptions,
    normalizedTitles,
    normalizedSubtitles,
    normalizedKeywords,
    reviewNotesNormalized,
    loginInstructionsNormalized,
    hasReviewNotes,
    hasLoginInstructions,
    hasAnyReviewerDocumentation,
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

export function collectMissingInputs(
  input: ScanInput,
  translator: Translator
): MissingInput[] {
  const missing: MissingInput[] = [];

  if (input.effectiveDemoAccountRequired && !input.hasCompleteDemoAccount) {
    missing.push(
      buildMissingInput(
        "review.demoAccount",
        translator.t("missing.demoAccount.label"),
        translator.t("missing.demoAccount.message"),
        "reviewer-access",
        "high"
      )
    );
  }

  if (!input.hasReviewNotes) {
    missing.push(
      buildMissingInput(
        "review.notes",
        translator.t("missing.reviewNotes.label"),
        translator.t("missing.reviewNotes.message"),
        "reviewer-access",
        "medium"
      )
    );
  }

  if (input.config.appCapabilities.loginRequired && !input.hasLoginInstructions) {
    missing.push(
      buildMissingInput(
        "review.loginInstructions",
        translator.t("missing.loginInstructions.label"),
        translator.t("missing.loginInstructions.message"),
        "reviewer-access",
        "high"
      )
    );
  }

  if (!input.hasCompleteReviewerContact) {
    missing.push(
      buildMissingInput(
        "review.contact",
        translator.t("missing.contact.label"),
        translator.t("missing.contact.message"),
        "reviewer-access",
        "medium"
      )
    );
  }

  return sortMissingInputs(missing);
}
