import fs from "node:fs";
import { createPrivateKey, createSign } from "node:crypto";

import {
  readAppStoreConnectLocalConfig,
  runGuidedAppStoreConnectSetup
} from "./local-config";
import { collectFieldSources } from "../config/object-helpers";
import type { PreflightConfig, PreflightConfigOverride } from "../config/schema";
import type {
  AppStoreConnectAuthSource,
  AppStoreConnectComparisonStatus,
  AppStoreConnectInteractiveRuntime,
  AppStoreConnectIapCheck,
  AppStoreConnectReport,
  AppStoreConnectScreenshotCheck,
  AppStoreConnectSummary,
  AppStoreConnectValueCheck,
  FieldSource,
  ScreenshotAssetStatus,
  Translator
} from "../types";

const APP_STORE_CONNECT_BASE_URL = "https://api.appstoreconnect.apple.com";
const APP_STORE_CONNECT_AUDIENCE = "appstoreconnect-v1";
const APP_STORE_CONNECT_TOKEN_TTL_SECONDS = 5 * 60;
const REMOTE_FIELD_SOURCE: FieldSource = "app-store-connect";
const EDITABLE_VERSION_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "REJECTED",
  "DEVELOPER_REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY"
]);

type FetchLike = typeof fetch;
type UnknownRecord = Record<string, unknown>;

interface JsonApiLinks {
  next?: string;
  related?: string;
  self?: string;
}

interface JsonApiIdentifier {
  id: string;
  type: string;
}

interface JsonApiRelationship {
  data?: JsonApiIdentifier | JsonApiIdentifier[] | null;
  links?: JsonApiLinks;
}

interface JsonApiResource<TAttributes = UnknownRecord> {
  id: string;
  type: string;
  attributes?: TAttributes;
  relationships?: Record<string, JsonApiRelationship>;
}

interface JsonApiDocument<TResource extends JsonApiResource = JsonApiResource> {
  data: TResource | TResource[] | null;
  included?: JsonApiResource[];
  links?: JsonApiLinks;
  errors?: Array<{
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
  }>;
}

interface AppResourceAttributes {
  bundleId?: string;
  name?: string;
  primaryLocale?: string;
}

interface AppStoreVersionAttributes {
  appVersionState?: string;
  createdDate?: string;
  versionString?: string;
}

interface AppStoreVersionLocalizationAttributes {
  description?: string;
  keywords?: string;
  locale?: string;
}

interface AppInfoLocalizationAttributes {
  locale?: string;
  name?: string;
  privacyPolicyUrl?: string;
  subtitle?: string;
}

interface AppStoreReviewDetailAttributes {
  contactEmail?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  demoAccountName?: string;
  demoAccountPassword?: string;
  demoAccountRequired?: boolean;
  notes?: string;
}

interface AppScreenshotSetAttributes {
  screenshotDisplayType?: string;
}

interface InAppPurchaseV2Attributes {
  name?: string;
  productId?: string;
  state?: string;
}

interface TerritoryAttributes {
  code?: string;
}

interface AppStoreConnectCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
  appId?: string;
}

interface ResolvedCredentialsSuccess {
  ok: true;
  authSource: AppStoreConnectAuthSource;
  credentials: AppStoreConnectCredentials;
  notes: string[];
}

interface ResolvedCredentialsFailure {
  ok: false;
  report: AppStoreConnectReport;
}

type ResolvedCredentialsResult =
  | ResolvedCredentialsSuccess
  | ResolvedCredentialsFailure;

interface AppStoreConnectVersion {
  createdDate?: string;
  id: string;
  state?: string;
  versionString?: string;
}

interface AppStoreConnectLocalization {
  description?: string;
  keywords?: string;
  locale: string;
  name?: string;
  privacyPolicyUrl?: string;
  subtitle?: string;
}

interface AppStoreConnectReviewDetails {
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  demoAccountName?: string;
  demoAccountPassword?: string;
  demoAccountRequired?: boolean;
  notes?: string;
}

interface AppStoreConnectScreenshotSummary {
  count: number;
  deviceType: string;
  locale: string;
}

interface AppStoreConnectIapSummary {
  hasPriceSchedule?: boolean;
  name?: string;
  productId: string;
  state?: string;
}

interface AppStoreConnectSnapshot {
  appId: string;
  appName?: string;
  availableTerritories: string[];
  bundleId: string;
  hasAppPriceSchedule?: boolean;
  iaps: AppStoreConnectIapSummary[];
  localizations: AppStoreConnectLocalization[];
  missingEnv: string[];
  notes: string[];
  primaryLocale?: string;
  reviewAttachmentCount?: number;
  reviewDetails?: AppStoreConnectReviewDetails;
  screenshotSummaries: AppStoreConnectScreenshotSummary[];
  warnings: string[];
  version?: AppStoreConnectVersion;
  versionSource?: "editable" | "latest-live" | "latest-any";
}

export interface AppStoreConnectSyncResult {
  config: PreflightConfigOverride;
  fieldSources: Record<string, FieldSource>;
  report: AppStoreConnectReport;
}

class AppStoreConnectRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "AppStoreConnectRequestError";
  }
}

function buildEmptySummary(): AppStoreConnectSummary {
  return {
    value_matches: 0,
    value_mismatches: 0,
    value_remote_only: 0,
    value_local_only: 0,
    screenshot_matches: 0,
    screenshot_mismatches: 0,
    screenshot_remote_only: 0,
    screenshot_local_only: 0,
    iap_matches: 0,
    iap_mismatches: 0,
    iap_remote_only: 0,
    iap_local_only: 0
  };
}

