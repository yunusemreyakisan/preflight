import fs from "node:fs";
import path from "node:path";

import { ZodError } from "zod";

import {
  normalizePreflightConfig,
  preflightConfigSchema,
  type PreflightConfig
} from "./schema";
import type { ConfigWarning, Issue, Translator } from "../types";

const CONFIG_LAST_VERIFIED = "2026-03-23";

export interface LoadedConfigSuccess {
  ok: true;
  config: PreflightConfig;
  configPath: string;
  configDir: string;
  warnings: ConfigWarning[];
}

export interface LoadedConfigFailure {
  ok: false;
  configPath: string;
  issue: Issue;
  warnings: ConfigWarning[];
}

export type LoadedConfigResult = LoadedConfigSuccess | LoadedConfigFailure;

function buildConfigurationIssue(
  translator: Translator,
  id: "CONFIG_001" | "CONFIG_002" | "CONFIG_003" | "CONFIG_004",
  details?: string[]
): Issue {
  return {
    id,
    title: translator.t(`issue.${id}.title`),
    guideline: "Preflight Configuration",
    severity: "high",
    category: "configuration",
    message: translator.t(`issue.${id}.message`),
    fix: translator.t(`issue.${id}.fix`),
    lastVerified: CONFIG_LAST_VERIFIED,
    details
  };
}

function formatZodDetails(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const joinedPath = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${joinedPath}: ${issue.message}`;
  });
}

export function resolveConfigPath(cwd: string, configPath?: string): string {
  return path.resolve(cwd, configPath ?? "preflight.config.json");
}

function localizeWarnings(warnings: ConfigWarning[], translator: Translator): ConfigWarning[] {
  const warningKeyByCode: Record<string, string> = {
    "legacy-flat-aliases": "config.warning.legacyFlatAliases",
    "legacy-nested-shape": "config.warning.legacyNestedShape"
  };

  return warnings.map((warning) => ({
    ...warning,
    message: translator.t(warningKeyByCode[warning.code] ?? "config.warning.legacyNestedShape")
  }));
}

export function loadConfigFromFile(options: {
  cwd?: string;
  configPath?: string;
  translator: Translator;
}): LoadedConfigResult {
  const cwd = options.cwd ?? process.cwd();
  const resolvedPath = resolveConfigPath(cwd, options.configPath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      ok: false,
      configPath: resolvedPath,
      warnings: [],
      issue: buildConfigurationIssue(options.translator, "CONFIG_001")
    };
  }

  let rawContent: string;

  try {
    rawContent = fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    return {
      ok: false,
      configPath: resolvedPath,
      warnings: [],
      issue: buildConfigurationIssue(options.translator, "CONFIG_002", [
        error instanceof Error ? error.message : String(error)
      ])
    };
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawContent);
  } catch (error) {
    return {
      ok: false,
      configPath: resolvedPath,
      warnings: [],
      issue: buildConfigurationIssue(options.translator, "CONFIG_003", [
        error instanceof Error ? error.message : String(error)
      ])
    };
  }

  const normalized = normalizePreflightConfig(parsedJson);
  const localizedWarnings = localizeWarnings(normalized.warnings, options.translator);

  try {
    const config = preflightConfigSchema.parse(normalized.normalized);

    return {
      ok: true,
      config,
      configPath: resolvedPath,
      configDir: path.dirname(resolvedPath),
      warnings: localizedWarnings
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        configPath: resolvedPath,
        warnings: localizedWarnings,
        issue: buildConfigurationIssue(
          options.translator,
          "CONFIG_004",
          formatZodDetails(error)
        )
      };
    }

    return {
      ok: false,
      configPath: resolvedPath,
      warnings: localizedWarnings,
      issue: buildConfigurationIssue(options.translator, "CONFIG_004", [
        error instanceof Error ? error.message : String(error)
      ])
    };
  }
}
