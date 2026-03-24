import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("adds a baseline diff when compared with an unchanged previous scan", () => {
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
      JSON.stringify(scanProject({ cwd: projectDir }), null, 2)
    );

    const result = scanProject({
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

  it("reports new findings against a previous baseline scan", () => {
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
      JSON.stringify(scanProject({ cwd: projectDir }), null, 2)
    );

    config.metadata.description = "Better than Spotify for App Review readiness.";
    config.metadata.localizations[0].description = config.metadata.description;
    config.review.notes = "";
    writeConfig(projectDir, config);
    fs.rmSync(path.join(projectDir, "assets", "iphone-6.5-1.png"));

    const result = scanProject({
      cwd: projectDir,
      baselinePath: baselinePath
    });

    expect(result.baseline?.has_changes).toBe(true);
    expect(result.baseline?.blocking_issues.new_ids).toContain("META_002");
    expect(result.baseline?.warnings.new_ids).toContain("META_003");
    expect(result.baseline?.missing_inputs.new_keys).toContain("review.notes");
  });

  it("reports resolved findings against a previous baseline scan", () => {
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
      JSON.stringify(scanProject({ cwd: projectDir }), null, 2)
    );

    const fixedConfig = buildValidConfig();
    writeConfig(projectDir, fixedConfig);
    writeScreenshots(
      projectDir,
      fixedConfig.metadata.screenshots.map((entry) => entry.path)
    );

    const result = scanProject({
      cwd: projectDir,
      baselinePath: baselinePath
    });

    expect(result.baseline?.has_changes).toBe(true);
    expect(result.baseline?.blocking_issues.resolved_ids).toContain("META_002");
    expect(result.baseline?.warnings.resolved_ids).toContain("META_003");
    expect(result.baseline?.missing_inputs.resolved_keys).toContain("review.notes");
  });

  it("fails clearly when the baseline report is missing", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );

    expect(() =>
      runScan({
        cwd: projectDir,
        baselinePath: "missing-baseline.json"
      })
    ).toThrowError("Baseline report was not found");
  });

  it("fails clearly when the baseline report is invalid JSON", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    const config = buildValidConfig();
    writeConfig(projectDir, config);
    writeScreenshots(
      projectDir,
      config.metadata.screenshots.map((entry) => entry.path)
    );
    fs.writeFileSync(path.join(projectDir, "baseline.json"), "not-json");

    expect(() =>
      runScan({
        cwd: projectDir,
        baselinePath: "baseline.json"
      })
    ).toThrowError("is not valid JSON");
  });

  it("emits GitHub annotations to stderr without breaking JSON output", () => {
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
      const { output } = runScan({
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
