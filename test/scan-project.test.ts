import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PREFLIGHT_VERSION,
  RULE_REGISTRY,
  SUPPORTED_LOCALES,
  buildReviewReadinessReport,
  createTranslator,
  formatHumanReviewReadiness,
  formatHumanScanReport,
  formatRulesTable,
  renderReviewReadinessResult,
  runInit,
  runRules,
  runScan,
  scanProject
} from "../src";
import {
  buildValidConfig,
  createTempProject,
  writeConfig,
  writeDiscoveredScreenshots,
  writeFlutterIosProject,
  writeNativeIosProject,
  writeReactNativeIosProject,
  writeScreenshots
} from "./helpers";

const createdDirs: string[] = [];
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

function stripAnsi(value: string): string {
  return value.replace(ansiPattern, "");
}

afterEach(() => {
  for (const directory of createdDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }

  delete process.env.ASC_ISSUER_ID;
  delete process.env.ASC_KEY_ID;
  delete process.env.ASC_PRIVATE_KEY;
  delete process.env.ASC_PRIVATE_KEY_PATH;
  delete process.env.ASC_APP_ID;

  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function createAscEnv(): NodeJS.ProcessEnv {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256"
  });

  return {
    ...process.env,
    ASC_ISSUER_ID: "issuer-123",
    ASC_KEY_ID: "key-123",
    ASC_PRIVATE_KEY: privateKey
      .export({
        type: "pkcs8",
        format: "pem"
      })
      .toString()
  };
}

function writeAscPrivateKeyFile(projectDir: string, fileName = "AuthKey_TEST.p8"): string {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256"
  });
  const privateKeyPath = path.join(projectDir, fileName);

  fs.writeFileSync(
    privateKeyPath,
    privateKey
      .export({
        type: "pkcs8",
        format: "pem"
      })
      .toString()
  );

  return privateKeyPath;
}

function writeAscLocalConfig(options: {
  appId?: string;
  configPath: string;
  issuerId?: string;
  keyId?: string;
  privateKeyPath: string;
}): void {
  fs.mkdirSync(path.dirname(options.configPath), {
    recursive: true
  });
  fs.writeFileSync(
    options.configPath,
    `${JSON.stringify(
      {
        issuerId: options.issuerId ?? "issuer-local",
        keyId: options.keyId ?? "key-local",
        privateKeyPath: options.privateKeyPath,
        ...(options.appId ? { appId: options.appId } : {})
      },
      null,
      2
    )}\n`
  );
}

