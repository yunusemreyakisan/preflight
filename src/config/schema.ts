import { z } from "zod";

import type { ConfigWarning } from "../types";

const localizationSchema = z.object({
  locale: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().default(""),
  description: z.string().trim().min(1),
  keywords: z.string().trim().default("")
});

const localizationOverrideSchema = z.object({
  locale: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().optional(),
  description: z.string().trim().min(1),
  keywords: z.string().trim().optional()
});

const screenshotSchema = z.object({
  path: z.string().trim().min(1),
  locales: z.array(z.string().trim().min(1)).default([]),
  deviceType: z.string().trim().min(1).default("iphone-6.7")
});

const screenshotOverrideSchema = z.object({
  path: z.string().trim().min(1),
  locales: z.array(z.string().trim().min(1)).optional(),
  deviceType: z.string().trim().min(1).optional()
});

const demoAccountSchema = z.object({
  username: z.string().trim().min(1).optional(),
  password: z.string().trim().min(1).optional(),
  notes: z.string().trim().default("")
});

const demoAccountOverrideSchema = z.object({
  username: z.string().trim().min(1).optional(),
  password: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional()
});

const reviewerContactSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().default("")
});

const reviewerContactOverrideSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional()
});

const iapProductSchema = z.object({
  productId: z.string().trim().min(1),
  displayName: z.string().trim().default(""),
  reachableFromPaywall: z.boolean().default(true)
});

const iapProductOverrideSchema = z.object({
  productId: z.string().trim().min(1),
  displayName: z.string().trim().optional(),
  reachableFromPaywall: z.boolean().optional()
});

const appSchema = z.object({
  name: z.string().trim().default(""),
  bundleId: z.string().trim().default("")
});

const appOverrideSchema = z.object({
  name: z.string().trim().min(1).optional(),
  bundleId: z.string().trim().min(1).optional()
});

const submissionSchema = z.object({
  platform: z.literal("ios").default("ios"),
  primaryMarkets: z.array(z.string().trim().min(1)).default([])
});

const submissionOverrideSchema = z.object({
  platform: z.literal("ios").optional(),
  primaryMarkets: z.array(z.string().trim().min(1)).optional()
});

const appCapabilitiesSchema = z.object({
  loginRequired: z.boolean().default(false),
  paywallPresent: z.boolean().default(false),
  paywallReachable: z.boolean().default(true),
  placeholderContentPresent: z.boolean().default(false),
  declaredFeatures: z.array(z.string().trim().min(1)).default([]),
  inaccessibleFeatures: z.array(z.string().trim().min(1)).default([]),
  brokenFlows: z.array(z.string().trim().min(1)).default([]),
  onboardingRequiresExternalDependency: z.boolean().default(false),
  regionRestricted: z.boolean().default(false),
  regionRestrictionNotes: z.string().trim().default(""),
  vpnRequired: z.boolean().default(false),
  ugcPresent: z.boolean().default(false)
});

const appCapabilitiesOverrideSchema = z.object({
  loginRequired: z.boolean().optional(),
  paywallPresent: z.boolean().optional(),
  paywallReachable: z.boolean().optional(),
  placeholderContentPresent: z.boolean().optional(),
  declaredFeatures: z.array(z.string().trim().min(1)).optional(),
  inaccessibleFeatures: z.array(z.string().trim().min(1)).optional(),
  brokenFlows: z.array(z.string().trim().min(1)).optional(),
  onboardingRequiresExternalDependency: z.boolean().optional(),
  regionRestricted: z.boolean().optional(),
  regionRestrictionNotes: z.string().trim().optional(),
  vpnRequired: z.boolean().optional(),
  ugcPresent: z.boolean().optional()
});

const reviewSchema = z.object({
  demoAccountRequired: z.boolean().optional(),
  demoAccount: demoAccountSchema.optional(),
  contact: reviewerContactSchema.optional(),
  notes: z.string().trim().default(""),
  loginInstructions: z.string().trim().default(""),
  internetRequired: z.boolean().default(true)
});

