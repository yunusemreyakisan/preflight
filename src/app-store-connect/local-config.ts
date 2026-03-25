import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createPrivateKey } from "node:crypto";
import { createInterface } from "node:readline/promises";

import { z } from "zod";

import type { AppStoreConnectInteractiveRuntime, Translator } from "../types";

export const APP_STORE_CONNECT_API_KEYS_URL =
  "https://appstoreconnect.apple.com/access/integrations/api";

const appStoreConnectLocalConfigSchema = z.object({
  issuerId: z.string().trim().min(1),
  keyId: z.string().trim().min(1),
  privateKeyPath: z.string().trim().min(1),
  appId: z.string().trim().min(1).optional()
});

export type AppStoreConnectLocalConfig = z.infer<
  typeof appStoreConnectLocalConfigSchema
>;

type AppStoreConnectLocalConfigReadResult =
  | {
      status: "missing";
      configPath: string;
    }
  | {
      status: "ok";
      configPath: string;
      config: AppStoreConnectLocalConfig;
    }
  | {
      status: "invalid";
      configPath: string;
      warning: string;
    };

export function resolveAppStoreConnectConfigPath(
  runtime?: AppStoreConnectInteractiveRuntime
): string {
  if (runtime?.configPath) {
    return path.resolve(runtime.configPath);
  }

  return path.join(os.homedir(), ".config", "preflight", "app-store-connect.json");
}

function normalizeConfig(input: unknown): AppStoreConnectLocalConfig {
  return appStoreConnectLocalConfigSchema.parse(input);
}

