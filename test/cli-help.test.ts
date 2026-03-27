import { describe, expect, it } from "vitest";

import { PREFLIGHT_VERSION, buildProgram } from "../src";

function getCommandHelp(locale: string, commandName: string): string {
  const program = buildProgram(["node", "preflight", "--lang", locale]);
  const command = program.commands.find((entry) => entry.name() === commandName);

  if (!command) {
    throw new Error(`Missing command: ${commandName}`);
  }

  return command.helpInformation();
}

describe("cli help", () => {
  it("renders the current scan help in English", () => {
    const program = buildProgram(["node", "preflight", "--lang", "en"]);
    const globalHelp = program.helpInformation();
    const scanHelp = getCommandHelp("en", "scan");
    const initHelp = getCommandHelp("en", "init");

    expect(globalHelp).toContain("CI-grade App Store submission risk engine.");
    expect(globalHelp).toContain("-v, --version");
    expect(globalHelp).toContain("--plain");
    expect(scanHelp).toContain("Run an auto-discovery-first submission risk scan");
    expect(scanHelp).toContain("optional App Store Connect");
    expect(scanHelp).toContain("Path to an optional preflight override file");
    expect(scanHelp).toContain("--baseline <path>");
    expect(scanHelp).toContain("--annotations <target>");
    expect(scanHelp).toContain("--skip-app-store-connect");
    expect(initHelp).toContain("Create an optional preflight override template.");
  });

  it("keeps localized help aligned with override-template wording", () => {
    const scanHelp = getCommandHelp("de", "scan");
    const initHelp = getCommandHelp("de", "init");

    expect(scanHelp).toContain("auto-discovery-first");
    expect(initHelp).toContain("Override");
  });

  it("does not register the removed reviewer-pack command", () => {
    const program = buildProgram(["node", "preflight", "--lang", "en"]);

    expect(program.commands.some((entry) => entry.name() === "reviewer-pack")).toBe(false);
  });

  it("prints the current CLI version with both version flags", async () => {
    const longFlagOutput: string[] = [];
    const shortFlagOutput: string[] = [];
    const longFlagProgram = buildProgram(["node", "preflight", "--lang", "en"]);
    const shortFlagProgram = buildProgram(["node", "preflight", "--lang", "en"]);

    longFlagProgram.configureOutput({
      writeErr: () => undefined,
      writeOut: (value) => {
        longFlagOutput.push(value);
      }
    });
    longFlagProgram.exitOverride();

    shortFlagProgram.configureOutput({
      writeErr: () => undefined,
      writeOut: (value) => {
        shortFlagOutput.push(value);
      }
    });
    shortFlagProgram.exitOverride();

    await expect(
      longFlagProgram.parseAsync(["node", "preflight", "--version"])
    ).rejects.toMatchObject({
      code: "commander.version",
      exitCode: 0
    });
    await expect(
      shortFlagProgram.parseAsync(["node", "preflight", "-v"])
    ).rejects.toMatchObject({
      code: "commander.version",
      exitCode: 0
    });

    expect(longFlagOutput.join("")).toContain(PREFLIGHT_VERSION);
    expect(shortFlagOutput.join("")).toContain(PREFLIGHT_VERSION);
  });
});
