import fs from "node:fs";
import path from "node:path";

import {
  buildReleaseSyncPlan,
  type ExistingReleaseRecord,
  type PlannedReleaseMutation
} from "./sync-plan";

const API_BASE_URL = "https://api.github.com";
const DEFAULT_RELEASE_BODY = `## Install

\`\`\`bash
npx @yakisan/preflight scan
\`\`\`

Or install the CLI globally:

\`\`\`bash
npm install -g @yakisan/preflight
preflight scan
\`\`\`

## Release Notes

- Preflight is distributed via npm only.
- \`scan\` is auto-discovery-first and uses \`preflight.config.json\` only for sparse overrides.
- Output includes risk, evidence, missing inputs, reviewer-pack guidance, baseline diffs, and GitHub Actions annotations for local workflows and CI.

## CI Highlights

- Compare scans against a saved JSON baseline with \`preflight scan --baseline preflight-report.json\`
- Emit workflow annotations with \`preflight scan --annotations github\`

## Requirements

- Node.js 20 or newer
- Legacy \`curl\`, Go shim, and Homebrew install paths are no longer supported`;

interface GitHubReleaseApiRecord {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  published_at?: string | null;
  created_at?: string | null;
}

interface GitHubRefApiRecord {
  ref: string;
}

interface CreateReleaseRequest {
  tagName: string;
  name: string;
  body: string;
  makeLatest: boolean;
  targetCommitish: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseRepositorySlug(value: string): { owner: string; repo: string } {
  const [owner, repo] = value.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${value}`);
  }

  return { owner, repo };
}

function readPackageVersion(cwd = process.cwd()): string {
  const packageJsonPath = path.join(cwd, "package.json");
  const rawContent = fs.readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(rawContent) as { version?: unknown };

  if (typeof parsed.version !== "string" || parsed.version.trim().length === 0) {
    throw new Error("package.json is missing a valid version field.");
  }

  return parsed.version.trim();
}

function parsePositiveInteger(name: string, fallbackValue: number): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

class GitHubApiClient {
  constructor(
    private readonly owner: string,
    private readonly repo: string,
    private readonly token: string
  ) {}

  async listReleases(): Promise<GitHubReleaseApiRecord[]> {
    return this.paginate<GitHubReleaseApiRecord>(
      `/repos/${this.owner}/${this.repo}/releases`
    );
  }

  async listMatchingRefs(refPrefix: string): Promise<GitHubRefApiRecord[]> {
    return this.paginate<GitHubRefApiRecord>(
      `/repos/${this.owner}/${this.repo}/git/matching-refs/${refPrefix}`
    );
  }

  async deleteRelease(releaseId: number): Promise<void> {
    await this.request(
      "DELETE",
      `/repos/${this.owner}/${this.repo}/releases/${releaseId}`,
      { okStatuses: [204, 404] }
    );
  }

  async deleteTag(tagName: string): Promise<void> {
    await this.request(
      "DELETE",
      `/repos/${this.owner}/${this.repo}/git/refs/tags/${encodeURIComponent(tagName)}`,
      { okStatuses: [204, 404] }
    );
  }

  async generateReleaseNotes(options: {
    tagName: string;
    targetCommitish: string;
    previousTagName?: string;
  }): Promise<string> {
    const response = await this.request<{ body?: string }>(
      "POST",
      `/repos/${this.owner}/${this.repo}/releases/generate-notes`,
      {
        body: {
          tag_name: options.tagName,
          target_commitish: options.targetCommitish,
          ...(options.previousTagName
            ? { previous_tag_name: options.previousTagName }
            : {})
        }
      }
    );

    return response.data.body?.trim() ?? "";
  }

  async createRelease(options: CreateReleaseRequest): Promise<GitHubReleaseApiRecord> {
    const response = await this.request<GitHubReleaseApiRecord>(
      "POST",
      `/repos/${this.owner}/${this.repo}/releases`,
      {
        body: {
          tag_name: options.tagName,
          target_commitish: options.targetCommitish,
          name: options.name,
          body: options.body,
          draft: false,
          prerelease: false,
          make_latest: options.makeLatest ? "true" : "false"
        }
      }
    );

    return response.data;
  }

  private async paginate<T>(pathname: string): Promise<T[]> {
    const results: T[] = [];

    for (let page = 1; ; page += 1) {
      const response = await this.request<T[]>("GET", pathname, {
        query: {
          per_page: "100",
          page: String(page)
        }
      });

      results.push(...response.data);

      if (response.data.length < 100) {
        return results;
      }
    }
  }

  private async request<T>(
    method: string,
    pathname: string,
    options: {
      query?: Record<string, string>;
      body?: unknown;
      okStatuses?: number[];
    } = {}
  ): Promise<{ status: number; data: T }> {
    const url = new URL(`${API_BASE_URL}${pathname}`);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "preflight-release-sync",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const okStatuses = options.okStatuses ?? [200, 201];

    if (!okStatuses.includes(response.status)) {
      const responseText = await response.text();
      throw new Error(
        `GitHub API ${method} ${pathname} failed with ${response.status}: ${responseText || response.statusText}`
      );
    }

    if (response.status === 204 || response.status === 404) {
      return {
        status: response.status,
        data: undefined as T
      };
    }

    return {
      status: response.status,
      data: (await response.json()) as T
    };
  }
}

function mapReleaseRecord(release: GitHubReleaseApiRecord): ExistingReleaseRecord {
  return {
    id: release.id,
    tagName: release.tag_name,
    draft: release.draft,
    publishedAt: release.published_at,
    createdAt: release.created_at
  };
}

async function buildReleaseBody(
  client: GitHubApiClient,
  mutation: PlannedReleaseMutation,
  targetCommitish: string,
  releaseBodyPrefix: string
): Promise<string> {
  try {
    const generatedNotes = await client.generateReleaseNotes({
      tagName: mutation.tagName,
      targetCommitish,
      previousTagName: mutation.previousTagName
    });

    if (!generatedNotes) {
      return releaseBodyPrefix;
    }

    return `${releaseBodyPrefix}\n\n${generatedNotes}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(
      `warning: failed to generate release notes for ${mutation.tagName}: ${message}\n`
    );
    return releaseBodyPrefix;
  }
}

