import { describe, expect, it } from "vitest";

import { createTranslator, resolveLocale, resolveLocaleFromArgv } from "../src";

describe("i18n", () => {
  it("falls back to English for unknown locales", () => {
    expect(resolveLocale("xx-YY")).toBe("en");
  });

  it("detects locale from argv", () => {
    expect(resolveLocaleFromArgv(["node", "cli", "--lang", "tr"])).toBe("tr");
    expect(resolveLocaleFromArgv(["node", "cli", "--lang=de"])).toBe("de");
  });

  it("provides localized translator output", () => {
    const english = createTranslator("en");
    const turkish = createTranslator("tr");

    expect(english.t("output.riskLevel")).toBe("Risk Level");
    expect(turkish.t("output.riskLevel")).toBe("Risk Seviyesi");
  });
});