function createAscFetchMock(): typeof fetch {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const { pathname } = new URL(rawUrl);

    const ok = (data: unknown) =>
      new Response(JSON.stringify({ data }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });

    if (pathname === "/v1/apps") {
      return ok([
        {
          id: "123456789",
          type: "apps",
          attributes: {
            bundleId: "com.example.preflight",
            name: "Remote Preflight App",
            primaryLocale: "en-US"
          }
        }
      ]);
    }

    if (pathname === "/v1/apps/123456789/appStoreVersions") {
      return ok([
        {
          id: "987654321",
          type: "appStoreVersions",
          attributes: {
            appVersionState: "PREPARE_FOR_SUBMISSION",
            createdDate: "2026-03-23T12:00:00Z",
            versionString: "1.2.3"
          }
        }
      ]);
    }

    if (pathname === "/v1/appStoreVersions/987654321/appStoreReviewDetail") {
      return ok({
        id: "review-1",
        type: "appStoreReviewDetails",
        attributes: {
          contactFirstName: "Release",
          contactLastName: "Team",
          contactEmail: "mobile@example.com",
          contactPhone: "+1 555 0100",
          demoAccountRequired: true,
          demoAccountName: "remote-reviewer@example.com",
          demoAccountPassword: "remote-pass",
          notes: "Remote review notes"
        }
      });
    }

    if (pathname === "/v1/appStoreReviewDetails/review-1/appStoreReviewAttachments") {
      return ok([
        {
          id: "attachment-1",
          type: "appStoreReviewAttachments"
        }
      ]);
    }

    if (pathname === "/v1/appStoreVersions/987654321/appStoreVersionLocalizations") {
      return ok([
        {
          id: "version-loc-1",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "en-US",
            description: "Remote description",
            keywords: "ios,remote,release"
          }
        }
      ]);
    }

    if (pathname === "/v1/apps/123456789/appInfos") {
      return ok([
        {
          id: "appinfo-1",
          type: "appInfos"
        }
      ]);
    }

    if (pathname === "/v1/appInfos/appinfo-1/appInfoLocalizations") {
      return ok([
        {
          id: "appinfo-loc-1",
          type: "appInfoLocalizations",
          attributes: {
            locale: "en-US",
            name: "Remote App Name",
            subtitle: "Remote subtitle",
            privacyPolicyUrl: "https://example.com/privacy-remote"
          }
        }
      ]);
    }

    if (pathname === "/v1/appStoreVersionLocalizations/version-loc-1/appScreenshotSets") {
      return ok([
        {
          id: "screenshot-set-1",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_67"
          }
        }
      ]);
    }

    if (pathname === "/v1/appScreenshotSets/screenshot-set-1/appScreenshots") {
      return ok([
        {
          id: "remote-shot-1",
          type: "appScreenshots"
        },
        {
          id: "remote-shot-2",
          type: "appScreenshots"
        }
      ]);
    }

    if (pathname === "/v1/apps/123456789/inAppPurchasesV2") {
      return ok([
        {
          id: "iap-1",
          type: "inAppPurchasesV2",
          attributes: {
            productId: "premium.monthly",
            name: "Monthly Premium",
            state: "READY_TO_SUBMIT"
          }
        }
      ]);
    }

    if (pathname === "/v2/inAppPurchases/iap-1/iapPriceSchedule") {
      return ok({
        id: "iap-schedule-1",
        type: "iapPriceSchedules"
      });
    }

    if (pathname === "/v1/apps/123456789/appAvailabilityV2") {
      return ok({
        id: "availability-1",
        type: "appAvailabilities"
      });
    }

    if (pathname === "/v1/appAvailabilities/availability-1/availableTerritories") {
      return ok([
        {
          id: "usa",
          type: "territories",
          attributes: {
            code: "USA"
          }
        },
        {
          id: "tur",
          type: "territories",
          attributes: {
            code: "TUR"
          }
        }
      ]);
    }

    if (pathname === "/v1/apps/123456789/appPriceSchedule") {
      return ok({
        id: "app-price-schedule-1",
        type: "appPriceSchedules"
      });
    }

    throw new Error(`Unhandled ASC URL in test: ${pathname}`);
  });

  return fetchMock as unknown as typeof fetch;
}

