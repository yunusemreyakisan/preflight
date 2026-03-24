import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { BaselineComparison, ScanResult, Translator } from "../types";

const baselineReportSchema = z.object({
  scanned_at: z.string().optional(),
  blocking_issues: z.array(z.object({ id: z.string() })).default([]),
  warnings: z.array(z.object({ id: z.string() })).default([]),
  missing_inputs: z.array(z.object({ key: z.string() })).default([])
});

function compareStringSets(current: string[], baseline: string[]): {
  added: string[];
  resolved: string[];
} {
  const currentSet = new Set(current);
  const baselineSet = new Set(baseline);

  return {
    added: [...currentSet].filter((value) => !baselineSet.has(value)).sort(),
    resolved: [...baselineSet].filter((value) => !currentSet.has(value)).sort()
  };
}

function resolveBaselinePath(
  baselinePath: string,
  cwd: string | undefined
): string {
  return path.resolve(cwd ?? process.cwd(), baselinePath);
}

export function compareAgainstBaseline(
  result: ScanResult,
  options: {
    baselinePath: string;
    cwd?: string;
    translator: Translator;
  }
): BaselineComparison {
  const absolutePath = resolveBaselinePath(options.baselinePath, options.cwd);

  let rawBaseline = "";

  try {
    rawBaseline = fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    if (fileError.code === "ENOENT") {
      throw new Error(
        options.translator.t("cli.error.baselineNotFound", {
          path: absolutePath
        })
      );
    }

    throw new Error(
      options.translator.t("cli.error.baselineUnreadable", {
        path: absolutePath
      })
    );
  }

  let parsedBaseline: unknown;

  try {
    parsedBaseline = JSON.parse(rawBaseline);
  } catch {
    throw new Error(
      options.translator.t("cli.error.baselineInvalidJson", {
        path: absolutePath
      })
    );
  }

  const baseline = baselineReportSchema.safeParse(parsedBaseline);

  if (!baseline.success) {
    throw new Error(
      options.translator.t("cli.error.baselineInvalidShape", {
        path: absolutePath
      })
    );
  }

  const blockingIssues = compareStringSets(
    result.blocking_issues.map((issue) => issue.id),
    baseline.data.blocking_issues.map((issue) => issue.id)
  );
  const warnings = compareStringSets(
    result.warnings.map((issue) => issue.id),
    baseline.data.warnings.map((issue) => issue.id)
  );
  const missingInputs = compareStringSets(
    result.missing_inputs.map((input) => input.key),
    baseline.data.missing_inputs.map((input) => input.key)
  );
  const summary = {
    new_items:
      blockingIssues.added.length +
      warnings.added.length +
      missingInputs.added.length,
    resolved_items:
      blockingIssues.resolved.length +
      warnings.resolved.length +
      missingInputs.resolved.length
  };

  return {
    path: absolutePath,
    baseline_scanned_at: baseline.data.scanned_at,
    has_changes: summary.new_items > 0 || summary.resolved_items > 0,
    summary,
    blocking_issues: {
      new_ids: blockingIssues.added,
      resolved_ids: blockingIssues.resolved
    },
    warnings: {
      new_ids: warnings.added,
      resolved_ids: warnings.resolved
    },
    missing_inputs: {
      new_keys: missingInputs.added,
      resolved_keys: missingInputs.resolved
    }
  };
}
