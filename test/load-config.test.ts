import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createTranslator, loadConfigFromFile } from "../src";
import { buildValidConfig, createTempProject, writeConfig } from "./helpers";

const createdDirs: string[] = [];

afterEach(() => {
  for (const directory of createdDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadConfigFromFile", () => {
  it("loads a valid nested config", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeConfig(projectDir, buildValidConfig());

    const result = loadConfigFromFile({
      cwd: projectDir,
      translator: createTranslator("en")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.app?.bundleId).toBe("com.example.preflight");
      expect(result.configPath).toBe(path.join(projectDir, "preflight.config.json"));
    }
  });

  it("keeps sparse overrides sparse", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeConfig(projectDir, {
      review: {
        notes: "Use the guest entry point from the launch screen."
      }
    });

    const result = loadConfigFromFile({
      cwd: projectDir,
      translator: createTranslator("en")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.review?.notes).toBe(
        "Use the guest entry point from the launch screen."
      );
      expect(result.config.app).toBeUndefined();
      expect(result.fieldSources).toEqual({
        "review.notes": "config"
      });
    }
  });

  it("normalizes flat alias config into the canonical shape", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    writeConfig(projectDir, {
      name: "Alias App",
      bundleId: "com.example.alias",
      loginRequired: true,
      hasDemoAccount: true,
      demoEmail: "reviewer@example.com",
      demoPassword: "password123",
      hasReviewNotes: true,
      reviewNotes: "Use the reviewer account to validate the login flow.",
      loginInstructions: "Open app, tap Sign In, use the demo account.",
      contactName: "Alias Team",
      contactEmail: "alias@example.com",
      title: "Alias App",
      subtitle: "Safe launch",
      description: "A clean App Store release flow.",
      keywords: "ios,release,review",
      primaryMarkets: ["en-US"],
      metadata: {
        screenshots: [
          { path: "assets/one.png", deviceType: "iphone-6.7", locales: ["en-US"] },
          { path: "assets/two.png", deviceType: "iphone-6.7", locales: ["en-US"] },
          { path: "assets/three.png", deviceType: "iphone-6.5", locales: ["en-US"] }
        ],
        requiredScreenshotDeviceTypes: ["iphone-6.7", "iphone-6.5"]
      },
      privacyPolicyUrl: "https://example.com/privacy",
      nutritionLabelComplete: true,
      privacyManifestPresent: true,
      requiredReasonApisDeclared: true
    });

    const result = loadConfigFromFile({
      cwd: projectDir,
      translator: createTranslator("en")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.review?.demoAccount?.username).toBe("reviewer@example.com");
      expect(result.config.appCapabilities?.loginRequired).toBe(true);
      expect(result.warnings).toHaveLength(1);
    }
  });

  it("returns schema errors with field paths", () => {
    const projectDir = createTempProject();
    createdDirs.push(projectDir);
    fs.writeFileSync(
      path.join(projectDir, "preflight.config.json"),
      JSON.stringify({
        review: {
          contact: {
            email: "not-an-email"
          }
        }
      })
    );

    const result = loadConfigFromFile({
      cwd: projectDir,
      translator: createTranslator("en")
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue.id).toBe("CONFIG_004");
      expect(
        result.issue.details?.some((detail) => detail.includes("review.contact.email"))
      ).toBe(true);
    }
  });
});