const reviewOverrideSchema = z.object({
  demoAccountRequired: z.boolean().optional(),
  demoAccount: demoAccountOverrideSchema.optional(),
  contact: reviewerContactOverrideSchema.optional(),
  notes: z.string().trim().optional(),
  loginInstructions: z.string().trim().optional(),
  internetRequired: z.boolean().optional()
});

const metadataSchema = z.object({
  subtitle: z.string().trim().default(""),
  description: z.string().trim().default(""),
  keywords: z.string().trim().default(""),
  primaryMarkets: z.array(z.string().trim().min(1)).default([]),
  requiredScreenshotDeviceTypes: z.array(z.string().trim().min(1)).default([
    "iphone-6.7"
  ]),
  localizations: z.array(localizationSchema).default([]),
  screenshots: z.array(screenshotSchema).default([])
});

const metadataOverrideSchema = z.object({
  subtitle: z.string().trim().optional(),
  description: z.string().trim().optional(),
  keywords: z.string().trim().optional(),
  primaryMarkets: z.array(z.string().trim().min(1)).optional(),
  requiredScreenshotDeviceTypes: z.array(z.string().trim().min(1)).optional(),
  localizations: z.array(localizationOverrideSchema).optional(),
  screenshots: z.array(screenshotOverrideSchema).optional()
});

const privacySchema = z.object({
  policyUrl: z.string().trim().url().optional(),
  policyReachable: z.boolean().default(true),
  nutritionLabelComplete: z.boolean().default(false),
  privacyManifestPresent: z.boolean().default(false),
  requiredReasonApisDeclared: z.boolean().default(false),
  trackingUsed: z.boolean().default(false),
  trackingUsageDescriptionPresent: z.boolean().default(false),
  dataCollectionMatchesLabel: z.boolean().default(true)
});

const privacyOverrideSchema = z.object({
  policyUrl: z.string().trim().url().optional(),
  policyReachable: z.boolean().optional(),
  nutritionLabelComplete: z.boolean().optional(),
  privacyManifestPresent: z.boolean().optional(),
  requiredReasonApisDeclared: z.boolean().optional(),
  trackingUsed: z.boolean().optional(),
  trackingUsageDescriptionPresent: z.boolean().optional(),
  dataCollectionMatchesLabel: z.boolean().optional()
});

const businessSchema = z.object({
  hasIap: z.boolean().default(false),
  iapProducts: z.array(iapProductSchema).default([]),
  subscriptionTermsDisplayed: z.boolean().default(false),
  externalPaymentLinksPresent: z.boolean().default(false),
  restorePurchasesPresent: z.boolean().default(false),
  offersFreeTrial: z.boolean().default(false),
  freeTrialTermsDisplayed: z.boolean().default(false)
});

const businessOverrideSchema = z.object({
  hasIap: z.boolean().optional(),
  iapProducts: z.array(iapProductOverrideSchema).optional(),
  subscriptionTermsDisplayed: z.boolean().optional(),
  externalPaymentLinksPresent: z.boolean().optional(),
  restorePurchasesPresent: z.boolean().optional(),
  offersFreeTrial: z.boolean().optional(),
  freeTrialTermsDisplayed: z.boolean().optional()
});

const contentSchema = z.object({
  ageRatingDeclared: z.number().int().min(0).max(18).default(4),
  ageRatingRecommended: z.number().int().min(0).max(18).default(4),
  ugcModerationDeclared: z.boolean().default(false)
});

const contentOverrideSchema = z.object({
  ageRatingDeclared: z.number().int().min(0).max(18).optional(),
  ageRatingRecommended: z.number().int().min(0).max(18).optional(),
  ugcModerationDeclared: z.boolean().optional()
});

const appConfigSchema = appSchema.default({
    name: "",
    bundleId: ""
  });

const submissionConfigSchema = submissionSchema
  .default({
    platform: "ios",
    primaryMarkets: []
  });

