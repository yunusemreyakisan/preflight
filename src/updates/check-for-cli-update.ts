import { PREFLIGHT_PACKAGE_NAME, PREFLIGHT_VERSION } from "../version";

export interface CliUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  packageName: string;
  updateCommand: string;
}

interface NpmLatestResponse {
  version?: unknown;
}

export interface CliUpdateCheckOptions {
  currentVersion?: string;
  packageName?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function parseSemver(version: string): number[] | undefined {
  const normalized = version.trim().split("-")[0];

  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    return undefined;
  }

  return normalized.split(".").map((segment) => Number.parseInt(segment, 10));
}

export function isVersionNewer(candidate: string, current: string): boolean {
  const candidateParts = parseSemver(candidate);
  const currentParts = parseSemver(current);

  if (!candidateParts || !currentParts) {
    return false;
  }

  for (let index = 0; index < Math.max(candidateParts.length, currentParts.length); index += 1) {
    const candidateValue = candidateParts[index] ?? 0;
    const currentValue = currentParts[index] ?? 0;

    if (candidateValue > currentValue) {
      return true;
    }

    if (candidateValue < currentValue) {
      return false;
    }
  }

  return false;
}

function buildLatestMetadataUrl(packageName: string): string {
  return `https://registry.npmjs.org/${packageName.replace("/", "%2F")}/latest`;
}

export async function checkForCliUpdate(
  options: CliUpdateCheckOptions = {}
): Promise<CliUpdateInfo | undefined> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    return undefined;
  }

  const currentVersion = options.currentVersion ?? PREFLIGHT_VERSION;
  const packageName = options.packageName ?? PREFLIGHT_PACKAGE_NAME;
  const controller = typeof AbortController === "function" ? new AbortController() : undefined;
  const timeoutHandle = setTimeout(() => controller?.abort(), options.timeoutMs ?? 1500);

  timeoutHandle.unref?.();

  try {
    const response = await fetchImpl(buildLatestMetadataUrl(packageName), {
      headers: {
        accept: "application/json"
      },
      signal: controller?.signal
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as NpmLatestResponse;
    const latestVersion =
      typeof payload.version === "string" ? payload.version.trim() : undefined;

    if (!latestVersion || !isVersionNewer(latestVersion, currentVersion)) {
      return undefined;
    }

    return {
      currentVersion,
      latestVersion,
      packageName,
      updateCommand: `npm install -g ${packageName}@${latestVersion}`
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