function createUpdateCheckFetchMock(latestVersion: string): typeof fetch {
  return vi.fn(async () => {
    return new Response(JSON.stringify({ version: latestVersion }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  }) as unknown as typeof fetch;
}

describe("scanProject", () => {
  it("returns LOW risk for a complete config", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const result = await scanProject({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir
    });

    expect(result.risk_level).toBe("LOW");
    expect(result.exit_code).toBe(0);
    expect(result.blocking_issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.passed_checks).toHaveLength(30);
    expect(result.discovery.project_type).toBe("unknown");
    expect(
      result.discovery.warnings.some((warning) =>
        warning.includes("Continuing with config-only inputs")
      )
    ).toBe(true);
    expect(result.app_store_connect.status).toBe("skipped");
    expect(result.next_steps).toHaveLength(1);
    expect(result.next_steps[0]).toMatchObject({
      id: "app-store-connect-followup:setup",
      kind: "app-store-connect-followup",
      priority: "soon",
      title: "Set up App Store Connect access"
    });
  });

  it("discovers a native iOS project without config", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeNativeIosProject(projectDir, {
      includePrivacyManifest: true,
      includeRequiredReasonApis: true
    });
    writeDiscoveredScreenshots(projectDir);

    const result = await scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("native-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "DISCOVERY_001")).toBe(false);
    expect(result.discovery.sources.some((source) => source.endsWith("Info.plist"))).toBe(true);
    expect(result.evidence.some((entry) => entry.key === "app.name")).toBe(true);
    expect(result.missing_inputs.map((input) => input.key)).toEqual(
      expect.arrayContaining(["review.notes", "review.contact"])
    );
    expect(result.exit_code).toBe(1);
  });

  it("detects Flutter iOS projects from the ios subproject", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeFlutterIosProject(projectDir);
    writeDiscoveredScreenshots(projectDir);

    const result = await scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("flutter-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "DISCOVERY_001")).toBe(false);
  });

  it("detects React Native iOS projects from the ios subproject", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeReactNativeIosProject(projectDir);
    writeDiscoveredScreenshots(projectDir);

    const result = await scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("react-native-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "DISCOVERY_001")).toBe(false);
  });

  it("keeps screenshot resolution relative to the overridden config path", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    config.metadata.screenshots = config.metadata.screenshots.map((entry) => ({
      ...entry,
      path: `../${entry.path}`
    }));
    writeConfig(projectDir, config, "configs/release.json");
    writeScreenshots(
      projectDir,
      buildValidConfig().metadata.screenshots.map((entry) => entry.path)
    );

    const result = await scanProject({
      cwd: projectDir,
      configPath: "configs/release.json"
    });

    expect(result.risk_level).toBe("LOW");
    expect(result.config_path).toBe(path.join(projectDir, "configs", "release.json"));
  });

  it("reports blocking issues when required screenshot files are missing", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeConfig(projectDir, buildValidConfig());

    const result = await scanProject({ cwd: projectDir });

    expect(result.risk_level).toBe("HIGH");
    expect(result.blocking_issues.some((issue) => issue.id === "META_001")).toBe(false);
    expect(result.blocking_issues.some((issue) => issue.id === "CONFIG_001")).toBe(false);
    expect(result.warnings.length + result.blocking_issues.length).toBeGreaterThan(0);
  });

  it("lets config overrides win over discovered values", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeNativeIosProject(projectDir);
    writeDiscoveredScreenshots(projectDir, "en-US", [
      "iphone-6.7-1.png",
      "iphone-6.7-2.png",
      "iphone-6.7-3.png"
    ]);
    writeConfig(projectDir, {
      metadata: {
        requiredScreenshotDeviceTypes: ["iphone-6.5"]
      }
    });

    const result = await scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("native-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "META_001")).toBe(true);
  });

  it("fails clearly when no supported iOS project and no usable config are present", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);

    const result = await scanProject({ cwd: projectDir });

    expect(result.risk_level).toBe("HIGH");
    expect(result.blocking_issues.map((issue) => issue.id)).toContain("DISCOVERY_001");
  });

  it("produces Turkish output", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        isInteractive: false
      },
      cwd: projectDir,
      lang: "tr"
    });

    expect(output).toContain("App Store gonderim risk motoru");
    expect(output).toContain("Gonderim Yuzeyi");
  });

  it("returns the v0.4 JSON shape", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir,
      json: true
    });
    const parsed = JSON.parse(output);

    expect(parsed.risk_level).toBe("LOW");
    expect(parsed.passed_checks).toHaveLength(30);
    expect(parsed.review_readiness.status).toBe("complete");
    expect(parsed.app_store_connect.status).toBe("unavailable");
    expect(parsed.app_store_connect.warnings).toContain(
      "Interactive App Store Connect setup is only available in a local terminal. Run `preflight scan` locally once or set ASC_* environment variables."
    );
    expect(parsed.next_steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "app-store-connect-followup:setup",
          kind: "app-store-connect-followup",
          priority: "soon",
          title: "Set up App Store Connect access"
        })
      ])
    );
    expect(parsed.discovery).toBeDefined();
    expect(parsed.discovery.sources).toEqual([]);
    expect(parsed.missing_inputs).toEqual([]);
    expect(parsed.evidence).toEqual([]);
  });

  it("prefers missing-input next steps over duplicate reviewer issue steps", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();

    config.review.notes = "";
    config.review.loginInstructions = "";
    config.review.contact = undefined;
    config.appCapabilities.loginRequired = true;

    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      buildValidConfig().metadata.screenshots.map((entry) => entry.path)
    );

    const result = await scanProject({ cwd: projectDir });

    expect(result.next_steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "missing-input:review.notes",
          priority: "now",
          kind: "missing-input"
        }),
        expect.objectContaining({
          id: "missing-input:review.loginInstructions",
          priority: "now",
          kind: "missing-input"
        }),
        expect.objectContaining({
          id: "missing-input:review.contact",
          priority: "now",
          kind: "missing-input"
        })
      ])
    );
    expect(result.next_steps.some((step) => step.id === "issue-fix:REVIEWER_003")).toBe(false);
    expect(result.next_steps.some((step) => step.id === "issue-fix:REVIEWER_004")).toBe(false);
    expect(
      result.next_steps.find((step) => step.id === "missing-input:review.notes")?.suggested_value
    ).toContain("Test Account");
  });

  it("uses saved local App Store Connect config when environment credentials are absent", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    const privateKeyPath = writeAscPrivateKeyFile(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");

    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    writeAscLocalConfig({
      configPath: ascConfigPath,
      privateKeyPath
    });

    const result = await scanProject({
      appStoreConnectRuntime: {
        configPath: ascConfigPath
      },
      cwd: projectDir,
      fetchImpl: createAscFetchMock()
    });

    expect(result.app_store_connect.status).toBe("connected");
    expect(result.app_store_connect.auth_source).toBe("local-config");
    expect(result.app_store_connect.notes).toContain(
      `Loaded saved App Store Connect config from ${ascConfigPath}.`
    );
  });

  it("prefers environment credentials over saved local App Store Connect config", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    const privateKeyPath = writeAscPrivateKeyFile(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");

    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    writeAscLocalConfig({
      configPath: ascConfigPath,
      issuerId: "issuer-local",
      keyId: "key-local",
      privateKeyPath
    });

    const result = await scanProject({
      appStoreConnectRuntime: {
        configPath: ascConfigPath
      },
      cwd: projectDir,
      env: createAscEnv(),
      fetchImpl: createAscFetchMock()
    });

    expect(result.app_store_connect.status).toBe("connected");
    expect(result.app_store_connect.auth_source).toBe("env");
    expect(result.app_store_connect.notes).not.toContain(
      `Loaded saved App Store Connect config from ${ascConfigPath}.`
    );
  });

  it("runs guided App Store Connect setup during runScan and continues the same scan", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    const privateKeyPath = writeAscPrivateKeyFile(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const prompt = vi
      .fn<(question: string) => Promise<string>>()
      .mockResolvedValueOnce("issuer-guided")
      .mockResolvedValueOnce("key-guided")
      .mockResolvedValueOnce(privateKeyPath)
      .mockResolvedValueOnce("");
    const openUrl = vi.fn(async () => true);

    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { result } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: true,
        openUrl,
        prompt
      },
      cwd: projectDir,
      fetchImpl: createAscFetchMock()
    });

    expect(result.app_store_connect.status).toBe("connected");
    expect(result.app_store_connect.auth_source).toBe("local-config");
    expect(result.app_store_connect.notes).toContain(
      `Saved App Store Connect config to ${ascConfigPath}.`
    );
    expect(openUrl).toHaveBeenCalledOnce();
    expect(prompt).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fs.readFileSync(ascConfigPath, "utf8"))).toMatchObject({
      issuerId: "issuer-guided",
      keyId: "key-guided",
      privateKeyPath
    });
  });

  it("does not start guided setup in non-interactive runScan environments", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const prompt = vi.fn(async () => "unexpected");

    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { result } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false,
        prompt
      },
      cwd: projectDir
    });

    expect(result.app_store_connect.status).toBe("unavailable");
    expect(result.app_store_connect.warnings).toContain(
      "Interactive App Store Connect setup is only available in a local terminal. Run `preflight scan` locally once or set ASC_* environment variables."
    );
    expect(prompt).not.toHaveBeenCalled();
    expect(fs.existsSync(ascConfigPath)).toBe(false);
  });

  it("skips App Store Connect setup entirely when the skip flag is enabled", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const prompt = vi.fn(async () => "unexpected");

    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { result } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: true,
        prompt
      },
      cwd: projectDir,
      skipAppStoreConnect: true
    });

    expect(result.app_store_connect.status).toBe("skipped");
    expect(result.app_store_connect.notes).toContain(
      "App Store Connect checks were skipped by CLI flag."
    );
    expect(result.next_steps.some((step) => step.id === "app-store-connect-followup:setup")).toBe(
      false
    );
    expect(prompt).not.toHaveBeenCalled();
    expect(fs.existsSync(ascConfigPath)).toBe(false);
  });

  it("merges App Store Connect review data into review readiness", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    config.review.demoAccountRequired = true;
    config.review.demoAccount = undefined;
    config.review.contact = undefined;
    config.review.notes = "";
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      buildValidConfig().metadata.screenshots.map((entry) => entry.path)
    );
    const result = await scanProject({
      cwd: projectDir,
      env: createAscEnv(),
      fetchImpl: createAscFetchMock()
    });

    expect(result.app_store_connect.status).toBe("connected");
    expect(result.review_readiness.status).toBe("complete");
    expect(
      result.review_readiness.items.find((item) => item.key === "reviewNotes")?.source
    ).toBe("app-store-connect");
    expect(
      result.review_readiness.items.find((item) => item.key === "demoAccount")?.source
    ).toBe("app-store-connect");
    expect(result.app_store_connect.available_territories).toEqual(["TUR", "USA"]);
  });

  it("reports App Store Connect mismatches without blocking the scan", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    config.metadata.localizations[0].title = "Local App Name";
    config.review.notes = "Local-only review notes";
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    const result = await scanProject({
      cwd: projectDir,
      env: createAscEnv(),
      fetchImpl: createAscFetchMock()
    });

    expect(result.risk_level).toBe("LOW");
    expect(result.app_store_connect.summary.value_mismatches).toBeGreaterThan(0);
    expect(result.next_steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "app-store-connect-followup:drift",
          kind: "app-store-connect-followup",
          priority: "soon"
        })
      ])
    );
    expect(
      result.app_store_connect.value_checks.some(
        (check) =>
          check.key === "metadata.localizations.en-US.title" &&
          check.status === "mismatch"
      )
    ).toBe(true);
  });

  it("adds a baseline diff when compared with an unchanged previous scan", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const baselinePath = path.join(projectDir, "baseline.json");
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(await scanProject({ cwd: projectDir }), null, 2)
    );

    const result = await scanProject({
      cwd: projectDir,
      baselinePath: "baseline.json"
    });

    expect(result.baseline).toBeDefined();
    expect(result.baseline?.has_changes).toBe(false);
    expect(result.baseline?.summary).toEqual({
      new_items: 0,
      resolved_items: 0
    });
  });

  it("reports new findings against a previous baseline scan", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const baselinePath = path.join(projectDir, "baseline.json");
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(await scanProject({ cwd: projectDir }), null, 2)
    );

    config.metadata.description = "Better than Spotify for App Review readiness.";
    config.metadata.localizations[0].description = config.metadata.description;
    config.review.notes = "";
    writeConfig(projectDir, config);
    fs.rmSync(path.join(projectDir, "assets", "iphone-6.5-1.png"));

    const result = await scanProject({
      cwd: projectDir,
      baselinePath: baselinePath
    });

    expect(result.baseline?.has_changes).toBe(true);
    expect(result.baseline?.blocking_issues.new_ids).toContain("META_002");
    expect(result.baseline?.warnings.new_ids).toContain("META_003");
    expect(result.baseline?.missing_inputs.new_keys).toContain("review.notes");
  });

  it("reports resolved findings against a previous baseline scan", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    config.metadata.description = "Better than Spotify for App Review readiness.";
    config.metadata.localizations[0].description = config.metadata.description;
    config.review.notes = "";
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    fs.rmSync(path.join(projectDir, "assets", "iphone-6.5-1.png"));

    const baselinePath = path.join(projectDir, "baseline.json");
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(await scanProject({ cwd: projectDir }), null, 2)
    );

    const fixedConfig = buildValidConfig();
    writeConfig(projectDir, fixedConfig);
    writeScreenshots(
      projectDir,
      fixedConfig.metadata.screenshots.map((entry) => entry.path)
    );

    const result = await scanProject({
      cwd: projectDir,
      baselinePath: baselinePath
    });

    expect(result.baseline?.has_changes).toBe(true);
    expect(result.baseline?.blocking_issues.resolved_ids).toContain("META_002");
    expect(result.baseline?.warnings.resolved_ids).toContain("META_003");
    expect(result.baseline?.missing_inputs.resolved_keys).toContain("review.notes");
  });

  it("fails clearly when the baseline report is missing", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    await expect(
      runScan({
        appStoreConnectRuntime: {
          isInteractive: false
        },
        cwd: projectDir,
        baselinePath: "missing-baseline.json"
      })
    ).rejects.toThrowError("Baseline report was not found");
  });

  it("fails clearly when the baseline report is invalid JSON", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    fs.writeFileSync(path.join(projectDir, "baseline.json"), "not-json");

    await expect(
      runScan({
        appStoreConnectRuntime: {
          isInteractive: false
        },
        cwd: projectDir,
        baselinePath: "baseline.json"
      })
    ).rejects.toThrowError("is not valid JSON");
  });

  it("emits GitHub annotations to stderr without breaking JSON output", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    config.metadata.description = "Better than Spotify for App Review readiness.";
    config.metadata.localizations[0].description = config.metadata.description;
    config.review.notes = "";
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    fs.rmSync(path.join(projectDir, "assets", "iphone-6.5-1.png"));

    const stderrChunks: string[] = [];
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(((chunk: string | Uint8Array) => {
        stderrChunks.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);

    try {
      const { output } = await runScan({
        appStoreConnectRuntime: {
          isInteractive: false
        },
        cwd: projectDir,
        json: true,
        annotations: "github"
      });

      expect(() => JSON.parse(output)).not.toThrow();
      expect(stderrChunks.join("")).toContain("::error");
      expect(stderrChunks.join("")).toContain("::warning");
      expect(stderrChunks.join("")).toContain("META_002");
      expect(stderrChunks.join("")).toContain("review.notes");
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it("renders the branded scan layout when requested", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const result = await scanProject({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir
    });
    const output = stripAnsi(
      formatHumanScanReport(result, createTranslator("en"), {
        outputMode: "branded"
      })
    );

    expect(output).toContain("🧭 Submission Surface");
    expect(output).toContain("🧾 REVIEW READINESS");
    expect(output).toContain("🔌 APP STORE CONNECT");
    expect(output).toContain("🏁 Verdict");
    expect(output).toContain("🪜 Next Steps");
    expect(output).toContain("🚀 READY TO SUBMIT");
    expect(output).toContain("⏭️ SOON Set up App Store Connect access");
    expect(output).toContain("✅ OK");
  });

  it("supports explicit plain output", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir,
      plain: true
    });

    expect(output).toContain("Submission Surface");
    expect(output).toContain("READY TO SUBMIT");
    expect(output).toContain("Next Steps");
    expect(output).toContain("SOON Set up App Store Connect access");
    expect(output).not.toContain("🧭");
    expect(output).not.toContain("✅");
    expect(output).not.toContain("🚀");
    expect(output.includes("\u001b[")).toBe(false);
  });

  it("appends update guidance to standard scan output when a newer CLI version exists", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    const latestVersion = "0.5.2";
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir,
      checkForUpdates: true,
      updateCheckFetchImpl: createUpdateCheckFetchMock(latestVersion)
    });
    const renderedOutput = stripAnsi(output);

    expect(renderedOutput).toContain("Update Available");
    expect(renderedOutput).toContain(
      `Preflight ${latestVersion} is available. You're running ${PREFLIGHT_VERSION}.`
    );
    expect(renderedOutput).toContain(
      `npm install -g @yakisan/preflight@${latestVersion}`
    );
  });

  it("adds a concise next steps summary to ci output", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir,
      ci: true
    });

    expect(output).toContain("Next Steps:");
    expect(output).toContain("[SOON] Set up App Store Connect access");
  });

  it("appends update guidance to ci output when a newer CLI version exists", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    const latestVersion = "0.5.2";
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir,
      ci: true,
      checkForUpdates: true,
      updateCheckFetchImpl: createUpdateCheckFetchMock(latestVersion)
    });

    expect(output).toContain("Update Available:");
    expect(output).toContain(
      `Preflight ${latestVersion} is available. You're running ${PREFLIGHT_VERSION}.`
    );
    expect(output).toContain(
      `Update with: npm install -g @yakisan/preflight@${latestVersion}`
    );
  });

  it("keeps json scan output unchanged when update checks are enabled", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const ascConfigPath = path.join(projectDir, ".preflight-home", "app-store-connect.json");
    const config = buildValidConfig();
    const updateCheckFetchImpl = createUpdateCheckFetchMock("0.5.2");
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = await runScan({
      appStoreConnectRuntime: {
        configPath: ascConfigPath,
        isInteractive: false
      },
      cwd: projectDir,
      json: true,
      checkForUpdates: true,
      updateCheckFetchImpl
    });

    expect(() => JSON.parse(output)).not.toThrow();
    expect(output).not.toContain("Update Available");
    expect(vi.mocked(updateCheckFetchImpl)).not.toHaveBeenCalled();
  });
});