const appCapabilitiesConfigSchema = appCapabilitiesSchema
  .default({
    loginRequired: false,
    paywallPresent: false,
    paywallReachable: true,
    placeholderContentPresent: false,
    declaredFeatures: [],
    inaccessibleFeatures: [],
    brokenFlows: [],
    onboardingRequiresExternalDependency: false,
    regionRestricted: false,
    regionRestrictionNotes: "",
    vpnRequired: false,
    ugcPresent: false
  });

const reviewConfigSchema = reviewSchema
  .default({
    notes: "",
    loginInstructions: "",
    internetRequired: true
  });

const metadataConfigSchema = metadataSchema
  .default({
    subtitle: "",
    description: "",
    keywords: "",
    primaryMarkets: [],
    requiredScreenshotDeviceTypes: ["iphone-6.7"],
    localizations: [],
    screenshots: []
  });

const privacyConfigSchema = privacySchema
  .default({
    policyReachable: true,
    nutritionLabelComplete: false,
    privacyManifestPresent: false,
    requiredReasonApisDeclared: false,
    trackingUsed: false,
    trackingUsageDescriptionPresent: false,
    dataCollectionMatchesLabel: true
  });

const businessConfigSchema = businessSchema
  .default({
    hasIap: false,
    iapProducts: [],
    subscriptionTermsDisplayed: false,
    externalPaymentLinksPresent: false,
    restorePurchasesPresent: false,
    offersFreeTrial: false,
    freeTrialTermsDisplayed: false
  });

const contentConfigSchema = contentSchema
  .default({
    ageRatingDeclared: 4,
    ageRatingRecommended: 4,
    ugcModerationDeclared: false
  });

export const preflightConfigSchema = z.object({
  app: appConfigSchema,
  submission: submissionConfigSchema,
  appCapabilities: appCapabilitiesConfigSchema,
  review: reviewConfigSchema,
  metadata: metadataConfigSchema,
  privacy: privacyConfigSchema,
  business: businessConfigSchema,
  content: contentConfigSchema
});

export const preflightConfigOverrideSchema = z.object({
  app: appOverrideSchema.optional(),
  submission: submissionOverrideSchema.optional(),
  appCapabilities: appCapabilitiesOverrideSchema.optional(),
  review: reviewOverrideSchema.optional(),
  metadata: metadataOverrideSchema.optional(),
  privacy: privacyOverrideSchema.optional(),
  business: businessOverrideSchema.optional(),
  content: contentOverrideSchema.optional()
});

export type PreflightConfig = z.infer<typeof preflightConfigSchema>;
export type PreflightConfigOverride = z.infer<typeof preflightConfigOverrideSchema>;

export const defaultPreflightConfig: PreflightConfig = preflightConfigSchema.parse({});

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeLocalization(entry: unknown): UnknownRecord {
  const record = asRecord(entry);

  return {
    locale: asString(record.locale) ?? "en-US",
    title: asString(record.title) ?? "",
    subtitle: asString(record.subtitle) ?? "",
    description: asString(record.description) ?? "",
    keywords: asString(record.keywords) ?? ""
  };
}

function normalizeScreenshot(entry: unknown): UnknownRecord {
  const record = asRecord(entry);

  return {
    path: asString(record.path) ?? "",
    locales: asStringArray(record.locales) ?? [],
    deviceType: asString(record.deviceType) ?? "iphone-6.7"
  };
}

function normalizeIapProduct(entry: unknown): UnknownRecord {
  const record = asRecord(entry);

  return {
    productId: asString(record.productId) ?? "",
    displayName: asString(record.displayName) ?? "",
    reachableFromPaywall: asBoolean(record.reachableFromPaywall) ?? true
  };
}

function preferString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const stringValue = asString(value);
    if (stringValue !== undefined) {
      return stringValue;
    }
  }

  return undefined;
}

function preferBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    const booleanValue = asBoolean(value);
    if (booleanValue !== undefined) {
      return booleanValue;
    }
  }

  return undefined;
}

function preferNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const numberValue = asNumber(value);
    if (numberValue !== undefined) {
      return numberValue;
    }
  }

  return undefined;
}

function preferStringArray(...values: unknown[]): string[] | undefined {
  for (const value of values) {
    const arrayValue = asStringArray(value);
    if (arrayValue !== undefined) {
      return arrayValue;
    }
  }

  return undefined;
}

function pickPaths(source: unknown, paths: string[]): UnknownRecord {
  const result: UnknownRecord = {};
  const sourceRecord = asRecord(source);

  for (const path of paths) {
    const segments = path.split(".");
    let currentSource: unknown = sourceRecord;
    let found = true;

    for (const segment of segments) {
      const record = asRecord(currentSource);
      if (!hasOwn(record, segment)) {
        found = false;
        break;
      }

      currentSource = record[segment];
    }

    if (!found) {
      continue;
    }

    let currentTarget: UnknownRecord = result;

    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        currentTarget[segment] = currentSource;
        return;
      }

      const next = asRecord(currentTarget[segment]);
      currentTarget[segment] = next;
      currentTarget = next;
    });
  }

  return result;
}

export function normalizePreflightConfig(raw: unknown): {
  normalized: unknown;
  warnings: ConfigWarning[];
} {
  const root = asRecord(raw);
  const app = asRecord(root.app);
  const submission = asRecord(root.submission);
  const capabilities = asRecord(root.appCapabilities);
  const review = asRecord(root.review);
  const reviewDemo = asRecord(review.demoAccount);
  const reviewContact = asRecord(review.contact);
  const metadata = asRecord(root.metadata);
  const privacy = asRecord(root.privacy);
  const business = asRecord(root.business);
  const content = asRecord(root.content);

  const warnings: ConfigWarning[] = [];

  const flatAliasKeys = [
    "hasDemoAccount",
    "demoEmail",
    "demoPassword",
    "hasPrivacyPolicy",
    "privacyPolicyUrl",
    "hasReviewNotes",
    "reviewNotes",
    "loginRequired",
    "iapEnabled"
  ];

  if (flatAliasKeys.some((key) => root[key] !== undefined)) {
    warnings.push({
      code: "legacy-flat-aliases",
      message: "legacy-flat-aliases"
    });
  }

  const localizations =
    Array.isArray(metadata.localizations) && metadata.localizations.length > 0
      ? metadata.localizations.map(normalizeLocalization)
      : [
          {
            locale: preferString(root.primaryLocale, metadata.primaryLocale, "en-US") ?? "en-US",
            title: preferString(root.title, app.name) ?? "",
            subtitle: preferString(root.subtitle, metadata.subtitle) ?? "",
            description: preferString(root.description, metadata.description) ?? "",
            keywords: preferString(root.keywords, metadata.keywords) ?? ""
          }
        ].filter((entry) => entry.title || entry.description);

  const screenshots = Array.isArray(metadata.screenshots)
    ? metadata.screenshots.map(normalizeScreenshot)
    : [];

  const normalized = {
    app: {
      name: preferString(app.name, root.name, root.appName, root.title) ?? "",
      bundleId: preferString(app.bundleId, root.bundleId) ?? ""
    },
    submission: {
      platform: "ios",
      primaryMarkets:
        preferStringArray(submission.primaryMarkets, metadata.primaryMarkets, root.primaryMarkets) ??
        []
    },
    appCapabilities: {
      loginRequired: preferBoolean(capabilities.loginRequired, root.loginRequired) ?? false,
      paywallPresent: preferBoolean(capabilities.paywallPresent, root.paywallPresent) ?? false,
      paywallReachable: preferBoolean(capabilities.paywallReachable, root.paywallReachable) ?? true,
      placeholderContentPresent:
        preferBoolean(
          capabilities.placeholderContentPresent,
          root.placeholderContentPresent
        ) ?? false,
      declaredFeatures:
        preferStringArray(capabilities.declaredFeatures, root.declaredFeatures) ?? [],
      inaccessibleFeatures:
        preferStringArray(capabilities.inaccessibleFeatures, root.inaccessibleFeatures) ?? [],
      brokenFlows: preferStringArray(capabilities.brokenFlows, root.brokenFlows) ?? [],
      onboardingRequiresExternalDependency:
        preferBoolean(
          capabilities.onboardingRequiresExternalDependency,
          root.onboardingRequiresExternalDependency
        ) ?? false,
      regionRestricted:
        preferBoolean(capabilities.regionRestricted, root.regionRestricted) ?? false,
      regionRestrictionNotes:
        preferString(capabilities.regionRestrictionNotes, root.regionRestrictionNotes) ?? "",
      vpnRequired: preferBoolean(capabilities.vpnRequired, root.vpnRequired) ?? false,
      ugcPresent: preferBoolean(capabilities.ugcPresent, root.ugcPresent) ?? false
    },
    review: {
      demoAccountRequired:
        preferBoolean(review.demoAccountRequired, root.demoAccountRequired) ?? undefined,
      demoAccount:
        preferBoolean(root.hasDemoAccount) === false &&
        !reviewDemo.username &&
        !reviewDemo.password &&
        !root.demoEmail &&
        !root.demoPassword
          ? undefined
          : {
              username: preferString(reviewDemo.username, root.demoEmail),
              password: preferString(reviewDemo.password, root.demoPassword),
              notes: preferString(reviewDemo.notes) ?? ""
            },
      contact: {
        name: preferString(reviewContact.name, root.contactName),
        email: preferString(reviewContact.email, root.contactEmail),
        phone: preferString(reviewContact.phone, root.contactPhone) ?? ""
      },
      notes:
        preferBoolean(root.hasReviewNotes) === false
          ? ""
          : preferString(review.notes, root.reviewNotes) ?? "",
      loginInstructions:
        preferString(review.loginInstructions, root.loginInstructions) ?? "",
      internetRequired: preferBoolean(review.internetRequired, root.internetRequired) ?? true
    },
    metadata: {
      subtitle: preferString(metadata.subtitle, root.subtitle) ?? "",
      description: preferString(metadata.description, root.description) ?? "",
      keywords: preferString(metadata.keywords, root.keywords) ?? "",
      primaryMarkets:
        preferStringArray(metadata.primaryMarkets, submission.primaryMarkets, root.primaryMarkets) ??
        [],
      requiredScreenshotDeviceTypes:
        preferStringArray(
          metadata.requiredScreenshotDeviceTypes,
          root.requiredScreenshotDeviceTypes
        ) ?? ["iphone-6.7"],
      localizations,
      screenshots
    },
    privacy: {
      policyUrl:
        preferBoolean(root.hasPrivacyPolicy) === false
          ? undefined
          : preferString(privacy.policyUrl, root.privacyPolicyUrl),
      policyReachable:
        preferBoolean(privacy.policyReachable, root.privacyPolicyReachable) ?? true,
      nutritionLabelComplete:
        preferBoolean(privacy.nutritionLabelComplete, root.nutritionLabelComplete) ?? false,
      privacyManifestPresent:
        preferBoolean(privacy.privacyManifestPresent, root.privacyManifestPresent) ?? false,
      requiredReasonApisDeclared:
        preferBoolean(
          privacy.requiredReasonApisDeclared,
          root.requiredReasonApisDeclared
        ) ?? false,
      trackingUsed: preferBoolean(privacy.trackingUsed, root.trackingUsed) ?? false,
      trackingUsageDescriptionPresent:
        preferBoolean(
          privacy.trackingUsageDescriptionPresent,
          root.trackingUsageDescriptionPresent
        ) ?? false,
      dataCollectionMatchesLabel:
        preferBoolean(
          privacy.dataCollectionMatchesLabel,
          root.dataCollectionMatchesLabel
        ) ?? true
    },
    business: {
      hasIap: preferBoolean(business.hasIap, root.iapEnabled, root.hasIap) ?? false,
      iapProducts: Array.isArray(business.iapProducts)
        ? business.iapProducts.map(normalizeIapProduct)
        : Array.isArray(root.iapProducts)
          ? root.iapProducts.map(normalizeIapProduct)
          : [],
      subscriptionTermsDisplayed:
        preferBoolean(
          business.subscriptionTermsDisplayed,
          root.subscriptionTermsDisplayed
        ) ?? false,
      externalPaymentLinksPresent:
        preferBoolean(
          business.externalPaymentLinksPresent,
          root.externalPaymentLinksPresent
        ) ?? false,
      restorePurchasesPresent:
        preferBoolean(business.restorePurchasesPresent, root.restorePurchasesPresent) ?? false,
      offersFreeTrial:
        preferBoolean(business.offersFreeTrial, root.offersFreeTrial) ?? false,
      freeTrialTermsDisplayed:
        preferBoolean(
          business.freeTrialTermsDisplayed,
          root.freeTrialTermsDisplayed
        ) ?? false
    },
    content: {
      ageRatingDeclared:
        preferNumber(content.ageRatingDeclared, root.ageRatingDeclared, root.ageRating) ?? 4,
      ageRatingRecommended:
        preferNumber(
          content.ageRatingRecommended,
          root.ageRatingRecommended,
          root.recommendedAgeRating,
          root.ageRating
        ) ?? 4,
      ugcModerationDeclared:
        preferBoolean(content.ugcModerationDeclared, root.ugcModerationDeclared) ?? false
    }
  };

  return {
    normalized,
    warnings
  };
}