export function resolveUserInputPath(value: string, cwd: string): string {
  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

export function resolveStoredPrivateKeyPath(
  privateKeyPath: string,
  configPath: string
): string {
  if (path.isAbsolute(privateKeyPath)) {
    return privateKeyPath;
  }

  return path.resolve(path.dirname(configPath), privateKeyPath);
}

export function readAppStoreConnectLocalConfig(options: {
  configPath?: string;
  runtime?: AppStoreConnectInteractiveRuntime;
  translator: Translator;
}): AppStoreConnectLocalConfigReadResult {
  const configPath =
    options.configPath ?? resolveAppStoreConnectConfigPath(options.runtime);

  if (!fs.existsSync(configPath)) {
    return {
      status: "missing",
      configPath
    };
  }

  let raw: string;

  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (error) {
    return {
      status: "invalid",
      configPath,
      warning: options.translator.t("appStoreConnect.warning.localConfigUnreadable", {
        message: error instanceof Error ? error.message : String(error),
        path: configPath
      })
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const config = normalizeConfig(parsed);

    return {
      status: "ok",
      configPath,
      config: {
        ...config,
        privateKeyPath: resolveStoredPrivateKeyPath(config.privateKeyPath, configPath)
      }
    };
  } catch (error) {
    return {
      status: "invalid",
      configPath,
      warning: options.translator.t("appStoreConnect.warning.localConfigInvalid", {
        message: error instanceof Error ? error.message : String(error),
        path: configPath
      })
    };
  }
}

export function writeAppStoreConnectLocalConfig(options: {
  config: AppStoreConnectLocalConfig;
  configPath?: string;
  runtime?: AppStoreConnectInteractiveRuntime;
}): string {
  const configPath =
    options.configPath ?? resolveAppStoreConnectConfigPath(options.runtime);

  fs.mkdirSync(path.dirname(configPath), {
    recursive: true
  });
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(
      {
        ...options.config,
        appId: options.config.appId || undefined
      },
      null,
      2
    )}\n`,
    {
      encoding: "utf8",
      mode: 0o600
    }
  );
  fs.chmodSync(configPath, 0o600);

  return configPath;
}

function defaultOpenUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [command, args] =
      process.platform === "darwin"
        ? ["open", [url]]
        : process.platform === "win32"
          ? ["cmd", ["/c", "start", "", url]]
          : ["xdg-open", [url]];

    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore"
    });

    child.once("error", () => {
      resolve(false);
    });
    child.once("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}

function validatePrivateKeyPath(privateKeyPath: string): void {
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  createPrivateKey(privateKey);
}

function isCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.message === "canceled";
}

export async function runGuidedAppStoreConnectSetup(options: {
  runtime?: AppStoreConnectInteractiveRuntime;
  translator: Translator;
}):
  Promise<
    | {
        ok: true;
        config: AppStoreConnectLocalConfig;
        notes: string[];
      }
    | {
        ok: false;
        warnings: string[];
      }
  > {
  const configPath = resolveAppStoreConnectConfigPath(options.runtime);
  const isInteractive =
    options.runtime?.isInteractive ??
    Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (!isInteractive) {
    return {
      ok: false,
      warnings: [
        options.translator.t("appStoreConnect.warning.setupUnavailableNonInteractive")
      ]
    };
  }

  const openUrl = options.runtime?.openUrl ?? defaultOpenUrl;
  let browserOpened = false;

  try {
    browserOpened = await openUrl(APP_STORE_CONNECT_API_KEYS_URL);
  } catch {
    browserOpened = false;
  }
  const createdReadline = !options.runtime?.prompt;
  const readline = createdReadline
    ? createInterface({
        input: process.stdin,
        output: process.stdout
      })
    : undefined;
  const prompt =
    options.runtime?.prompt ?? ((question: string) => readline!.question(question));
  const intro = options.translator.t(
    browserOpened
      ? "appStoreConnect.prompt.setupIntroOpened"
      : "appStoreConnect.prompt.setupIntroManual",
    {
      path: configPath,
      url: APP_STORE_CONNECT_API_KEYS_URL
    }
  );
  const cwd = options.runtime?.cwd ?? process.cwd();

  try {
    const issuerId = (
      await prompt(
        `${intro}\n${options.translator.t("appStoreConnect.prompt.issuerId")} `
      )
    ).trim();
    const keyId = (
      await prompt(`${options.translator.t("appStoreConnect.prompt.keyId")} `)
    ).trim();
    const privateKeyPathInput = (
      await prompt(
        `${options.translator.t("appStoreConnect.prompt.privateKeyPath")} `
      )
    ).trim();
    const appIdValue = (
      await prompt(`${options.translator.t("appStoreConnect.prompt.appId")} `)
    ).trim();

    if (!issuerId || !keyId || !privateKeyPathInput) {
      return {
        ok: false,
        warnings: [options.translator.t("appStoreConnect.warning.setupIncomplete")]
      };
    }

    const privateKeyPath = resolveUserInputPath(privateKeyPathInput, cwd);

    try {
      validatePrivateKeyPath(privateKeyPath);
    } catch (error) {
      return {
        ok: false,
        warnings: [
          options.translator.t("appStoreConnect.warning.privateKeyUnreadable", {
            message: error instanceof Error ? error.message : String(error)
          })
        ]
      };
    }

    const config: AppStoreConnectLocalConfig = {
      issuerId,
      keyId,
      privateKeyPath,
      ...(appIdValue ? { appId: appIdValue } : {})
    };
    const savedConfigPath = writeAppStoreConnectLocalConfig({
      config,
      configPath,
      runtime: options.runtime
    });

    return {
      ok: true,
      config,
      notes: [
        options.translator.t("appStoreConnect.note.localConfigSaved", {
          path: savedConfigPath
        })
      ]
    };
  } catch (error) {
    return {
      ok: false,
      warnings: [
        options.translator.t(
          isCancellationError(error)
            ? "appStoreConnect.warning.setupCancelled"
            : "appStoreConnect.warning.setupFailed",
          {
            message: error instanceof Error ? error.message : String(error)
          }
        )
      ]
    };
  } finally {
    readline?.close();
  }
}
