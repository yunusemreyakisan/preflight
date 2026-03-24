import { describe, expect, it } from "vitest";

import {
  buildReleaseSyncPlan,
  type ExistingReleaseRecord
} from "../src/release/sync-plan";

function release(
  id: number,
  tagName: string,
  publishedAt: string,
  options: { draft?: boolean } = {}
): ExistingReleaseRecord {
  return {
    id,
    tagName,
    draft: options.draft,
    publishedAt,
    createdAt: publishedAt
  };
}

describe("buildReleaseSyncPlan", () => {
  it("creates a versioned release on the first publish", () => {
    const plan = buildReleaseSyncPlan({
      version: "0.3.4",
      existingReleases: [],
      existingTagNames: []
    });

    expect(plan.versionTag).toBe("v0.3.4");
    expect(plan.currentVersionReleaseToDelete).toBeUndefined();
    expect(plan.currentVersionTagToDelete).toBe(false);
    expect(plan.legacyLatestReleaseToDelete).toBeUndefined();
    expect(plan.legacyLatestTagToDelete).toBe(false);
    expect(plan.currentVersionReleaseToCreate).toEqual({
      tagName: "v0.3.4",
      name: "v0.3.4",
      makeLatest: true,
      previousTagName: undefined
    });
    expect(plan.retainedVersionTags).toEqual(["v0.3.4"]);
    expect(plan.staleVersionReleasesToDelete).toEqual([]);
    expect(plan.staleVersionTagsToDelete).toEqual([]);
  });

  it("refreshes the current version tag and removes legacy latest artifacts", () => {
    const plan = buildReleaseSyncPlan({
      version: "0.3.4",
      existingReleases: [
        release(1, "latest", "2026-03-24T10:00:00Z"),
        release(2, "v0.3.4", "2026-03-23T10:00:00Z"),
        release(3, "v0.3.3", "2026-03-22T10:00:00Z")
      ],
      existingTagNames: ["latest", "v0.3.4", "v0.3.3"]
    });

    expect(plan.currentVersionReleaseToDelete).toEqual({
      id: 2,
      tagName: "v0.3.4"
    });
    expect(plan.currentVersionTagToDelete).toBe(true);
    expect(plan.legacyLatestReleaseToDelete).toEqual({
      id: 1,
      tagName: "latest"
    });
    expect(plan.legacyLatestTagToDelete).toBe(true);
    expect(plan.currentVersionReleaseToCreate).toEqual({
      tagName: "v0.3.4",
      name: "v0.3.4",
      makeLatest: true,
      previousTagName: "v0.3.3"
    });
    expect(plan.retainedVersionTags).toEqual(["v0.3.4", "v0.3.3"]);
    expect(plan.staleVersionReleasesToDelete).toEqual([]);
    expect(plan.staleVersionTagsToDelete).toEqual([]);
  });

  it("creates a new versioned release and prunes the oldest retained version", () => {
    const plan = buildReleaseSyncPlan({
      version: "0.3.5",
      existingReleases: [
        release(1, "v0.3.4", "2026-03-23T10:00:00Z"),
        release(2, "v0.3.3", "2026-03-22T10:00:00Z")
      ],
      existingTagNames: ["v0.3.4", "v0.3.3"]
    });

    expect(plan.currentVersionReleaseToDelete).toBeUndefined();
    expect(plan.currentVersionTagToDelete).toBe(false);
    expect(plan.currentVersionReleaseToCreate).toEqual({
      tagName: "v0.3.5",
      name: "v0.3.5",
      makeLatest: true,
      previousTagName: "v0.3.4"
    });
    expect(plan.retainedVersionTags).toEqual(["v0.3.5", "v0.3.4"]);
    expect(plan.staleVersionReleasesToDelete).toEqual([
      {
        id: 2,
        tagName: "v0.3.3"
      }
    ]);
    expect(plan.staleVersionTagsToDelete).toEqual(["v0.3.3"]);
  });

  it("prunes every stale release beyond the retained version window", () => {
    const plan = buildReleaseSyncPlan({
      version: "0.3.6",
      existingReleases: [
        release(1, "v0.3.5", "2026-03-23T10:00:00Z"),
        release(2, "v0.3.4", "2026-03-22T10:00:00Z"),
        release(3, "v0.3.3", "2026-03-21T10:00:00Z")
      ],
      existingTagNames: ["v0.3.5", "v0.3.4", "v0.3.3"]
    });

    expect(plan.retainedVersionTags).toEqual(["v0.3.6", "v0.3.5"]);
    expect(plan.staleVersionReleasesToDelete).toEqual([
      {
        id: 2,
        tagName: "v0.3.4"
      },
      {
        id: 3,
        tagName: "v0.3.3"
      }
    ]);
    expect(plan.staleVersionTagsToDelete).toEqual(["v0.3.4", "v0.3.3"]);
  });

  it("retains the current version even if the branch is temporarily rolled back", () => {
    const plan = buildReleaseSyncPlan({
      version: "0.3.4",
      existingReleases: [
        release(1, "v0.3.6", "2026-03-23T10:00:00Z"),
        release(2, "v0.3.5", "2026-03-22T10:00:00Z"),
        release(3, "v0.3.4", "2026-03-21T10:00:00Z")
      ],
      existingTagNames: ["v0.3.6", "v0.3.5", "v0.3.4"]
    });

    expect(plan.currentVersionReleaseToDelete).toEqual({
      id: 3,
      tagName: "v0.3.4"
    });
    expect(plan.currentVersionTagToDelete).toBe(true);
    expect(plan.currentVersionReleaseToCreate).toEqual({
      tagName: "v0.3.4",
      name: "v0.3.4",
      makeLatest: true,
      previousTagName: "v0.3.6"
    });
    expect(plan.retainedVersionTags).toEqual(["v0.3.4", "v0.3.6"]);
    expect(plan.staleVersionReleasesToDelete).toEqual([
      {
        id: 2,
        tagName: "v0.3.5"
      }
    ]);
    expect(plan.staleVersionTagsToDelete).toEqual(["v0.3.5"]);
  });
});
