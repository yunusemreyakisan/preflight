const MANAGED_VERSION_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:[-+].*)?$/;

export interface ExistingReleaseRecord {
  id: number;
  tagName: string;
  draft?: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
}

export interface PlannedReleaseMutation {
  tagName: string;
  name: string;
  makeLatest: boolean;
  previousTagName?: string;
}

export interface PlannedReleaseDeletion {
  id: number;
  tagName: string;
}

export interface ReleaseSyncPlan {
  versionTag: string;
  currentVersionReleaseToDelete?: PlannedReleaseDeletion;
  currentVersionTagToDelete: boolean;
  legacyLatestReleaseToDelete?: PlannedReleaseDeletion;
  legacyLatestTagToDelete: boolean;
  currentVersionReleaseToCreate: PlannedReleaseMutation;
  staleVersionReleasesToDelete: PlannedReleaseDeletion[];
  staleVersionTagsToDelete: string[];
  retainedVersionTags: string[];
}

export interface BuildReleaseSyncPlanOptions {
  version: string;
  existingReleases: ExistingReleaseRecord[];
  existingTagNames: string[];
  keepVersionReleaseCount?: number;
}

function toTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isManagedVersionTag(tagName: string): boolean {
  return MANAGED_VERSION_TAG_PATTERN.test(tagName);
}

function sortManagedVersionReleases(
  releases: ExistingReleaseRecord[]
): ExistingReleaseRecord[] {
  return releases
    .filter((release) => !release.draft && isManagedVersionTag(release.tagName))
    .sort(
      (left, right) =>
        toTimestamp(right.publishedAt ?? right.createdAt) -
        toTimestamp(left.publishedAt ?? left.createdAt)
    );
}

export function buildReleaseSyncPlan(
  options: BuildReleaseSyncPlanOptions
): ReleaseSyncPlan {
  const keepVersionReleaseCount = options.keepVersionReleaseCount ?? 2;
  const versionTag = `v${options.version}`;
  const managedVersionReleases = sortManagedVersionReleases(options.existingReleases);
  const currentVersionRelease = managedVersionReleases.find(
    (release) => release.tagName === versionTag
  );
  const legacyLatestRelease = options.existingReleases.find(
    (release) => !release.draft && release.tagName === "latest"
  );
  const previousVersionTag = managedVersionReleases.find(
    (release) => release.tagName !== versionTag
  );

  const retainedVersionTags = unique([
    versionTag,
    ...managedVersionReleases.map((release) => release.tagName)
  ]).slice(0, keepVersionReleaseCount);

  const staleVersionReleasesToDelete = managedVersionReleases
    .filter((release) => !retainedVersionTags.includes(release.tagName))
    .map((release) => ({
      id: release.id,
      tagName: release.tagName
    }));

  const staleVersionTagsToDelete = unique(
    options.existingTagNames.filter(
      (tagName) =>
        isManagedVersionTag(tagName) && !retainedVersionTags.includes(tagName)
    )
  );

  return {
    versionTag,
    currentVersionReleaseToDelete: currentVersionRelease
      ? {
          id: currentVersionRelease.id,
          tagName: currentVersionRelease.tagName
        }
      : undefined,
    currentVersionTagToDelete: options.existingTagNames.includes(versionTag),
    legacyLatestReleaseToDelete: legacyLatestRelease
      ? {
          id: legacyLatestRelease.id,
          tagName: legacyLatestRelease.tagName
        }
      : undefined,
    legacyLatestTagToDelete: options.existingTagNames.includes("latest"),
    currentVersionReleaseToCreate: {
      tagName: versionTag,
      name: versionTag,
      makeLatest: true,
      previousTagName: previousVersionTag?.tagName
    },
    staleVersionReleasesToDelete,
    staleVersionTagsToDelete,
    retainedVersionTags
  };
}
