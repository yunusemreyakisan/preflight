import fs from "node:fs";
import path from "node:path";

import { collectFieldSources, setPathValue } from "../config/object-helpers";
import type { PreflightConfigOverride } from "../config/schema";
import type {
  DiscoveryEvidence,
  DiscoveryReport,
  FieldSource,
  Issue,
  ProjectType,
  Translator
} from "../types";

const DISCOVERY_LAST_VERIFIED = "2026-03-23";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".dart_tool",
  "DerivedData",
  "Pods",
  "build",
  "coverage",
  "dist",
  "node_modules"
]);

type UnknownRecord = Record<string, unknown>;

const ENTITLEMENT_CAPABILITY_PATTERNS = [
  {
    label: "push-notifications",
    pattern: /aps-environment/
  },
  {
    label: "associated-domains",
    pattern: /com\.apple\.developer\.associated-domains/
  },
  {
    label: "apple-pay",
    pattern: /com\.apple\.developer\.in-app-payments/
  },
  {
    label: "app-groups",
    pattern: /com\.apple\.security\.application-groups/
  },
  {
    label: "healthkit",
    pattern: /com\.apple\.developer\.healthkit/
  }
] as const;

export interface DiscoverySuccess {
  ok: true;
  config: PreflightConfigOverride;
  fieldSources: Record<string, FieldSource>;
  report: DiscoveryReport;
}

export interface DiscoveryFailure {
  ok: false;
  report: DiscoveryReport;
  issue: Issue;
}

export type DiscoveryResult = DiscoverySuccess | DiscoveryFailure;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function readTextIfExists(filePath?: string): string | undefined {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function unquote(value: string): string {
  return value.trim().replace(/^"(.*)"$/, "$1");
}

function detectProjectType(rootDir: string): ProjectType {
  const hasIosDir = fs.existsSync(path.join(rootDir, "ios"));
  const hasPubspec = fs.existsSync(path.join(rootDir, "pubspec.yaml"));
  const packageJsonPath = path.join(rootDir, "package.json");

  if (hasIosDir && hasPubspec) {
    return "flutter-ios";
  }

  if (hasIosDir && fs.existsSync(packageJsonPath)) {
    const packageJson = readTextIfExists(packageJsonPath) ?? "";
    if (/"react-native"\s*:/.test(packageJson)) {
      return "react-native-ios";
    }
  }

  if (findFirstMatchingFile(rootDir, (entryPath, entryName) =>
    entryName.endsWith(".xcodeproj") && !entryPath.includes("/Pods/")
  )) {
    return "native-ios";
  }

  return "unknown";
}

function findFirstMatchingFile(
  rootDir: string,
  predicate: (entryPath: string, entryName: string) => boolean,
  maxDepth = 5
): string | undefined {
  function walk(currentDir: string, depth: number): string | undefined {
    if (depth > maxDepth) {
      return undefined;
    }

    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return undefined;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);

      if (predicate(absolutePath, entry.name)) {
        return absolutePath;
      }

      if (entry.isDirectory()) {
        const nested = walk(absolutePath, depth + 1);
        if (nested) {
          return nested;
        }
      }
    }

    return undefined;
  }

  return walk(rootDir, 0);
}

function findAllMatchingFiles(
  rootDir: string,
  predicate: (entryPath: string, entryName: string) => boolean,
  maxDepth = 5
): string[] {
  const results: string[] = [];

  function walk(currentDir: string, depth: number): void {
    if (depth > maxDepth) {
      return;
    }

    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);

      if (predicate(absolutePath, entry.name)) {
        results.push(absolutePath);
      }

      if (entry.isDirectory()) {
        walk(absolutePath, depth + 1);
      }
    }
  }

  walk(rootDir, 0);

  return results;
}

function findIosRoot(rootDir: string, projectType: ProjectType): string | undefined {
  if (projectType === "flutter-ios" || projectType === "react-native-ios") {
    const iosDir = path.join(rootDir, "ios");
    return fs.existsSync(iosDir) ? iosDir : undefined;
  }

  const xcodeproj = findFirstMatchingFile(
    rootDir,
    (entryPath, entryName) =>
      entryName.endsWith(".xcodeproj") && !entryPath.includes("/Pods/")
  );

  return xcodeproj ? path.dirname(xcodeproj) : undefined;
}

function chooseNonTestValue(values: string[]): string | undefined {
  return values.find(
    (value) => !/tests?|uitests?|pods/i.test(value)
  ) ?? values[0];
}

function collectMatches(content: string, expression: RegExp): string[] {
  const matches = content.matchAll(expression);
  const values = new Set<string>();

  for (const match of matches) {
    const value = normalizeWhitespace(unquote(match[1] ?? ""));
    if (!value) {
      continue;
    }

    values.add(value);
  }

  return [...values];
}

