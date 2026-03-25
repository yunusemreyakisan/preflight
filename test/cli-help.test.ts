import { describe, expect, it } from "vitest";

import { buildProgram } from "../src";

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
});
