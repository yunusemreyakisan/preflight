import Table from "cli-table3";
import chalk from "chalk";

import { RULESET_METADATA } from "../rules/registry";
import type {
  Issue,
  ReviewerPackReport,
  RuleDefinition,
  ScanResult,
  Translator
} from "../types";

function divider(): string {
  return chalk.dim("────────────────────────────────────────");
}

function colorizeRisk(level: ScanResult["risk_level"]): string {
  if (level === "HIGH") {
    return chalk.red(level);
  }

  if (level === "MEDIUM") {
    return chalk.yellow(level);
  }

  return chalk.green(level);
}

function formatIssue(issue: Issue): string[] {
  const lines = [
    `${chalk.bold(`[${issue.id}]`)} ${issue.title}`,
    `${chalk.dim("Guideline")}: ${issue.guideline}`,
    `${chalk.dim("Fix")}: ${issue.fix}`
  ];

  if (issue.details && issue.details.length > 0) {
    lines.push(`${chalk.dim("Details")}:`);
    issue.details.forEach((detail) => lines.push(`  - ${detail}`));
  }

  return lines;
}

function formatReviewerPack(
  reviewerPack: ReviewerPackReport,
  translator: Translator
): string[] {
  const lines = [
    `${translator.t("output.reviewerPack.status")}: ${chalk.bold(
      reviewerPack.status === "complete"
        ? translator.t("output.complete")
        : translator.t("output.incomplete")
    )}`
  ];

  reviewerPack.items.forEach((item) => {
    lines.push(
      `${item.status === "pass" ? chalk.green("OK") : chalk.red("FAIL")} ${item.label}${
        item.value ? `: ${item.value}` : ""
      }`
    );
  });

  if (reviewerPack.missing.length > 0) {
    lines.push(`${translator.t("output.reviewerPack.missing")}:`);
    reviewerPack.missing.forEach((item) => lines.push(`- ${item}`));
  }

  if (reviewerPack.notes.length > 0) {
    lines.push(`${translator.t("output.reviewerPack.notes")}:`);
    reviewerPack.notes.forEach((note) => lines.push(`- ${note}`));
  }

  if (reviewerPack.generatedReviewNotesTemplate) {
    lines.push(translator.t("output.reviewerPack.generatedTemplate"));
    lines.push(divider());
    lines.push(reviewerPack.generatedReviewNotesTemplate);
    lines.push(divider());
    lines.push(translator.t("output.reviewerPack.copyInstruction"));
  }

  return lines;
}

export function formatHumanScanReport(
  result: ScanResult,
  translator: Translator,
  options: {
    ci?: boolean;
  } = {}
): string {
  if (options.ci) {
    const lines = [
      `${result.risk_level} (${result.risk_score}/100)${
        result.likely_rejection ? " - likely rejection" : ""
      }`,
      `${translator.t("output.configPath")}: ${result.config_path}`
    ];

    if (result.primary_reason) {
      lines.push(`${translator.t("output.primaryReason")}: ${result.primary_reason}`);
    }

    if (result.blocking_issues.length > 0) {
      lines.push(`${translator.t("output.blockingIssues")}:`);
      result.blocking_issues.forEach((issue) =>
        lines.push(`- [${issue.id}] ${issue.title}: ${issue.fix}`)
      );
    }

    if (result.warnings.length > 0) {
      lines.push(`${translator.t("output.warnings")}:`);
      result.warnings.forEach((issue) =>
        lines.push(`- [${issue.id}] ${issue.title}: ${issue.fix}`)
      );
    }

    lines.push(
      `${translator.t("output.reviewerPack.status")}: ${
        result.reviewer_pack.status === "complete"
          ? translator.t("output.complete")
          : translator.t("output.incomplete")
      }`
    );

    return lines.join("\n");
  }

  const lines = [
    divider(),
    `  ${chalk.bold(translator.t("output.scan.title"))}`,
    divider(),
    "",
    `  ${translator.t("output.riskLevel")}:     ${colorizeRisk(result.risk_level)}`,
    `  ${translator.t("output.riskScore")}:     ${result.risk_score}/100`,
    `  ${translator.t("output.likelyReject")}:  ${
      result.likely_rejection ? translator.t("output.yes") : translator.t("output.no")
    }`,
    `  ${translator.t("output.configPath")}:    ${result.config_path}`,
    `  ${translator.t("output.scannedAt")}:     ${result.scanned_at}`
  ];

  if (result.primary_reason) {
    lines.push(``, `  ${translator.t("output.primaryReason")}: ${result.primary_reason}`);
  }

  lines.push("");

  if (result.blocking_issues.length > 0) {
    lines.push(
      `  ${translator.t("output.blockingIssues")} (${result.blocking_issues.length}):`,
      `  ${divider()}`
    );
    result.blocking_issues.forEach((issue) => {
      formatIssue(issue).forEach((line) => lines.push(`  ${line}`));
      lines.push("");
    });
  }

  if (result.warnings.length > 0) {
    lines.push(`  ${translator.t("output.warnings")} (${result.warnings.length}):`, `  ${divider()}`);
    result.warnings.forEach((issue) => {
      formatIssue(issue).forEach((line) => lines.push(`  ${line}`));
      lines.push("");
    });
  }

  if (result.blocking_issues.length === 0 && result.warnings.length === 0) {
    lines.push(`  ${translator.t("output.issuesNone")}`, "");
  }

  lines.push(`  ${translator.t("output.passed")}: ${translator.t("output.passedSummary", {
    passedCount: result.passed_checks.length,
    ruleCount:
      result.passed_checks.length +
      result.blocking_issues.length +
      result.warnings.length
  })}`);
  lines.push(`  ${result.rule_coverage_note}`);

  if (result.config_warnings.length > 0) {
    lines.push("", `  ${translator.t("output.configWarnings")}:`);
    result.config_warnings.forEach((warning) => lines.push(`  - ${warning}`));
  }

  lines.push("", ...formatReviewerPack(result.reviewer_pack, translator), divider());

  return lines.join("\n");
}

export function formatHumanReviewerPack(
  reviewerPack: ReviewerPackReport,
  translator: Translator
): string {
  return [divider(), `  ${chalk.bold(translator.t("output.reviewerPack.title"))}`, divider(), "", ...formatReviewerPack(reviewerPack, translator), divider()].join("\n");
}

export function formatRulesTable(
  rules: RuleDefinition<any>[],
  translator: Translator,
  options: {
    includeMetadata?: boolean;
  } = {}
): string {
  const lines: string[] = [divider(), `  ${chalk.bold(translator.t("output.rules.title"))}`, divider()];

  if (options.includeMetadata) {
    lines.push(
      `${translator.t("output.rule.version")}: ${RULESET_METADATA.version}`,
      `${translator.t("output.rule.lastVerified")}: ${RULESET_METADATA.lastVerified}`,
      translator.t("output.rule.remoteDeferred"),
      ""
    );
  }

  lines.push(translator.t("output.rule.total", { count: rules.length }), "");

  const table = new Table({
    head: [
      translator.t("output.rule.column.id"),
      translator.t("output.rule.column.category"),
      translator.t("output.rule.column.severity"),
      translator.t("output.rule.column.guideline"),
      translator.t("output.rule.column.lastVerified")
    ]
  });

  rules.forEach((rule) => {
    table.push([
      rule.id,
      translator.t(`category.${rule.category}`),
      translator.t(`severity.${rule.severity}`),
      rule.guideline,
      rule.lastVerified
    ]);
  });

  lines.push(table.toString());

  return lines.join("\n");
}
