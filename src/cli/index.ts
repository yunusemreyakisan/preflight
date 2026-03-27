import { Command } from "commander";

import { createTranslator, resolveLocaleFromArgv } from "../i18n";
import { PREFLIGHT_VERSION } from "../version";
import { runInit } from "./commands/init";
import { runRules } from "./commands/rules";
import { runScan } from "./commands/scan";

type CommandOptions = {
  config?: string;
  ci?: boolean;
  json?: boolean;
  baseline?: string;
  annotations?: string;
  skipAppStoreConnect?: boolean;
  plain?: boolean;
  strict?: boolean;
  lang?: string;
  update?: boolean;
  output?: string;
  force?: boolean;
};

function printAndSetExitCode(output: string, exitCode: number): void {
  process.stdout.write(`${output}\n`);
  process.exitCode = exitCode;
}

export function buildProgram(argv = process.argv): Command {
  const translator = createTranslator(
    resolveLocaleFromArgv(argv, process.env.PREFLIGHT_LANG)
  );
  const program = new Command();

  program
    .name("preflight")
    .description(translator.t("cli.description"))
    .showHelpAfterError()
    .version(PREFLIGHT_VERSION, "-v, --version", translator.t("cli.option.version"))
    .option("--lang <locale>", translator.t("cli.option.lang"))
    .option("--plain", translator.t("cli.option.plain"));

  program
    .command("scan")
    .description(translator.t("command.scan.description"))
    .option("-c, --config <path>", translator.t("cli.option.config"))
    .option("--ci", translator.t("cli.option.ci"))
    .option("--json", translator.t("cli.option.json"))
    .option("--baseline <path>", translator.t("cli.option.baseline"))
    .option("--annotations <target>", translator.t("cli.option.annotations"))
    .option("--skip-app-store-connect", translator.t("cli.option.skipAppStoreConnect"))
    .option("--strict", translator.t("cli.option.strict"))
    .action(async (options: CommandOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<CommandOptions>();
      const { output, exitCode } = await runScan({
        configPath: options.config,
        ci: options.ci,
        json: options.json,
        baselinePath: options.baseline,
        annotations: options.annotations,
        skipAppStoreConnect: options.skipAppStoreConnect,
        plain: globalOptions.plain,
        strict: options.strict,
        lang: globalOptions.lang,
        checkForUpdates: true
      });
      printAndSetExitCode(output, exitCode);
    });

  program
    .command("rules")
    .description(translator.t("command.rules.description"))
    .option("--update", translator.t("command.rules.option.update"))
    .option("--json", translator.t("cli.option.json"))
    .action((options: CommandOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<CommandOptions>();
      const { output, exitCode } = runRules({
        json: options.json,
        plain: globalOptions.plain,
        update: options.update,
        lang: globalOptions.lang
      });
      printAndSetExitCode(output, exitCode);
    });

  program
    .command("init")
    .description(translator.t("command.init.description"))
    .option("-o, --output <path>", translator.t("cli.option.output"))
    .option("--force", translator.t("cli.option.force"))
    .action((options: CommandOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals<CommandOptions>();
      const { output, exitCode } = runInit({
        outputPath: options.output,
        force: options.force,
        lang: globalOptions.lang
      });
      printAndSetExitCode(output, exitCode);
    });

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  await buildProgram(argv).parseAsync(argv);
}

if (require.main === module) {
  void main().catch((error) => {
    const translator = createTranslator(
      resolveLocaleFromArgv(process.argv, process.env.PREFLIGHT_LANG)
    );
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${translator.t("cli.error.unexpected", { message })}\n`);
    process.exitCode = 2;
  });
}
