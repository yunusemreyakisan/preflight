import { describe, expect, it } from "vitest";

import { RULE_REGISTRY } from "../src";

describe("RULE_REGISTRY", () => {
  it("contains unique IDs and lastVerified metadata", () => {
    const ids = RULE_REGISTRY.map((rule) => rule.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("REVIEWER_001");
    expect(ids).toContain("CONTENT_002");
    expect(RULE_REGISTRY.every((rule) => rule.lastVerified.length > 0)).toBe(true);
  });
});