describe("auxiliary commands", () => {
  it("lists 30 bundled rules", () => {
    expect(RULE_REGISTRY).toHaveLength(30);

    const { output } = runRules({
      json: true
    });
    const parsed = JSON.parse(output);

    expect(parsed.rules).toHaveLength(30);
  });

  it("supports at least 10 locales including English and Turkish", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(10);
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("tr");
  });

  it("renders review readiness output", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { reviewReadiness, exitCode } = await buildReviewReadinessReport({
      cwd: projectDir,
      lang: "tr"
    });
    const output = renderReviewReadinessResult(reviewReadiness, {
      lang: "tr"
    });

    expect(exitCode).toBe(0);
    expect(output).toContain("Review Readiness");
  });

  it("renders branded review readiness output with emoji accents", async () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { reviewReadiness } = await buildReviewReadinessReport({
      cwd: projectDir,
      lang: "en"
    });
    const output = stripAnsi(
      formatHumanReviewReadiness(reviewReadiness, createTranslator("en"), {
        outputMode: "branded"
      })
    );

    expect(output).toContain("🧾 REVIEW READINESS");
    expect(output).toContain("🏁 Verdict");
    expect(output).toContain("✅ REVIEW READINESS IS COMPLETE");
    expect(output).toContain("✅ OK");
  });

  it("renders branded rules output with emoji heading", () => {
    const output = stripAnsi(
      formatRulesTable(RULE_REGISTRY, createTranslator("en"), {
        outputMode: "branded"
      })
    );

    expect(output).toContain("📚 ACTIVE RULES");
    expect(output).toContain("30 bundled rules");
  });

  it("creates a starter config with init", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);

    const { outputPath, exitCode } = runInit({
      cwd: projectDir,
      lang: "en"
    });

    expect(exitCode).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));

    expect(parsed.app).toBeUndefined();
    expect(parsed.review.demoAccount.username).toBe("reviewer@example.com");
  });

  it("creates missing parent directories for nested init output paths", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);

    const { outputPath, exitCode } = runInit({
      cwd: projectDir,
      outputPath: "configs/release.json",
      force: true,
      lang: "en"
    });

    expect(exitCode).toBe(0);
    expect(outputPath).toBe(path.join(projectDir, "configs", "release.json"));
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
