import packageJson from "../package.json";

type PackageManifest = {
  name: string;
  version: string;
};

const manifest = packageJson as PackageManifest;

export const PREFLIGHT_PACKAGE_NAME = manifest.name;
export const PREFLIGHT_VERSION = manifest.version;