export function normalizePreflightConfigOverride(raw: unknown): {
  normalized: unknown;
  warnings: ConfigWarning[];
} {
  const normalized = normalizePreflightConfig(raw);
  const root = asRecord(raw);
  const app = asRecord(root.app);
  const submission = asRecord(root.submission);
  const capabilities = asRecord(root.appCapabilities);
  const review = asRecord(root.review);
  const reviewDemo = asRecord(review.demoAccount);
  const reviewContact = asRecord(review.contact);
  const metadata = asRecord(root.metadata);
  const privacy = asRecord(root.privacy);
  const business = asRecord(root.business);
  const content = asRecord(root.content);

  const providedPaths = new Set<string>();

  if (hasOwn(app, "name") || hasOwn(root, "name") || hasOwn(root, "appName") || hasOwn(root, "title")) {
    providedPaths.add("app.name");
  }

  if (hasOwn(app, "bundleId") || hasOwn(root, "bundleId")) {
    providedPaths.add("app.bundleId");
  }

  if (hasOwn(submission, "platform")) {
    providedPaths.add("submission.platform");
  }

  if (hasOwn(submission, "primaryMarkets") || hasOwn(metadata, "primaryMarkets") || hasOwn(root, "primaryMarkets")) {
    providedPaths.add("submission.primaryMarkets");
    providedPaths.add("metadata.primaryMarkets");
  }

  [
    "loginRequired",
    "paywallPresent",
    "paywallReachable",
    "placeholderContentPresent",
    "declaredFeatures",
    "inaccessibleFeatures",
    "brokenFlows",
    "onboardingRequiresExternalDependency",
    "regionRestricted",
    "regionRestrictionNotes",
    "vpnRequired",
    "ugcPresent"
  ].forEach((key) => {
    if (hasOwn(capabilities, key) || hasOwn(root, key)) {
      providedPaths.add(`appCapabilities.${key}`);
    }
  });

  if (hasOwn(review, "demoAccountRequired") || hasOwn(root, "demoAccountRequired")) {
    providedPaths.add("review.demoAccountRequired");
  }

  if (hasOwn(reviewDemo, "username") || hasOwn(root, "demoEmail")) {
    providedPaths.add("review.demoAccount.username");
  }

  if (hasOwn(reviewDemo, "password") || hasOwn(root, "demoPassword")) {
    providedPaths.add("review.demoAccount.password");
  }

  if (hasOwn(reviewDemo, "notes")) {
    providedPaths.add("review.demoAccount.notes");
  }

  if (
    hasOwn(root, "hasDemoAccount") &&
    preferBoolean(root.hasDemoAccount) === false &&
    !hasOwn(reviewDemo, "username") &&
    !hasOwn(reviewDemo, "password") &&
    !hasOwn(root, "demoEmail") &&
    !hasOwn(root, "demoPassword")
  ) {
    providedPaths.add("review.demoAccount");
  }

  if (hasOwn(review, "notes") || hasOwn(root, "reviewNotes") || hasOwn(root, "hasReviewNotes")) {
    providedPaths.add("review.notes");
  }

  if (hasOwn(review, "loginInstructions") || hasOwn(root, "loginInstructions")) {
    providedPaths.add("review.loginInstructions");
  }

  if (hasOwn(review, "internetRequired") || hasOwn(root, "internetRequired")) {
    providedPaths.add("review.internetRequired");
  }

  if (
    hasOwn(reviewContact, "name") ||
    hasOwn(root, "contactName")
  ) {
    providedPaths.add("review.contact.name");
  }

  if (
    hasOwn(reviewContact, "email") ||
    hasOwn(root, "contactEmail")
  ) {
    providedPaths.add("review.contact.email");
  }

  if (
    hasOwn(reviewContact, "phone") ||
    hasOwn(root, "contactPhone")
  ) {
    providedPaths.add("review.contact.phone");
  }

  ["subtitle", "description", "keywords", "requiredScreenshotDeviceTypes", "screenshots"].forEach(
    (key) => {
      if (hasOwn(metadata, key) || hasOwn(root, key)) {
        providedPaths.add(`metadata.${key}`);
      }
    }
  );

  if (
    hasOwn(metadata, "localizations") ||
    hasOwn(root, "primaryLocale") ||
    hasOwn(root, "title") ||
    hasOwn(root, "subtitle") ||
    hasOwn(root, "description") ||
    hasOwn(root, "keywords")
  ) {
    providedPaths.add("metadata.localizations");
  }

  [
    "policyReachable",
    "nutritionLabelComplete",
    "privacyManifestPresent",
    "requiredReasonApisDeclared",
    "trackingUsed",
    "trackingUsageDescriptionPresent",
    "dataCollectionMatchesLabel"
  ].forEach((key) => {
    if (hasOwn(privacy, key) || hasOwn(root, key)) {
      providedPaths.add(`privacy.${key}`);
    }
  });

  if (hasOwn(privacy, "policyUrl") || hasOwn(root, "privacyPolicyUrl") || hasOwn(root, "hasPrivacyPolicy")) {
    providedPaths.add("privacy.policyUrl");
  }

  [
    "hasIap",
    "subscriptionTermsDisplayed",
    "externalPaymentLinksPresent",
    "restorePurchasesPresent",
    "offersFreeTrial",
    "freeTrialTermsDisplayed"
  ].forEach((key) => {
    if (hasOwn(business, key) || hasOwn(root, key) || (key === "hasIap" && hasOwn(root, "iapEnabled"))) {
      providedPaths.add(`business.${key}`);
    }
  });

  if (hasOwn(business, "iapProducts") || hasOwn(root, "iapProducts")) {
    providedPaths.add("business.iapProducts");
  }

  ["ageRatingDeclared", "ageRatingRecommended", "ugcModerationDeclared"].forEach((key) => {
    if (hasOwn(content, key) || hasOwn(root, key) || (key === "ageRatingDeclared" && hasOwn(root, "ageRating")) || (key === "ageRatingRecommended" && hasOwn(root, "recommendedAgeRating"))) {
      providedPaths.add(`content.${key}`);
    }
  });

  return {
    normalized: pickPaths(normalized.normalized, [...providedPaths]),
    warnings: normalized.warnings
  };
}