function collectManagedTagNames(refs: GitHubRefApiRecord[]): string[] {
  return refs.map((ref) => ref.ref.replace("refs/tags/", ""));
}

export async function syncGitHubReleasesFromEnv(): Promise<void> {
  const token = requireEnv("GITHUB_TOKEN");
  const repository = parseRepositorySlug(requireEnv("GITHUB_REPOSITORY"));
  const targetCommitish = requireEnv("GITHUB_SHA");
  const version = readPackageVersion();
  const keepVersionReleaseCount = parsePositiveInteger(
    "RELEASE_KEEP_VERSION_COUNT",
    2
  );
  const releaseBodyPrefix = (
    process.env.RELEASE_BODY ?? DEFAULT_RELEASE_BODY
  ).trim();
  const client = new GitHubApiClient(repository.owner, repository.repo, token);

  const [existingReleases, existingRefs] = await Promise.all([
    client.listReleases(),
    client.listMatchingRefs("tags")
  ]);
  const existingTagNames = collectManagedTagNames(existingRefs);
  const plan = buildReleaseSyncPlan({
    version,
    existingReleases: existingReleases.map(mapReleaseRecord),
    existingTagNames,
    keepVersionReleaseCount
  });

  process.stdout.write(
    `syncing releases for ${plan.versionTag}; retaining ${plan.retainedVersionTags.join(", ")}\n`
  );

  if (plan.currentVersionReleaseToDelete) {
    await client.deleteRelease(plan.currentVersionReleaseToDelete.id);
    process.stdout.write(
      `deleted release ${plan.currentVersionReleaseToDelete.tagName}\n`
    );
  }

  if (plan.currentVersionTagToDelete) {
    await client.deleteTag(plan.versionTag);
    process.stdout.write(`deleted tag ${plan.versionTag}\n`);
  }

  if (plan.legacyLatestReleaseToDelete) {
    await client.deleteRelease(plan.legacyLatestReleaseToDelete.id);
    process.stdout.write(
      `deleted legacy release ${plan.legacyLatestReleaseToDelete.tagName}\n`
    );
  }

  if (plan.legacyLatestTagToDelete) {
    await client.deleteTag("latest");
    process.stdout.write("deleted legacy tag latest\n");
  }

  const versionBody = await buildReleaseBody(
    client,
    plan.currentVersionReleaseToCreate,
    targetCommitish,
    releaseBodyPrefix
  );
  await client.createRelease({
    tagName: plan.currentVersionReleaseToCreate.tagName,
    name: plan.currentVersionReleaseToCreate.name,
    body: versionBody,
    makeLatest: plan.currentVersionReleaseToCreate.makeLatest,
    targetCommitish
  });
  process.stdout.write(`created release ${plan.currentVersionReleaseToCreate.tagName}\n`);

  for (const release of plan.staleVersionReleasesToDelete) {
    await client.deleteRelease(release.id);
    process.stdout.write(`deleted stale release ${release.tagName}\n`);
  }

  for (const tagName of plan.staleVersionTagsToDelete) {
    await client.deleteTag(tagName);
    process.stdout.write(`deleted stale tag ${tagName}\n`);
  }
}

if (require.main === module) {
  syncGitHubReleasesFromEnv().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
