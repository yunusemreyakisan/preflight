import { describe, expect, it, vi } from "vitest";

import { checkForCliUpdate, isVersionNewer } from "../src/updates/check-for-cli-update";

function createRegistryFetchMock(version: unknown): typeof fetch {
  return vi.fn(async () => {
    return new Response(JSON.stringify({ version }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  }) as unknown as typeof fetch;
}

describe("checkForCliUpdate", () => {
  it("returns update info when npm latest is newer", async () => {
    const result = await checkForCliUpdate({
      currentVersion: "0.5.1",
      fetchImpl: createRegistryFetchMock("0.5.2")
    });

    expect(result).toMatchObject({
      currentVersion: "0.5.1",
      latestVersion: "0.5.2",
      packageName: "@yakisan/preflight",
      updateCommand: "npm install -g @yakisan/preflight@0.5.2"
    });
  });

  it("returns undefined when npm latest is not newer", async () => {
    await expect(
      checkForCliUpdate({
        currentVersion: "0.5.1",
        fetchImpl: createRegistryFetchMock("0.5.1")
      })
    ).resolves.toBeUndefined();
  });

  it("returns undefined when the fetch fails", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(
      checkForCliUpdate({
        currentVersion: "0.5.1",
        fetchImpl: fetchMock
      })
    ).resolves.toBeUndefined();
  });
});

describe("isVersionNewer", () => {
  it("compares numeric semver segments", () => {
    expect(isVersionNewer("1.10.0", "1.9.9")).toBe(true);
    expect(isVersionNewer("1.9.9", "1.10.0")).toBe(false);
    expect(isVersionNewer("1.10.0", "1.10.0")).toBe(false);
    expect(isVersionNewer("beta", "1.10.0")).toBe(false);
  });
});
