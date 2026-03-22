import { createTranslator, resolveLocale } from "../../i18n";
import { formatRulesJson } from "../../output/format-json";
import { formatRulesTable } from "../../output/format-human";
import { RULE_REGISTRY, RULESET_METADATA } from "../../rules/registry";
import type { RulesCommandOptions } from "../../types";

export interface RunRulesResult {
  exitCode: number;
  output: string;
}

export function runRules(options: RulesCommandOptions = {}): RunRulesResult {
  const translator = createTranslator(resolveLocale(options.lang));

  if (options.json) {
    return {
      exitCode: 0,
      output: formatRulesJson(RULE_REGISTRY, RULESET_METADATA)
    };
  }

  return {
    exitCode: 0,
    output: formatRulesTable(RULE_REGISTRY, translator, {
      includeMetadata: options.update
    })
  };
}