function resolveProjectFilePath(
  candidatePath: string | undefined,
  iosRoot: string,
  replacementTarget?: string
): string | undefined {
  if (!candidatePath) {
    return undefined;
  }

  const normalized = candidatePath
    .replace(/\$\(SRCROOT\)|\$\{SRCROOT\}|\$\(PROJECT_DIR\)|\$\{PROJECT_DIR\}/g, iosRoot)
    .replace(/\$\(TARGET_NAME\)|\$\{TARGET_NAME\}/g, replacementTarget ?? "")
    .replace(/"/g, "")
    .trim();

  if (!normalized) {
    return undefined;
  }

  const directPath = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(iosRoot, normalized);

  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const baseName = path.basename(normalized);
  return findFirstMatchingFile(iosRoot, (entryPath, entryName) => {
    return entryName === baseName && !entryPath.includes("/Pods/");
  });
}

function extractXmlPlistValue(content: string, key: string): string | undefined {
  const stringMatch = content.match(
    new RegExp(`<key>${key}</key>\\s*<string>([\\s\\S]*?)</string>`, "i")
  );

  if (stringMatch?.[1]) {
    return normalizeWhitespace(stringMatch[1]);
  }

  if (
    new RegExp(`<key>${key}</key>\\s*<true\\s*/>`, "i").test(content)
  ) {
    return "true";
  }

  if (
    new RegExp(`<key>${key}</key>\\s*<false\\s*/>`, "i").test(content)
  ) {
    return "false";
  }

  return undefined;
}

function extractRequiredReasonApiCount(content: string): number {
  const arrayMatch = content.match(
    /<key>NSPrivacyAccessedAPITypes<\/key>\s*<array>([\s\S]*?)<\/array>/i
  );

  if (!arrayMatch?.[1]) {
    return 0;
  }

  return (arrayMatch[1].match(/<dict>/g) ?? []).length;
}

function classifyDeviceType(filePath: string): string {
  const normalized = filePath.toLowerCase();

  if (/6[._-]?7/.test(normalized)) {
    return "iphone-6.7";
  }

  if (/6[._-]?5/.test(normalized)) {
    return "iphone-6.5";
  }

  if (/5[._-]?5/.test(normalized)) {
    return "iphone-5.5";
  }

  return "iphone-6.7";
}

function detectLocalesFromPath(filePath: string): string[] {
  const matches = filePath.match(/[a-z]{2}-[A-Z]{2}/g) ?? [];
  return [...new Set(matches)];
}

function buildDiscoveryIssue(
  translator: Translator,
  projectRoot: string
): Issue {
  return {
    id: "DISCOVERY_001",
    title: translator.t("issue.DISCOVERY_001.title"),
    guideline: "Preflight Discovery",
    severity: "high",
    category: "configuration",
    message: translator.t("issue.DISCOVERY_001.message", {
      path: projectRoot
    }),
    fix: translator.t("issue.DISCOVERY_001.fix"),
    lastVerified: DISCOVERY_LAST_VERIFIED
  };
}

function pushEvidence(
  evidence: DiscoveryEvidence[],
  key: string,
  source: string,
  value?: string,
  detail?: string
): void {
  evidence.push({
    key,
    source,
    value,
    detail
  });
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function parseStoreKitProducts(filePath: string): { productIds: string[]; productCount: number } {
  const content = readTextIfExists(filePath);

  if (!content) {
    return {
      productIds: [],
      productCount: 0
    };
  }

  try {
    const parsed = JSON.parse(content);
    const root = asRecord(parsed);
    const products = Array.isArray(root.products) ? root.products : [];
    const productIds = products
      .map((entry) => asRecord(entry))
      .map((entry) => {
        const productId = entry.productID;
        return typeof productId === "string" ? productId.trim() : "";
      })
      .filter(Boolean);

    return {
      productIds,
      productCount: productIds.length
    };
  } catch {
    const productIds = [...new Set(content.match(/"productID"\s*:\s*"([^"]+)"/g) ?? [])]
      .map((entry) => entry.match(/"([^"]+)"\s*$/)?.[1] ?? "")
      .filter(Boolean);

    return {
      productIds,
      productCount: productIds.length
    };
  }
}

export function discoverProject(options: {
  cwd?: string;
  translator: Translator;
}): DiscoveryResult {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const projectType = detectProjectType(projectRoot);
  const iosRoot = findIosRoot(projectRoot, projectType);
  const xcodeprojPath =
    iosRoot &&
    findFirstMatchingFile(
      iosRoot,
      (entryPath, entryName) =>
        entryName.endsWith(".xcodeproj") && !entryPath.includes("/Pods/")
    );

  const report: DiscoveryReport = {
    project_type: projectType,
    project_root: projectRoot,
    ios_root: iosRoot,
    xcodeproj_path: xcodeprojPath,
    capability_hints: [],
    sources: [],
    warnings: [],
    evidence: []
  };

  if (!iosRoot || !xcodeprojPath) {
    return {
      ok: false,
      report,
      issue: buildDiscoveryIssue(options.translator, projectRoot)
    };
  }

  const pbxprojPath = path.join(xcodeprojPath, "project.pbxproj");
  const pbxprojContent = readTextIfExists(pbxprojPath);
  const discovered: PreflightConfigOverride = {};

  if (!pbxprojContent) {
    report.warnings.push(options.translator.t("discovery.warning.pbxprojUnreadable"));
  } else {
    const bundleIds = collectMatches(
      pbxprojContent,
      /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g
    );
    const productNames = collectMatches(
      pbxprojContent,
      /PRODUCT_NAME\s*=\s*([^;]+);/g
    );
    const infoPlistCandidates = collectMatches(
      pbxprojContent,
      /INFOPLIST_FILE\s*=\s*([^;]+);/g
    );
    const entitlementsCandidates = collectMatches(
      pbxprojContent,
      /CODE_SIGN_ENTITLEMENTS\s*=\s*([^;]+);/g
    );
    const trackingDescriptionCandidates = collectMatches(
      pbxprojContent,
      /INFOPLIST_KEY_NSUserTrackingUsageDescription\s*=\s*([^;]+);/g
    );

    const preferredProductName = chooseNonTestValue(productNames);
    const preferredBundleId = chooseNonTestValue(bundleIds);

    if (preferredProductName) {
      setPathValue(discovered as UnknownRecord, "app.name", preferredProductName);
      pushEvidence(report.evidence, "app.name", pbxprojPath, preferredProductName, "Found in project.pbxproj");
    }

    if (preferredBundleId) {
      setPathValue(discovered as UnknownRecord, "app.bundleId", preferredBundleId);
      pushEvidence(
        report.evidence,
        "app.bundleId",
        pbxprojPath,
        preferredBundleId,
        "Found in project.pbxproj"
      );
    }

    const targetName =
      preferredProductName ?? path.basename(xcodeprojPath, ".xcodeproj");
    const infoPlistPath = resolveProjectFilePath(
      chooseNonTestValue(infoPlistCandidates),
      iosRoot,
      targetName
    ) ??
      findFirstMatchingFile(iosRoot, (entryPath, entryName) => {
        return entryName === "Info.plist" && !/tests?/i.test(entryPath);
      });

    const entitlementsPath = resolveProjectFilePath(
      chooseNonTestValue(entitlementsCandidates),
      iosRoot,
      targetName
    ) ??
      findFirstMatchingFile(iosRoot, (entryPath, entryName) => {
        return entryName.endsWith(".entitlements") && !/tests?/i.test(entryPath);
      });

    if (infoPlistPath) {
      report.info_plist_path = infoPlistPath;
    }

    if (entitlementsPath) {
      report.entitlements_path = entitlementsPath;
    }

    if (trackingDescriptionCandidates.length > 0) {
      setPathValue(
        discovered as UnknownRecord,
        "privacy.trackingUsageDescriptionPresent",
        true
      );
      pushEvidence(
        report.evidence,
        "privacy.trackingUsageDescriptionPresent",
        pbxprojPath,
        "true",
        "Tracking usage description found in project settings"
      );
    }

    const infoPlistContent = readTextIfExists(infoPlistPath);

    if (infoPlistContent) {
      const displayName =
        extractXmlPlistValue(infoPlistContent, "CFBundleDisplayName") ??
        extractXmlPlistValue(infoPlistContent, "CFBundleName");

      if (displayName) {
        setPathValue(discovered as UnknownRecord, "app.name", displayName);
        pushEvidence(
          report.evidence,
          "app.name",
          infoPlistPath!,
          displayName,
          "Found in Info.plist"
        );
      }

      const trackingDescription = extractXmlPlistValue(
        infoPlistContent,
        "NSUserTrackingUsageDescription"
      );

      if (trackingDescription) {
        setPathValue(
          discovered as UnknownRecord,
          "privacy.trackingUsageDescriptionPresent",
          true
        );
        pushEvidence(
          report.evidence,
          "privacy.trackingUsageDescriptionPresent",
          infoPlistPath!,
          "true",
          "Found in Info.plist"
        );
      }
    }

    const entitlementsContent = readTextIfExists(entitlementsPath);

    if (entitlementsContent) {
      report.capability_hints = ENTITLEMENT_CAPABILITY_PATTERNS
        .filter((entry) => entry.pattern.test(entitlementsContent))
        .map((entry) => entry.label);

      report.capability_hints.forEach((hint) => {
        pushEvidence(
          report.evidence,
          "discovery.capability_hints",
          entitlementsPath!,
          hint,
          "Capability hint found in entitlements"
        );
      });
    }
  }

  const privacyManifestPath =
    findFirstMatchingFile(iosRoot, (entryPath, entryName) => {
      return entryName === "PrivacyInfo.xcprivacy" && !entryPath.includes("/Pods/");
    }) ?? findFirstMatchingFile(projectRoot, (entryPath, entryName) => {
      return entryName === "PrivacyInfo.xcprivacy" && !entryPath.includes("/Pods/");
    });

  if (privacyManifestPath) {
    report.privacy_manifest_path = privacyManifestPath;
    setPathValue(discovered as UnknownRecord, "privacy.privacyManifestPresent", true);
    pushEvidence(
      report.evidence,
      "privacy.privacyManifestPresent",
      privacyManifestPath,
      "true",
      "PrivacyInfo.xcprivacy found"
    );

    const privacyManifestContent = readTextIfExists(privacyManifestPath);

    if (privacyManifestContent) {
      const requiredReasonApiCount = extractRequiredReasonApiCount(privacyManifestContent);
      if (requiredReasonApiCount > 0) {
        setPathValue(
          discovered as UnknownRecord,
          "privacy.requiredReasonApisDeclared",
          true
        );
        pushEvidence(
          report.evidence,
          "privacy.requiredReasonApisDeclared",
          privacyManifestPath,
          String(requiredReasonApiCount),
          "Required reason API entries found"
        );
      }
    }
  }

  const storeKitFiles = findAllMatchingFiles(
    iosRoot,
    (entryPath, entryName) => entryName.endsWith(".storekit") && !entryPath.includes("/Pods/"),
    6
  );

  if (storeKitFiles.length > 0) {
    setPathValue(discovered as UnknownRecord, "business.hasIap", true);
    setPathValue(discovered as UnknownRecord, "appCapabilities.paywallPresent", true);
    pushEvidence(
      report.evidence,
      "business.hasIap",
      storeKitFiles[0],
      "true",
      "StoreKit configuration file found"
    );

    const productIds = new Set<string>();
    storeKitFiles.forEach((filePath) => {
      const parsed = parseStoreKitProducts(filePath);
      parsed.productIds.forEach((productId) => productIds.add(productId));
    });

    if (productIds.size > 0) {
      setPathValue(
        discovered as UnknownRecord,
        "business.iapProducts",
        [...productIds].map((productId) => ({
          productId,
          displayName: "",
          reachableFromPaywall: true
        }))
      );
      pushEvidence(
        report.evidence,
        "business.iapProducts",
        storeKitFiles[0],
        String(productIds.size),
        "In-app purchase products found in StoreKit configuration"
      );
    }
  }

  const screenshotFiles = findAllMatchingFiles(
    projectRoot,
    (entryPath, entryName) => {
      return (
        IMAGE_EXTENSIONS.has(path.extname(entryName).toLowerCase()) &&
        /screenshot|screen-shot|screen_shot|fastlane/i.test(entryPath)
      );
    },
    6
  );

  if (screenshotFiles.length > 0) {
    const screenshots = screenshotFiles.map((filePath) => ({
      path: path.relative(projectRoot, filePath),
      locales: detectLocalesFromPath(filePath),
      deviceType: classifyDeviceType(filePath)
    }));
    const deviceTypes = [...new Set(screenshots.map((entry) => entry.deviceType))];

    setPathValue(discovered as UnknownRecord, "metadata.screenshots", screenshots);
    setPathValue(
      discovered as UnknownRecord,
      "metadata.requiredScreenshotDeviceTypes",
      deviceTypes
    );
    pushEvidence(
      report.evidence,
      "metadata.screenshots",
      screenshotFiles[0],
      String(screenshotFiles.length),
      "Screenshot assets found"
    );
  }

  const fieldSources = collectFieldSources(discovered, "discovered");
  report.sources = uniqueStrings([
    report.xcodeproj_path ? path.join(report.xcodeproj_path, "project.pbxproj") : "",
    report.info_plist_path ?? "",
    report.entitlements_path ?? "",
    report.privacy_manifest_path ?? "",
    ...report.evidence.map((entry) => entry.source)
  ]);

  return {
    ok: true,
    config: discovered,
    fieldSources,
    report
  };
}
