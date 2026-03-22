import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  RULE_REGISTRY,
  SUPPORTED_LOCALES,
  runInit,
  runReviewerPack,
  runRules,
  runScan,
  scanProject
} from "../src";
import { buildValidConfig, createTempProject, writeConfig, writeScreenshots } from "./helpers";

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

    expect(output).toContain("PREFLIGHT TARAMA SONUCLARI");
  });

  it("returns the v2 JSON shape", () => {
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
  });
});