function createBaseReport(
  status: AppStoreConnectReport["status"],
  warnings: string[] = [],
  notes: string[] = [],
  missingEnv: string[] = []
): AppStoreConnectReport {
  return {
    status,
    missing_env: missingEnv,
    value_checks: [],
    screenshot_checks: [],
    iap_checks: [],
    available_territories: [],
    warnings,
    notes,
    summary: buildEmptySummary()
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimToUndefined(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeForCompare(value: string | undefined): string | undefined {
  const trimmed = trimToUndefined(value);
  return trimmed ? normalizeWhitespace(trimmed).toLowerCase() : undefined;
}

function formatBoolean(value: boolean | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value ? "yes" : "no";
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function stringifySearchParams(query: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function compareVersionStrings(left = "", right = ""): number {
  const leftParts = left.split(".").map((part) => Number(part) || 0);
  const rightParts = right.split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return left.localeCompare(right);
}

function compareVersionsDescending(
  left: AppStoreConnectVersion,
  right: AppStoreConnectVersion
): number {
  const leftDate = left.createdDate ? Date.parse(left.createdDate) : NaN;
  const rightDate = right.createdDate ? Date.parse(right.createdDate) : NaN;

  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return compareVersionStrings(right.versionString, left.versionString);
}

function isLiveVersion(state?: string): boolean {
  return state === "READY_FOR_SALE";
}

function resolveRemoteDeviceType(value: string | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("APP_IPHONE_67")) {
    return "iphone-6.7";
  }

  if (normalized.includes("APP_IPHONE_65")) {
    return "iphone-6.5";
  }

  if (normalized.includes("APP_IPHONE_61")) {
    return "iphone-6.1";
  }

  if (normalized.includes("APP_IPHONE_58")) {
    return "iphone-5.8";
  }

  if (normalized.includes("APP_IPHONE_55")) {
    return "iphone-5.5";
  }

  if (normalized.includes("APP_IPAD_PRO_3GEN_129") || normalized.includes("APP_IPAD_PRO_129")) {
    return "ipad-12.9";
  }

  if (normalized.includes("APP_IPAD_PRO_11")) {
    return "ipad-11";
  }

  return normalized.toLowerCase();
}

function buildMissingEnv(
  issuerId?: string,
  keyId?: string,
  inlinePrivateKey?: string,
  privateKeyPath?: string
): string[] {
  return [
    ...(!issuerId ? ["ASC_ISSUER_ID"] : []),
    ...(!keyId ? ["ASC_KEY_ID"] : []),
    ...(!inlinePrivateKey && !privateKeyPath
      ? ["ASC_PRIVATE_KEY or ASC_PRIVATE_KEY_PATH"]
      : [])
  ];
}

function readPrivateKeyFromPath(
  privateKeyPath: string,
  translator: Translator
):
  | {
      ok: true;
      privateKey: string;
    }
  | {
      ok: false;
      warning: string;
    } {
  try {
    return {
      ok: true,
      privateKey: fs.readFileSync(privateKeyPath, "utf8")
    };
  } catch (error) {
    return {
      ok: false,
      warning: translator.t("appStoreConnect.warning.privateKeyUnreadable", {
        message: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function resolveGuidedCredentials(options: {
  allowInteractiveSetup: boolean;
  initialWarnings?: string[];
  missingEnv: string[];
  runtime?: AppStoreConnectInteractiveRuntime;
  translator: Translator;
}): Promise<ResolvedCredentialsResult> {
  const notes = [options.translator.t("appStoreConnect.note.credentialsMissing")];

  if (!options.allowInteractiveSetup) {
    return {
      ok: false,
      report: createBaseReport(
        options.initialWarnings && options.initialWarnings.length > 0
          ? "unavailable"
          : "skipped",
        options.initialWarnings ?? [],
        notes,
        options.missingEnv
      )
    };
  }

  const setupResult = await runGuidedAppStoreConnectSetup({
    runtime: options.runtime,
    translator: options.translator
  });

  if (!setupResult.ok) {
    return {
      ok: false,
      report: createBaseReport(
        "unavailable",
        [...(options.initialWarnings ?? []), ...setupResult.warnings],
        notes,
        options.missingEnv
      )
    };
  }

  const privateKeyResult = readPrivateKeyFromPath(
    setupResult.config.privateKeyPath,
    options.translator
  );

  if (!privateKeyResult.ok) {
    return {
      ok: false,
      report: createBaseReport(
        "unavailable",
        [...(options.initialWarnings ?? []), privateKeyResult.warning],
        [...setupResult.notes, ...notes],
        options.missingEnv
      )
    };
  }

  return {
    ok: true,
    authSource: "local-config",
    credentials: {
      issuerId: setupResult.config.issuerId,
      keyId: setupResult.config.keyId,
      privateKey: privateKeyResult.privateKey,
      appId: setupResult.config.appId
    },
    notes: [
      options.translator.t("appStoreConnect.note.authenticatedLocalConfig"),
      ...setupResult.notes
    ]
  };
}

async function resolveCredentials(options: {
  allowInteractiveSetup?: boolean;
  env: NodeJS.ProcessEnv;
  runtime?: AppStoreConnectInteractiveRuntime;
  translator: Translator;
}): Promise<ResolvedCredentialsResult> {
  const issuerId = trimToUndefined(options.env.ASC_ISSUER_ID);
  const keyId = trimToUndefined(options.env.ASC_KEY_ID);
  const inlinePrivateKey = trimToUndefined(options.env.ASC_PRIVATE_KEY);
  const privateKeyPath = trimToUndefined(options.env.ASC_PRIVATE_KEY_PATH);
  const appId = trimToUndefined(options.env.ASC_APP_ID);
  const anyCredentialProvided = Boolean(
    issuerId || keyId || inlinePrivateKey || privateKeyPath || appId
  );
  const missingEnv = buildMissingEnv(
    issuerId,
    keyId,
    inlinePrivateKey,
    privateKeyPath
  );

  if (anyCredentialProvided) {
    if (!issuerId || !keyId || (!inlinePrivateKey && !privateKeyPath)) {
      return {
        ok: false,
        report: createBaseReport(
          "unavailable",
          [options.translator.t("appStoreConnect.warning.credentialsIncomplete")],
          [],
          missingEnv
        )
      };
    }

    let privateKey = inlinePrivateKey?.replace(/\\n/g, "\n");

    if (!privateKey && privateKeyPath) {
      const privateKeyResult = readPrivateKeyFromPath(privateKeyPath, options.translator);

      if (!privateKeyResult.ok) {
        return {
          ok: false,
          report: createBaseReport("unavailable", [privateKeyResult.warning])
        };
      }

      privateKey = privateKeyResult.privateKey;
    }

    if (!privateKey) {
      return {
        ok: false,
        report: createBaseReport(
          "unavailable",
          [options.translator.t("appStoreConnect.warning.credentialsIncomplete")],
          [],
          missingEnv
        )
      };
    }

    return {
      ok: true,
      authSource: "env",
      credentials: {
        issuerId,
        keyId,
        privateKey,
        appId
      },
      notes: [options.translator.t("appStoreConnect.note.authenticated")]
    };
  }

  const localConfigResult = readAppStoreConnectLocalConfig({
    runtime: options.runtime,
    translator: options.translator
  });

  if (localConfigResult.status === "ok") {
    const privateKeyResult = readPrivateKeyFromPath(
      localConfigResult.config.privateKeyPath,
      options.translator
    );

    if (privateKeyResult.ok) {
      return {
        ok: true,
        authSource: "local-config",
        credentials: {
          issuerId: localConfigResult.config.issuerId,
          keyId: localConfigResult.config.keyId,
          privateKey: privateKeyResult.privateKey,
          appId: localConfigResult.config.appId
        },
        notes: [
          options.translator.t("appStoreConnect.note.authenticatedLocalConfig"),
          options.translator.t("appStoreConnect.note.localConfigLoaded", {
            path: localConfigResult.configPath
          })
        ]
      };
    }

    return resolveGuidedCredentials({
      allowInteractiveSetup: options.allowInteractiveSetup ?? false,
      initialWarnings: [privateKeyResult.warning],
      missingEnv,
      runtime: options.runtime,
      translator: options.translator
    });
  }

  if (localConfigResult.status === "invalid") {
    return resolveGuidedCredentials({
      allowInteractiveSetup: options.allowInteractiveSetup ?? false,
      initialWarnings: [localConfigResult.warning],
      missingEnv,
      runtime: options.runtime,
      translator: options.translator
    });
  }

  return resolveGuidedCredentials({
    allowInteractiveSetup: options.allowInteractiveSetup ?? false,
    missingEnv,
    runtime: options.runtime,
    translator: options.translator
  });
}

function createJwtToken(credentials: AppStoreConnectCredentials): string {
  const header = {
    alg: "ES256",
    kid: credentials.keyId,
    typ: "JWT"
  };
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.issuerId,
    aud: APP_STORE_CONNECT_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + APP_STORE_CONNECT_TOKEN_TTL_SECONDS
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("SHA256");

  signer.update(signingInput);
  signer.end();

  const signature = signer.sign({
    key: createPrivateKey(credentials.privateKey),
    dsaEncoding: "ieee-p1363"
  });

  return `${signingInput}.${toBase64Url(signature)}`;
}

class AppStoreConnectClient {
  private readonly token: string;

  constructor(
    credentials: AppStoreConnectCredentials,
    private readonly fetchImpl: FetchLike
  ) {
    this.token = createJwtToken(credentials);
  }

  async getResource<TResource extends JsonApiResource<any>>(
    path: string,
    query?: Record<string, string | undefined>
  ): Promise<TResource | undefined> {
    const document: JsonApiDocument<TResource> = await this.request<TResource>(path, query);

    if (!document.data || Array.isArray(document.data)) {
      return undefined;
    }

    return document.data;
  }

  async listResources<TResource extends JsonApiResource<any>>(
    path: string,
    query?: Record<string, string | undefined>
  ): Promise<TResource[]> {
    const resources: TResource[] = [];
    let nextPath: string | undefined = path;
    let nextQuery = query;

    while (nextPath) {
      const document: JsonApiDocument<TResource> = await this.request<TResource>(
        nextPath,
        nextQuery
      );

      if (Array.isArray(document.data)) {
        resources.push(...document.data);
      } else if (document.data) {
        resources.push(document.data);
      }

      nextPath = document.links?.next;
      nextQuery = undefined;
    }

    return resources;
  }

  async request<TResource extends JsonApiResource<any>>(
    pathOrUrl: string,
    query?: Record<string, string | undefined>
  ): Promise<JsonApiDocument<TResource>> {
    const url =
      pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
        ? pathOrUrl
        : `${APP_STORE_CONNECT_BASE_URL}${pathOrUrl}${stringifySearchParams(query)}`;

    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`
      }
    });
    const body = await response.text();
    let parsed: JsonApiDocument<TResource> | undefined;

    if (body) {
      try {
        parsed = JSON.parse(body) as JsonApiDocument<TResource>;
      } catch {
        parsed = undefined;
      }
    }

    if (!response.ok) {
      const firstError = parsed?.errors?.[0];
      const message =
        firstError?.detail ??
        firstError?.title ??
        `App Store Connect request failed with status ${response.status}.`;

      throw new AppStoreConnectRequestError(message, response.status);
    }

    if (!parsed) {
      throw new AppStoreConnectRequestError(
        "App Store Connect returned an unreadable response.",
        response.status
      );
    }

    return parsed;
  }
}

function buildContactName(firstName?: string, lastName?: string): string | undefined {
  return trimToUndefined([firstName, lastName].filter(Boolean).join(" "));
}

function chooseTargetVersion(versions: AppStoreConnectVersion[]): {
  version?: AppStoreConnectVersion;
  versionSource?: AppStoreConnectSnapshot["versionSource"];
} {
  const sortedVersions = [...versions].sort(compareVersionsDescending);
  const editableVersion = sortedVersions.find((version) =>
    EDITABLE_VERSION_STATES.has(version.state ?? "")
  );

  if (editableVersion) {
    return {
      version: editableVersion,
      versionSource: "editable"
    };
  }

  const latestLiveVersion = sortedVersions.find((version) => isLiveVersion(version.state));

  if (latestLiveVersion) {
    return {
      version: latestLiveVersion,
      versionSource: "latest-live"
    };
  }

  return {
    version: sortedVersions[0],
    versionSource: sortedVersions[0] ? "latest-any" : undefined
  };
}

async function resolveApp(
  client: AppStoreConnectClient,
  bundleId: string | undefined,
  appId: string | undefined,
  translator: Translator
): Promise<JsonApiResource<AppResourceAttributes>> {
  if (appId) {
    const app = await client.getResource<JsonApiResource<AppResourceAttributes>>(
      `/v1/apps/${appId}`,
      {
        "fields[apps]": "bundleId,name,primaryLocale"
      }
    );

    if (!app) {
      throw new AppStoreConnectRequestError(
        translator.t("appStoreConnect.warning.appNotFound")
      );
    }

    return app;
  }

  if (!bundleId) {
    throw new AppStoreConnectRequestError(
      translator.t("appStoreConnect.warning.bundleIdMissing")
    );
  }

  const apps = await client.listResources<JsonApiResource<AppResourceAttributes>>("/v1/apps", {
    "fields[apps]": "bundleId,name,primaryLocale",
    "filter[bundleId]": bundleId,
    limit: "2"
  });
  const app = apps[0];

  if (!app) {
    throw new AppStoreConnectRequestError(
      translator.t("appStoreConnect.warning.appNotFound")
    );
  }

  return app;
}

async function safeGetResource<TResource extends JsonApiResource<any>>(
  getter: () => Promise<TResource | undefined>,
  warnings: string[],
  translator: Translator,
  label: string,
  options: {
    allowNotFound?: boolean;
  } = {}
): Promise<TResource | undefined> {
  try {
    return await getter();
  } catch (error) {
    if (
      options.allowNotFound &&
      error instanceof AppStoreConnectRequestError &&
      error.status === 404
    ) {
      return undefined;
    }

    warnings.push(
      translator.t("appStoreConnect.warning.surfaceUnavailable", {
        message: error instanceof Error ? error.message : String(error),
        surface: label
      })
    );
    return undefined;
  }
}

async function safeListResources<TResource extends JsonApiResource<any>>(
  getter: () => Promise<TResource[]>,
  warnings: string[],
  translator: Translator,
  label: string,
  options: {
    allowNotFound?: boolean;
  } = {}
): Promise<TResource[]> {
  try {
    return await getter();
  } catch (error) {
    if (
      options.allowNotFound &&
      error instanceof AppStoreConnectRequestError &&
      error.status === 404
    ) {
      return [];
    }

    warnings.push(
      translator.t("appStoreConnect.warning.surfaceUnavailable", {
        message: error instanceof Error ? error.message : String(error),
        surface: label
      })
    );
    return [];
  }
}

async function collectSnapshot(options: {
  baseConfig: PreflightConfig;
  credentials: AppStoreConnectCredentials;
  fetchImpl: FetchLike;
  initialNotes?: string[];
  translator: Translator;
}): Promise<AppStoreConnectSnapshot> {
  const client = new AppStoreConnectClient(options.credentials, options.fetchImpl);
  const warnings: string[] = [];
  const notes: string[] = [...(options.initialNotes ?? [])];
  const app = await resolveApp(
    client,
    trimToUndefined(options.baseConfig.app.bundleId),
    options.credentials.appId,
    options.translator
  );
  const appAttributes = app.attributes ?? {};
  const appId = app.id;
  const bundleId = trimToUndefined(appAttributes.bundleId) ?? trimToUndefined(options.baseConfig.app.bundleId) ?? "";
  const appName = trimToUndefined(appAttributes.name);
  const primaryLocale = trimToUndefined(appAttributes.primaryLocale);
  notes.push(
    options.translator.t("appStoreConnect.note.appResolved", {
      appId,
      bundleId
    })
  );

  const versions = (
    await safeListResources<JsonApiResource<AppStoreVersionAttributes>>(
      () =>
        client.listResources(`/v1/apps/${appId}/appStoreVersions`, {
          "fields[appStoreVersions]": "appVersionState,createdDate,versionString",
          "filter[platform]": "IOS",
          limit: "200"
        }),
      warnings,
      options.translator,
      "appStoreVersions"
    )
  ).map((resource) => ({
    createdDate: trimToUndefined(resource.attributes?.createdDate),
    id: resource.id,
    state: trimToUndefined(resource.attributes?.appVersionState),
    versionString: trimToUndefined(resource.attributes?.versionString)
  }));
  const { version, versionSource } = chooseTargetVersion(versions);

  if (version) {
    notes.push(
      options.translator.t("appStoreConnect.note.versionResolved", {
        source:
          versionSource === "editable"
            ? "editable"
            : versionSource === "latest-live"
              ? "latest-live"
              : "latest-any",
        state: version.state ?? "-",
        version: version.versionString ?? version.id
      })
    );
  }

  const reviewDetailResource = version
    ? await safeGetResource<JsonApiResource<AppStoreReviewDetailAttributes>>(
        () => client.getResource(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`),
        warnings,
        options.translator,
        "appStoreReviewDetail",
        {
          allowNotFound: true
        }
      )
    : undefined;
  const reviewDetailAttributes = reviewDetailResource?.attributes;
  const reviewAttachmentResources =
    reviewDetailResource?.id
      ? await safeListResources<JsonApiResource>(
          () =>
            client.listResources(
              `/v1/appStoreReviewDetails/${reviewDetailResource.id}/appStoreReviewAttachments`,
              {
                limit: "200"
              }
            ),
          warnings,
          options.translator,
          "appStoreReviewAttachments",
          {
            allowNotFound: true
          }
        )
      : [];
  const versionLocalizations =
    version
      ? await safeListResources<JsonApiResource<AppStoreVersionLocalizationAttributes>>(
          () =>
            client.listResources(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`, {
              "fields[appStoreVersionLocalizations]": "description,keywords,locale",
              limit: "200"
            }),
          warnings,
          options.translator,
          "appStoreVersionLocalizations",
          {
            allowNotFound: true
          }
        )
      : [];
  const appInfos = await safeListResources<JsonApiResource>(
    () => client.listResources(`/v1/apps/${appId}/appInfos`, { limit: "50" }),
    warnings,
    options.translator,
    "appInfos",
    {
      allowNotFound: true
    }
  );
  const appInfoLocalizationsNested = await Promise.all(
    appInfos.map((appInfo) =>
      safeListResources<JsonApiResource<AppInfoLocalizationAttributes>>(
        () =>
          client.listResources(`/v1/appInfos/${appInfo.id}/appInfoLocalizations`, {
            "fields[appInfoLocalizations]": "locale,name,privacyPolicyUrl,subtitle",
            limit: "200"
          }),
        warnings,
        options.translator,
        "appInfoLocalizations",
        {
          allowNotFound: true
        }
      )
    )
  );
  const appInfoLocalizations = appInfoLocalizationsNested.flat();
  const screenshotSetsByLocalization = await Promise.all(
    versionLocalizations.map(async (localization) => {
      const locale = trimToUndefined(localization.attributes?.locale);

      if (!locale) {
        return [] as AppStoreConnectScreenshotSummary[];
      }

      const screenshotSets = await safeListResources<JsonApiResource<AppScreenshotSetAttributes>>(
        () =>
          client.listResources(
            `/v1/appStoreVersionLocalizations/${localization.id}/appScreenshotSets`,
            {
              "fields[appScreenshotSets]": "screenshotDisplayType",
              limit: "200"
            }
          ),
        warnings,
        options.translator,
        "appScreenshotSets",
        {
          allowNotFound: true
        }
      );

      const screenshotCounts = await Promise.all(
        screenshotSets.map(async (screenshotSet) => {
          const screenshots = await safeListResources<JsonApiResource>(
            () =>
              client.listResources(`/v1/appScreenshotSets/${screenshotSet.id}/appScreenshots`, {
                limit: "200"
              }),
            warnings,
            options.translator,
            "appScreenshots",
            {
              allowNotFound: true
            }
          );

          return {
            count: screenshots.length,
            deviceType:
              resolveRemoteDeviceType(screenshotSet.attributes?.screenshotDisplayType) ??
              (screenshotSet.attributes?.screenshotDisplayType?.toLowerCase() ?? "unknown"),
            locale
          };
        })
      );

      return screenshotCounts;
    })
  );
  const iapResources = await safeListResources<JsonApiResource<InAppPurchaseV2Attributes>>(
    () =>
      client.listResources(`/v1/apps/${appId}/inAppPurchasesV2`, {
        "fields[inAppPurchasesV2]": "name,productId,state",
        limit: "200"
      }),
    warnings,
    options.translator,
    "inAppPurchasesV2",
    {
      allowNotFound: true
    }
  );
  const rawIaps: Array<AppStoreConnectIapSummary | undefined> = await Promise.all(
    iapResources.map(async (iap) => {
      const productId = trimToUndefined(iap.attributes?.productId);

      if (!productId) {
        return undefined;
      }

      const priceSchedule = await safeGetResource<JsonApiResource>(
        () => client.getResource(`/v2/inAppPurchases/${iap.id}/iapPriceSchedule`),
        warnings,
        options.translator,
        "iapPriceSchedule",
        {
          allowNotFound: true
        }
      );

      return {
        hasPriceSchedule: Boolean(priceSchedule),
        name: trimToUndefined(iap.attributes?.name),
        productId,
        state: trimToUndefined(iap.attributes?.state)
      };
    })
  );
  const iaps = rawIaps.filter(
    (entry): entry is AppStoreConnectIapSummary => entry !== undefined
  );
  const appAvailability = await safeGetResource<JsonApiResource>(
    () => client.getResource(`/v1/apps/${appId}/appAvailabilityV2`),
    warnings,
    options.translator,
    "appAvailabilityV2",
    {
      allowNotFound: true
    }
  );
  const availableTerritories =
    appAvailability?.id
      ? (
          await safeListResources<JsonApiResource<TerritoryAttributes>>(
            () =>
              client.listResources(`/v1/appAvailabilities/${appAvailability.id}/availableTerritories`, {
                "fields[territories]": "code",
                limit: "200"
              }),
            warnings,
            options.translator,
            "availableTerritories",
            {
              allowNotFound: true
            }
          )
        )
          .map((territory) => trimToUndefined(territory.attributes?.code))
          .filter((entry): entry is string => Boolean(entry))
          .sort()
      : [];
  const appPriceSchedule = await safeGetResource<JsonApiResource>(
    () => client.getResource(`/v1/apps/${appId}/appPriceSchedule`),
    warnings,
    options.translator,
    "appPriceSchedule",
    {
      allowNotFound: true
    }
  );
  const localizationMap = new Map<string, AppStoreConnectLocalization>();

  const ensureLocalization = (locale: string): AppStoreConnectLocalization => {
    const existing = localizationMap.get(locale);

    if (existing) {
      return existing;
    }

    const next: AppStoreConnectLocalization = {
      locale
    };
    localizationMap.set(locale, next);
    return next;
  };

  appInfoLocalizations.forEach((localization) => {
    const locale = trimToUndefined(localization.attributes?.locale);

    if (!locale) {
      return;
    }

    const target = ensureLocalization(locale);
    target.name = trimToUndefined(localization.attributes?.name) ?? target.name;
    target.subtitle = trimToUndefined(localization.attributes?.subtitle) ?? target.subtitle;
    target.privacyPolicyUrl =
      trimToUndefined(localization.attributes?.privacyPolicyUrl) ?? target.privacyPolicyUrl;
  });

  versionLocalizations.forEach((localization) => {
    const locale = trimToUndefined(localization.attributes?.locale);

    if (!locale) {
      return;
    }

    const target = ensureLocalization(locale);
    target.description =
      trimToUndefined(localization.attributes?.description) ?? target.description;
    target.keywords = trimToUndefined(localization.attributes?.keywords) ?? target.keywords;
  });

  if (primaryLocale) {
    const target = ensureLocalization(primaryLocale);
    target.name = target.name ?? appName;
  }

  return {
    appId,
    appName,
    availableTerritories,
    bundleId,
    hasAppPriceSchedule: Boolean(appPriceSchedule),
    iaps,
    localizations: [...localizationMap.values()].sort((left, right) =>
      left.locale.localeCompare(right.locale)
    ),
    missingEnv: [],
    notes,
    primaryLocale,
    reviewAttachmentCount:
      reviewAttachmentResources.length > 0 ? reviewAttachmentResources.length : undefined,
    reviewDetails: reviewDetailAttributes
      ? {
          contactEmail: trimToUndefined(reviewDetailAttributes.contactEmail),
          contactName: buildContactName(
            reviewDetailAttributes.contactFirstName,
            reviewDetailAttributes.contactLastName
          ),
          contactPhone: trimToUndefined(reviewDetailAttributes.contactPhone),
          demoAccountName: trimToUndefined(reviewDetailAttributes.demoAccountName),
          demoAccountPassword: trimToUndefined(reviewDetailAttributes.demoAccountPassword),
          demoAccountRequired: reviewDetailAttributes.demoAccountRequired,
          notes: trimToUndefined(reviewDetailAttributes.notes)
        }
      : undefined,
    screenshotSummaries: screenshotSetsByLocalization.flat(),
    warnings,
    version,
    versionSource
  };
}

function buildLocalizationsByLocale(
  config: PreflightConfig,
  primaryLocale?: string
): Map<string, AppStoreConnectLocalization> {
  const localizations = new Map<string, AppStoreConnectLocalization>();

  const ensureLocalization = (locale: string): AppStoreConnectLocalization => {
    const existing = localizations.get(locale);

    if (existing) {
      return existing;
    }

    const next: AppStoreConnectLocalization = {
      locale
    };
    localizations.set(locale, next);
    return next;
  };

  config.metadata.localizations.forEach((localization) => {
    const locale = trimToUndefined(localization.locale);

    if (!locale) {
      return;
    }

    const target = ensureLocalization(locale);
    target.name = trimToUndefined(localization.title);
    target.subtitle = trimToUndefined(localization.subtitle);
    target.description = trimToUndefined(localization.description);
    target.keywords = trimToUndefined(localization.keywords);
  });

  const fallbackLocale = primaryLocale ?? config.metadata.localizations[0]?.locale;

  if (fallbackLocale) {
    const target = ensureLocalization(fallbackLocale);
    target.name = target.name ?? trimToUndefined(config.app.name);
    target.subtitle = target.subtitle ?? trimToUndefined(config.metadata.subtitle);
    target.description = target.description ?? trimToUndefined(config.metadata.description);
    target.keywords = target.keywords ?? trimToUndefined(config.metadata.keywords);
    target.privacyPolicyUrl =
      target.privacyPolicyUrl ?? trimToUndefined(config.privacy.policyUrl);
  }

  return localizations;
}

function buildLocalScreenshotCounts(
  screenshotAssets: ScreenshotAssetStatus[]
): Map<string, number> {
  const counts = new Map<string, number>();

  screenshotAssets
    .filter((asset) => asset.exists)
    .forEach((asset) => {
      const locales = asset.locales.length > 0 ? asset.locales : ["default"];

      locales.forEach((locale) => {
        const key = `${locale}::${asset.deviceType}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });

  return counts;
}

function buildRemoteScreenshotCounts(
  screenshots: AppStoreConnectScreenshotSummary[]
): Map<string, number> {
  const counts = new Map<string, number>();

  screenshots.forEach((entry) => {
    const key = `${entry.locale}::${entry.deviceType}`;
    counts.set(key, entry.count);
  });

  return counts;
}

function resolveComparisonStatus(
  localValue: string | undefined,
  remoteValue: string | undefined
): AppStoreConnectComparisonStatus | undefined {
  const normalizedLocal = normalizeForCompare(localValue);
  const normalizedRemote = normalizeForCompare(remoteValue);

  if (!normalizedLocal && !normalizedRemote) {
    return undefined;
  }

  if (!normalizedLocal && normalizedRemote) {
    return "remote-only";
  }

  if (normalizedLocal && !normalizedRemote) {
    return "local-only";
  }

  return normalizedLocal === normalizedRemote ? "match" : "mismatch";
}

function pushValueCheck(
  checks: AppStoreConnectValueCheck[],
  key: string,
  label: string,
  localValue: string | undefined,
  remoteValue: string | undefined
): void {
  const status = resolveComparisonStatus(localValue, remoteValue);

  if (!status) {
    return;
  }

  checks.push({
    key,
    label,
    status,
    local_value: localValue,
    remote_value: remoteValue
  });
}

function buildReviewDetailsValue(value?: AppStoreConnectReviewDetails): string | undefined {
  if (!value) {
    return undefined;
  }

  const parts = [
    value.contactName,
    value.contactEmail ? `<${value.contactEmail}>` : undefined,
    value.contactPhone ? `(${value.contactPhone})` : undefined
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : undefined;
}

function buildDemoAccountValue(options: {
  username?: string;
  password?: string;
}): string | undefined {
  const username = trimToUndefined(options.username);
  const password = trimToUndefined(options.password);

  if (!username && !password) {
    return undefined;
  }

  return [username, password].filter(Boolean).join(" / ");
}

function buildValueChecks(
  config: PreflightConfig,
  snapshot: AppStoreConnectSnapshot
): AppStoreConnectValueCheck[] {
  const checks: AppStoreConnectValueCheck[] = [];
  const localizations = buildLocalizationsByLocale(config, snapshot.primaryLocale);
  const remoteLocalizations = new Map(
    snapshot.localizations.map((localization) => [localization.locale, localization] as const)
  );
  const locales = [...new Set([...localizations.keys(), ...remoteLocalizations.keys()])].sort();

  pushValueCheck(
    checks,
    "review.notes",
    "Review notes",
    trimToUndefined(config.review.notes),
    snapshot.reviewDetails?.notes
  );
  pushValueCheck(
    checks,
    "review.demoAccountRequired",
    "Demo account required",
    formatBoolean(config.review.demoAccountRequired),
    formatBoolean(snapshot.reviewDetails?.demoAccountRequired)
  );
  pushValueCheck(
    checks,
    "review.demoAccount",
    "Demo account",
    buildDemoAccountValue({
      username: config.review.demoAccount?.username,
      password: config.review.demoAccount?.password
    }),
    buildDemoAccountValue({
      username: snapshot.reviewDetails?.demoAccountName,
      password: snapshot.reviewDetails?.demoAccountPassword
    })
  );
  pushValueCheck(
    checks,
    "review.contact",
    "Reviewer contact",
    buildReviewDetailsValue({
      contactEmail: config.review.contact?.email,
      contactName: config.review.contact?.name,
      contactPhone: config.review.contact?.phone
    }),
    buildReviewDetailsValue(snapshot.reviewDetails)
  );
  pushValueCheck(
    checks,
    "privacy.policyUrl",
    "Privacy policy URL",
    trimToUndefined(config.privacy.policyUrl),
    snapshot.localizations.find((localization) => localization.privacyPolicyUrl)?.privacyPolicyUrl
  );

  locales.forEach((locale) => {
    const local = localizations.get(locale);
    const remote = remoteLocalizations.get(locale);

    pushValueCheck(
      checks,
      `metadata.localizations.${locale}.title`,
      `Title (${locale})`,
      local?.name,
      remote?.name
    );
    pushValueCheck(
      checks,
      `metadata.localizations.${locale}.subtitle`,
      `Subtitle (${locale})`,
      local?.subtitle,
      remote?.subtitle
    );
    pushValueCheck(
      checks,
      `metadata.localizations.${locale}.description`,
      `Description (${locale})`,
      local?.description,
      remote?.description
    );
    pushValueCheck(
      checks,
      `metadata.localizations.${locale}.keywords`,
      `Keywords (${locale})`,
      local?.keywords,
      remote?.keywords
    );
  });

  return checks;
}

function buildScreenshotChecks(
  screenshotAssets: ScreenshotAssetStatus[],
  snapshot: AppStoreConnectSnapshot
): AppStoreConnectScreenshotCheck[] {
  const localCounts = buildLocalScreenshotCounts(screenshotAssets);
  const remoteCounts = buildRemoteScreenshotCounts(snapshot.screenshotSummaries);
  const keys = [...new Set([...localCounts.keys(), ...remoteCounts.keys()])].sort();

  return keys
    .map((key) => {
      const [locale, deviceType] = key.split("::");
      const localCount = localCounts.get(key) ?? 0;
      const remoteCount = remoteCounts.get(key) ?? 0;
      const status: AppStoreConnectComparisonStatus =
        localCount > 0 && remoteCount > 0
          ? localCount === remoteCount
            ? "match"
            : "mismatch"
          : localCount > 0
            ? "local-only"
            : "remote-only";

      return {
        locale,
        device_type: deviceType,
        status,
        local_count: localCount,
        remote_count: remoteCount
      };
    })
    .filter((entry) => entry.local_count > 0 || entry.remote_count > 0);
}

function buildIapChecks(
  config: PreflightConfig,
  snapshot: AppStoreConnectSnapshot
): AppStoreConnectIapCheck[] {
  const localProducts = new Map(
    config.business.iapProducts
      .filter((product) => trimToUndefined(product.productId))
      .map((product) => [
        product.productId,
        {
          displayName: trimToUndefined(product.displayName)
        }
      ])
  );
  const remoteProducts = new Map(
    snapshot.iaps.map((product) => [
      product.productId,
      {
        displayName: product.name,
        hasPriceSchedule: product.hasPriceSchedule,
        state: product.state
      }
    ])
  );
  const productIds = [...new Set([...localProducts.keys(), ...remoteProducts.keys()])].sort();

  return productIds.map((productId) => {
    const local = localProducts.get(productId);
    const remote = remoteProducts.get(productId);
    let status: AppStoreConnectComparisonStatus = "match";

    if (local && remote) {
      status =
        normalizeForCompare(local.displayName) === normalizeForCompare(remote.displayName)
          ? "match"
          : "mismatch";
    } else if (local) {
      status = "local-only";
    } else {
      status = "remote-only";
    }

    return {
      product_id: productId,
      status,
      local_display_name: local?.displayName,
      remote_display_name: remote?.displayName,
      remote_state: remote?.state,
      has_price_schedule: remote?.hasPriceSchedule
    };
  });
}

function populateSummary(report: AppStoreConnectReport): AppStoreConnectSummary {
  report.value_checks.forEach((check) => {
    if (check.status === "match") {
      report.summary.value_matches += 1;
    } else if (check.status === "mismatch") {
      report.summary.value_mismatches += 1;
    } else if (check.status === "remote-only") {
      report.summary.value_remote_only += 1;
    } else {
      report.summary.value_local_only += 1;
    }
  });

  report.screenshot_checks.forEach((check) => {
    if (check.status === "match") {
      report.summary.screenshot_matches += 1;
    } else if (check.status === "mismatch") {
      report.summary.screenshot_mismatches += 1;
    } else if (check.status === "remote-only") {
      report.summary.screenshot_remote_only += 1;
    } else {
      report.summary.screenshot_local_only += 1;
    }
  });

  report.iap_checks.forEach((check) => {
    if (check.status === "match") {
      report.summary.iap_matches += 1;
    } else if (check.status === "mismatch") {
      report.summary.iap_mismatches += 1;
    } else if (check.status === "remote-only") {
      report.summary.iap_remote_only += 1;
    } else {
      report.summary.iap_local_only += 1;
    }
  });

  return report.summary;
}

function buildRemoteOverride(snapshot: AppStoreConnectSnapshot): PreflightConfigOverride {
  const primaryLocalization =
    snapshot.localizations.find((localization) => localization.locale === snapshot.primaryLocale) ??
    snapshot.localizations[0];
  const mergedLocalizations = snapshot.localizations
    .filter((localization) => localization.name && localization.description)
    .map((localization) => ({
      locale: localization.locale,
      title: localization.name ?? "",
      subtitle: localization.subtitle,
      description: localization.description ?? "",
      keywords: localization.keywords
    }));

  const config: PreflightConfigOverride = {
    app: {
      bundleId: snapshot.bundleId,
      name: primaryLocalization?.name ?? snapshot.appName
    },
    review: {
      demoAccountRequired: snapshot.reviewDetails?.demoAccountRequired,
      demoAccount:
        snapshot.reviewDetails?.demoAccountName || snapshot.reviewDetails?.demoAccountPassword
          ? {
              username: snapshot.reviewDetails?.demoAccountName,
              password: snapshot.reviewDetails?.demoAccountPassword
            }
          : undefined,
      contact:
        snapshot.reviewDetails?.contactName || snapshot.reviewDetails?.contactEmail
          ? {
              name: snapshot.reviewDetails?.contactName,
              email: snapshot.reviewDetails?.contactEmail,
              phone: snapshot.reviewDetails?.contactPhone
            }
          : undefined,
      notes: snapshot.reviewDetails?.notes
    },
    metadata: {
      description: primaryLocalization?.description,
      keywords: primaryLocalization?.keywords,
      localizations: mergedLocalizations.length > 0 ? mergedLocalizations : undefined,
      subtitle: primaryLocalization?.subtitle
    },
    privacy: {
      policyUrl: primaryLocalization?.privacyPolicyUrl
    },
    business: {
      hasIap: snapshot.iaps.length > 0,
      iapProducts:
        snapshot.iaps.length > 0
          ? snapshot.iaps.map((iap) => ({
              productId: iap.productId,
              displayName: iap.name
            }))
          : undefined
    }
  };

  return config;
}

function buildConnectedReport(
  authSource: AppStoreConnectAuthSource,
  config: PreflightConfig,
  screenshotAssets: ScreenshotAssetStatus[],
  snapshot: AppStoreConnectSnapshot
): AppStoreConnectReport {
  const report: AppStoreConnectReport = {
    ...createBaseReport("connected", snapshot.warnings, snapshot.notes, snapshot.missingEnv),
    auth_source: authSource,
    app_id: snapshot.appId,
    app_name: snapshot.appName,
    bundle_id: snapshot.bundleId,
    version_id: snapshot.version?.id,
    version_string: snapshot.version?.versionString,
    version_state: snapshot.version?.state,
    version_source: snapshot.versionSource,
    value_checks: buildValueChecks(config, snapshot),
    screenshot_checks: buildScreenshotChecks(screenshotAssets, snapshot),
    iap_checks: buildIapChecks(config, snapshot),
    available_territories: snapshot.availableTerritories,
    has_app_price_schedule: snapshot.hasAppPriceSchedule,
    review_attachment_count: snapshot.reviewAttachmentCount,
    warnings: snapshot.warnings,
    notes: snapshot.notes,
    summary: buildEmptySummary()
  };

  populateSummary(report);

  return report;
}

export async function fetchAppStoreConnectData(options: {
  allowInteractiveSetup?: boolean;
  baseConfig: PreflightConfig;
  fetchImpl?: FetchLike;
  screenshotAssets: ScreenshotAssetStatus[];
  skip?: boolean;
  translator: Translator;
  env?: NodeJS.ProcessEnv;
  runtime?: AppStoreConnectInteractiveRuntime;
}): Promise<AppStoreConnectSyncResult> {
  if (options.skip) {
    return {
      config: {},
      fieldSources: {},
      report: createBaseReport("skipped", [], [
        options.translator.t("appStoreConnect.note.disabled")
      ])
    };
  }

  const credentialsResult = await resolveCredentials({
    allowInteractiveSetup: options.allowInteractiveSetup,
    env: options.env ?? process.env,
    runtime: options.runtime,
    translator: options.translator
  });

  if (!credentialsResult.ok) {
    return {
      config: {},
      fieldSources: {},
      report: credentialsResult.report
    };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    return {
      config: {},
      fieldSources: {},
      report: createBaseReport("unavailable", [
        options.translator.t("appStoreConnect.warning.fetchUnavailable")
      ])
    };
  }

  try {
    const snapshot = await collectSnapshot({
      baseConfig: options.baseConfig,
      credentials: credentialsResult.credentials,
      fetchImpl,
      initialNotes: credentialsResult.notes,
      translator: options.translator
    });
    const config = buildRemoteOverride(snapshot);

    return {
      config,
      fieldSources: collectFieldSources(config, REMOTE_FIELD_SOURCE),
      report: buildConnectedReport(
        credentialsResult.authSource,
        options.baseConfig,
        options.screenshotAssets,
        snapshot
      )
    };
  } catch (error) {
    return {
      config: {},
      fieldSources: {},
      report: createBaseReport("unavailable", [
        options.translator.t("appStoreConnect.warning.requestFailed", {
          message: error instanceof Error ? error.message : String(error)
        })
      ])
    };
  }
}
