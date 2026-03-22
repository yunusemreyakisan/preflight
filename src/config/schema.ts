import { z } from "zod";

import type { ConfigWarning } from "../types";

const localizationSchema = z.object({
  locale: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().default(""),
  description: z.string().trim().min(1),
  keywords: z.string().trim().default("")
});

const screenshotSchema = z.object({
  path: z.string().trim().min(1),
  locales: z.array(z.string().trim().min(1)).default([]),
  deviceType: z.string().trim().min(1).default("iphone-6.7")
});

const demoAccountSchema = z.object({
  username: z.string().trim().min(1).optional(),
  password: z.string().trim().min(1).optional(),
  notes: z.string().trim().default("")
});

const reviewerContactSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().default("")
});

const iapProductSchema = z.object({
  productId: z.string().trim().min(1),
  displayName: z.string().trim().default(""),
  reachableFromPaywall: z.boolean().default(true)
});

export const preflightConfigSchema = z.object({
  app: z.object({
    name: z.string().trim().min(1),
    bundleId: z.string().trim().min(1)
  }),
  submission: z
    .object({
      platform: z.literal("ios").default("ios"),
      primaryMarkets: z.array(z.string().trim().min(1)).default([])
    })
    .default({
      platform: "ios",
      primaryMarkets: []
    }),
  appCapabilities: z
    .object({
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
    })
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
    }),
  review: z
    .object({
      demoAccountRequired: z.boolean().optional(),
      demoAccount: demoAccountSchema.optional(),
      contact: reviewerContactSchema.optional(),
      notes: z.string().trim().default(""),
      loginInstructions: z.string().trim().default(""),
      internetRequired: z.boolean().default(true)
    })
    .default({
      notes: "",
      loginInstructions: "",
      internetRequired: true
    }),
  metadata: z
    .object({
      subtitle: z.string().trim().default(""),
      description: z.string().trim().default(""),
      keywords: z.string().trim().default(""),
      primaryMarkets: z.array(z.string().trim().min(1)).default([]),
      requiredScreenshotDeviceTypes: z.array(z.string().trim().min(1)).default([
        "iphone-6.7"
      ]),
      localizations: z.array(localizationSchema).default([]),
      screenshots: z.array(screenshotSchema).default([])
    })
    .default({
      subtitle: "",
      description: "",
      keywords: "",
      primaryMarkets: [],
      requiredScreenshotDeviceTypes: ["iphone-6.7"],
      localizations: [],
      screenshots: []
    }),
  privacy: z
    .object({
      policyUrl: z.string().trim().url().optional(),
      policyReachable: z.boolean().default(true),
      nutritionLabelComplete: z.boolean().default(false),
      privacyManifestPresent: z.boolean().default(false),
      requiredReasonApisDeclared: z.boolean().default(false),
      trackingUsed: z.boolean().default(false),
      trackingUsageDescriptionPresent: z.boolean().default(false),
      dataCollectionMatchesLabel: z.boolean().default(true)
    })
    .default({
      policyReachable: true,
      nutritionLabelComplete: false,
      privacyManifestPresent: false,
      requiredReasonApisDeclared: false,
      trackingUsed: false,
      trackingUsageDescriptionPresent: false,
      dataCollectionMatchesLabel: true
    }),
  business: z
    .object({
      hasIap: z.boolean().default(false),
      iapProducts: z.array(iapProductSchema).default([]),
      subscriptionTermsDisplayed: z.boolean().default(false),
      externalPaymentLinksPresent: z.boolean().default(false),
      restorePurchasesPresent: z.boolean().default(false),
      offersFreeTrial: z.boolean().default(false),
      freeTrialTermsDisplayed: z.boolean().default(false)
    })
    .default({
      hasIap: false,
      iapProducts: [],
      subscriptionTermsDisplayed: false,
      externalPaymentLinksPresent: false,
      restorePurchasesPresent: false,
      offersFreeTrial: false,
      freeTrialTermsDisplayed: false
    }),
  content: z
    .object({
      ageRatingDeclared: z.number().int().min(0).max(18).default(4),
      ageRatingRecommended: z.number().int().min(0).max(18).default(4),
      ugcModerationDeclared: z.boolean().default(false)
    })
    .default({
      ageRatingDeclared: 4,
      ageRatingRecommended: 4,
      ugcModerationDeclared: false
    })
});

export type PreflightConfig = z.infer<typeof preflightConfigSchema>;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
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

