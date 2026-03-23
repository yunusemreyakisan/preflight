import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  RULE_REGISTRY,
  SUPPORTED_LOCALES,
  createTranslator,
  formatHumanScanReport,
  runInit,
  runReviewerPack,
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

afterEach(() => {
  for (const directory of createdDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("scanProject", () => {
  it("returns LOW risk for a complete config", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const result = scanProject({ cwd: projectDir });

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
  });

  it("discovers a native iOS project without config", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeNativeIosProject(projectDir, {
      includePrivacyManifest: true,
      includeRequiredReasonApis: true
    });
    writeDiscoveredScreenshots(projectDir);

    const result = scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("native-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "DISCOVERY_001")).toBe(false);
    expect(result.discovery.sources.some((source) => source.endsWith("Info.plist"))).toBe(true);
    expect(result.evidence.some((entry) => entry.key === "app.name")).toBe(true);
    expect(result.missing_inputs.map((input) => input.key)).toEqual(
      expect.arrayContaining(["review.notes", "review.contact"])
    );
    expect(result.exit_code).toBe(1);
  });

  it("detects Flutter iOS projects from the ios subproject", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeFlutterIosProject(projectDir);
    writeDiscoveredScreenshots(projectDir);

    const result = scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("flutter-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "DISCOVERY_001")).toBe(false);
  });

  it("detects React Native iOS projects from the ios subproject", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeReactNativeIosProject(projectDir);
    writeDiscoveredScreenshots(projectDir);

    const result = scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("react-native-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "DISCOVERY_001")).toBe(false);
  });

  it("keeps screenshot resolution relative to the overridden config path", () => {
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

    const result = scanProject({
      cwd: projectDir,
      configPath: "configs/release.json"
    });

    expect(result.risk_level).toBe("LOW");
    expect(result.config_path).toBe(path.join(projectDir, "configs", "release.json"));
  });

  it("reports blocking issues when required screenshot files are missing", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeConfig(projectDir, buildValidConfig());

    const result = scanProject({ cwd: projectDir });

    expect(result.risk_level).toBe("HIGH");
    expect(result.blocking_issues.some((issue) => issue.id === "META_001")).toBe(false);
    expect(result.blocking_issues.some((issue) => issue.id === "CONFIG_001")).toBe(false);
    expect(result.warnings.length + result.blocking_issues.length).toBeGreaterThan(0);
  });

  it("lets config overrides win over discovered values", () => {
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

    const result = scanProject({ cwd: projectDir });

    expect(result.discovery.project_type).toBe("native-ios");
    expect(result.blocking_issues.some((issue) => issue.id === "META_001")).toBe(true);
  });

  it("fails clearly when no supported iOS project and no usable config are present", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);

    const result = scanProject({ cwd: projectDir });

    expect(result.risk_level).toBe("HIGH");
    expect(result.blocking_issues.map((issue) => issue.id)).toContain("DISCOVERY_001");
  });

  it("produces Turkish output", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = runScan({
      cwd: projectDir,
      lang: "tr"
    });

    expect(output).toContain("App Store gonderim risk motoru");
    expect(output).toContain("Gonderim Yuzeyi");
  });

  it("returns the v0.3 JSON shape", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = runScan({
      cwd: projectDir,
      json: true
    });
    const parsed = JSON.parse(output);

    expect(parsed.risk_level).toBe("LOW");
    expect(parsed.passed_checks).toHaveLength(30);
    expect(parsed.reviewer_pack.status).toBe("complete");
    expect(parsed.discovery).toBeDefined();
    expect(parsed.discovery.sources).toEqual([]);
    expect(parsed.missing_inputs).toEqual([]);
    expect(parsed.evidence).toEqual([]);
  });

  it("renders the branded scan layout when requested", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const result = scanProject({ cwd: projectDir });
    const output = formatHumanScanReport(result, createTranslator("en"), {
      outputMode: "branded"
    });

    expect(output).toContain("Submission Surface");
    expect(output).toContain("Reviewer Pack");
    expect(output).toContain("Verdict");
    expect(output).toContain("READY TO SUBMIT");
  });

  it("supports explicit plain output", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output } = runScan({
      cwd: projectDir,
      plain: true
    });

    expect(output).toContain("Submission Surface");
    expect(output).toContain("READY TO SUBMIT");
    expect(output.includes("\u001b[")).toBe(false);
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

  it("renders reviewer-pack output", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    const { output, exitCode } = runReviewerPack({
      cwd: projectDir,
      lang: "tr"
    });

    expect(exitCode).toBe(0);
    expect(output).toContain("Reviewer Pack Durumu");
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
});
