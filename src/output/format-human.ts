import Table from "cli-table3";
import chalk from "chalk";

import { RULESET_METADATA } from "../rules/registry";
import type {
  HumanOutputMode,
  Issue,
  ReviewerPackReport,
  RiskLevel,
  RuleCategory,
  RuleDefinition,
  ScanResult,
  Translator
} from "../types";

type StatusTone = "ok" | "warn" | "fail";

type SurfaceRow = {
  label: string;
  status: StatusTone;
};

const SURFACE_CATEGORY_ORDER: RuleCategory[] = [
  "reviewer-access",
  "app-completeness",
  "metadata",
  "privacy",
  "business-iap",
  "content"
];

function resolveHumanOutputMode(options: {
  plain?: boolean;
  outputMode?: HumanOutputMode;
  stdoutIsTTY?: boolean;
  noColor?: boolean;
} = {}): HumanOutputMode {
  if (options.outputMode) {
    return options.outputMode;
  }

  const stdoutIsTTY = options.stdoutIsTTY ?? Boolean(process.stdout.isTTY);
  const noColor = options.noColor ?? Boolean(process.env.NO_COLOR);

  if (options.plain || noColor || !stdoutIsTTY) {
    return "plain";
  }

  return "branded";
}

function colorize(
  mode: HumanOutputMode,
  variant: "brand" | "muted" | "strong" | "ok" | "warn" | "fail",
  value: string
): string {
  if (mode === "plain") {
    return value;
  }

  if (variant === "brand") {
    return chalk.hex("#4FD1FF").bold(value);
  }

  if (variant === "muted") {
    return chalk.hex("#7C93B0")(value);
  }

  if (variant === "strong") {
    return chalk.white.bold(value);
  }

  if (variant === "ok") {
    return chalk.hex("#3FE0A7").bold(value);
  }

  if (variant === "warn") {
    return chalk.hex("#F6C356").bold(value);
  }

  return chalk.hex("#FF7A7A").bold(value);
}

function formatStatusLabel(mode: HumanOutputMode, tone: StatusTone): string {
  if (tone === "ok") {
    return colorize(mode, "ok", "OK");
  }

  if (tone === "warn") {
    return colorize(mode, "warn", "WARN");
  }

  return colorize(mode, "fail", "FAIL");
}

function colorizeRisk(
  mode: HumanOutputMode,
  level: ScanResult["risk_level"]
): string {
  if (level === "HIGH") {
    return colorize(mode, "fail", level);
  }

  if (level === "MEDIUM") {
    return colorize(mode, "warn", level);
  }

  return colorize(mode, "ok", level);
}

function getVerdictKey(level: RiskLevel): string {
  if (level === "HIGH") {
    return "output.verdict.block";
  }

  if (level === "MEDIUM") {
    return "output.verdict.review";
  }

  return "output.verdict.ready";
}

function createDivider(mode: HumanOutputMode): string {
  const divider = "─".repeat(64);
  return mode === "plain" ? divider : colorize(mode, "muted", divider);
}

function padLine(value: string, width = 62): string {
  if (value.length >= width) {
    return value.slice(0, width);
  }

  return `${value}${" ".repeat(width - value.length)}`;
}

function createPanel(
  title: string,
  subtitle: string,
  mode: HumanOutputMode
): string[] {
  const top = `┌${"─".repeat(64)}┐`;
  const bottom = `└${"─".repeat(64)}┘`;
  const titleLine = `│ ${padLine(title)} │`;
  const subtitleLine = `│ ${padLine(subtitle)} │`;

  return [
    colorize(mode, "muted", top),
    colorize(mode, "brand", titleLine),
    colorize(mode, "muted", subtitleLine),
    colorize(mode, "muted", bottom)
  ];
}

function renderLabelValue(
  label: string,
  value: string,
  mode: HumanOutputMode
): string {
  return `  ${colorize(mode, "muted", label.padEnd(16))} ${value}`;
}

function renderStatusRow(
  label: string,
  tone: StatusTone,
  mode: HumanOutputMode
): string {
  const fill = ".".repeat(Math.max(2, 46 - label.length));
  return `  ${label} ${colorize(mode, "muted", fill)} ${formatStatusLabel(mode, tone)}`;
}

function getCategoryTone(
  category: RuleCategory,
  result: Pick<ScanResult, "blocking_issues" | "warnings">
): StatusTone {
  if (result.blocking_issues.some((issue) => issue.category === category)) {
    return "fail";
  }

  if (result.warnings.some((issue) => issue.category === category)) {
    return "warn";
  }

  return "ok";
}

function buildSurfaceRows(
  result: ScanResult,
  translator: Translator
): SurfaceRow[] {
  const rows = SURFACE_CATEGORY_ORDER.map((category) => ({
    label: translator.t(`category.${category}`),
    status: getCategoryTone(category, result)
  }));

  rows.push({
    label: translator.t("output.surface.reviewerPack"),
    status: result.reviewer_pack.status === "complete" ? "ok" : "fail"
  });

  const hasConfigBlocker = result.blocking_issues.some(
    (issue) => issue.category === "configuration"
  );

  rows.push({
    label: translator.t("output.surface.config"),
    status: hasConfigBlocker ? "fail" : result.config_warnings.length > 0 ? "warn" : "ok"
  });

  return rows;
}

function formatIssueBlock(
  issue: Issue,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const tone: StatusTone = issue.severity === "high" ? "fail" : "warn";
  const lines = [
    `  ${formatStatusLabel(mode, tone)} ${colorize(mode, "strong", issue.id)} ${issue.title}`,
    `    ${colorize(mode, "muted", translator.t("output.issue.guideline").padEnd(10))} ${issue.guideline}`,
    `    ${colorize(mode, "muted", translator.t("output.issue.fix").padEnd(10))} ${issue.fix}`
  ];

  if (issue.details && issue.details.length > 0) {
    lines.push(`    ${colorize(mode, "muted", translator.t("output.issue.details"))}`);
    issue.details.forEach((detail) => lines.push(`      - ${detail}`));
  }

  return lines;
}

function formatReviewerPackTemplate(
  reviewerPack: ReviewerPackReport,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = buildReviewerPackRows(reviewerPack, translator, mode);

  if (reviewerPack.missing.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.reviewerPack.missing"))}`);
    reviewerPack.missing.forEach((item) => lines.push(`  - ${item}`));
  }

  if (reviewerPack.notes.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.reviewerPack.notes"))}`);
    reviewerPack.notes.forEach((note) => lines.push(`  - ${note}`));
  }

  if (reviewerPack.generatedReviewNotesTemplate) {
    lines.push(
      "",
      `  ${colorize(mode, "strong", translator.t("output.reviewerPack.generatedTemplate"))}`,
      `  ${createDivider(mode)}`,
      reviewerPack.generatedReviewNotesTemplate,
      `  ${createDivider(mode)}`,
      `  ${colorize(mode, "muted", translator.t("output.reviewerPack.copyInstruction"))}`
    );
  }

  return lines;
}

function buildReviewerPackRows(
  reviewerPack: ReviewerPackReport,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [
    renderStatusRow(
      translator.t("output.reviewerPack.status"),
      reviewerPack.status === "complete" ? "ok" : "fail",
      mode
    )
  ];

  reviewerPack.items.forEach((item) => {
    lines.push(
      renderStatusRow(
        item.value ? `${item.label}: ${item.value}` : item.label,
        item.status === "pass" ? "ok" : "fail",
        mode
      )
    );
  });

  return lines;
}

function formatCiScanReport(
  result: ScanResult,
  translator: Translator
): string {
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

function formatStandardScanReport(
  result: ScanResult,
  translator: Translator,
  mode: HumanOutputMode
): string {
  const lines = [
    ...createPanel(
      "PREFLIGHT",
      translator.t("output.brand.tagline"),
      mode
    ),
    "",
    renderLabelValue(
      translator.t("output.riskLevel"),
      colorizeRisk(mode, result.risk_level),
      mode
    ),
    renderLabelValue(
      translator.t("output.riskScore"),
      colorize(mode, "strong", `${result.risk_score}/100`),
      mode
    ),
    renderLabelValue(
      translator.t("output.likelyReject"),
      result.likely_rejection
        ? colorize(mode, "fail", translator.t("output.yes"))
        : colorize(mode, "ok", translator.t("output.no")),
      mode
    ),
    renderLabelValue(translator.t("output.configPath"), result.config_path, mode),
    renderLabelValue(translator.t("output.scannedAt"), result.scanned_at, mode),
    "",
    `  ${colorize(mode, "strong", translator.t("output.surface.title"))}`
  ];

  buildSurfaceRows(result, translator).forEach((row) => {
    lines.push(renderStatusRow(row.label, row.status, mode));
  });

  if (result.primary_reason) {
    lines.push(
      "",
      `  ${colorize(mode, "strong", translator.t("output.primaryReason"))}`,
      `  ${result.primary_reason}`
    );
  }

  if (result.blocking_issues.length > 0) {
    lines.push(
      "",
      `  ${colorize(mode, "strong", `${translator.t("output.blockingIssues")} (${result.blocking_issues.length})`)}`
    );
    result.blocking_issues.forEach((issue) => {
      lines.push(...formatIssueBlock(issue, translator, mode), "");
    });
  }

  if (result.warnings.length > 0) {
    lines.push(
      "",
      `  ${colorize(mode, "strong", `${translator.t("output.warnings")} (${result.warnings.length})`)}`
    );
    result.warnings.forEach((issue) => {
      lines.push(...formatIssueBlock(issue, translator, mode), "");
    });
  }

  if (result.blocking_issues.length === 0 && result.warnings.length === 0) {
    lines.push("", `  ${translator.t("output.issuesNone")}`);
  }

  const totalChecks =
    result.passed_checks.length +
    result.blocking_issues.length +
    result.warnings.length;

  lines.push(
    "",
    renderLabelValue(
      translator.t("output.passed"),
      translator.t("output.passedSummary", {
        passedCount: result.passed_checks.length,
        ruleCount: totalChecks
      }),
      mode
    ),
    `  ${colorize(mode, "muted", result.rule_coverage_note)}`
  );

  if (result.config_warnings.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.configWarnings"))}`);
    result.config_warnings.forEach((warning) => {
      lines.push(`  - ${warning}`);
    });
  }

  lines.push(
    "",
    `  ${colorize(mode, "strong", translator.t("output.reviewerPack.title"))}`,
    ...formatReviewerPackTemplate(result.reviewer_pack, translator, mode),
    "",
    `  ${colorize(mode, "strong", translator.t("output.verdict"))}`,
    `  ${colorize(mode, result.risk_level === "LOW" ? "ok" : result.risk_level === "MEDIUM" ? "warn" : "fail", translator.t(getVerdictKey(result.risk_level)))}`
  );

  return lines.join("\n");
}

export function formatHumanScanReport(
  result: ScanResult,
  translator: Translator,
  options: {
    ci?: boolean;
    plain?: boolean;
    outputMode?: HumanOutputMode;
  } = {}
): string {
  if (options.ci) {
    return formatCiScanReport(result, translator);
  }

  const mode = resolveHumanOutputMode(options);
  return formatStandardScanReport(result, translator, mode);
}

export function formatHumanReviewerPack(
  reviewerPack: ReviewerPackReport,
  translator: Translator,
  options: {
    plain?: boolean;
    outputMode?: HumanOutputMode;
  } = {}
): string {
  const mode = resolveHumanOutputMode(options);

  return [
    ...createPanel("PREFLIGHT", translator.t("output.brand.tagline"), mode),
    "",
    `  ${colorize(mode, "strong", translator.t("output.reviewerPack.title"))}`,
    ...formatReviewerPackTemplate(reviewerPack, translator, mode),
    "",
    `  ${colorize(mode, "strong", translator.t("output.verdict"))}`,
    `  ${colorize(
      mode,
      reviewerPack.status === "complete" ? "ok" : "fail",
      reviewerPack.status === "complete"
        ? translator.t("output.reviewerPack.complete")
        : translator.t("output.reviewerPack.incomplete")
    )}`
  ].join("\n");
}

export function formatRulesTable(
  rules: RuleDefinition<any>[],
  translator: Translator,
  options: {
    includeMetadata?: boolean;
    plain?: boolean;
    outputMode?: HumanOutputMode;
  } = {}
): string {
  const mode = resolveHumanOutputMode(options);
  const lines: string[] = [
    ...createPanel("PREFLIGHT", translator.t("output.brand.tagline"), mode),
    "",
    `  ${colorize(mode, "strong", translator.t("output.rules.title"))}`
  ];

  if (options.includeMetadata) {
    lines.push(
      renderLabelValue(
        translator.t("output.rule.version"),
        RULESET_METADATA.version,
        mode
      ),
      renderLabelValue(
        translator.t("output.rule.lastVerified"),
        RULESET_METADATA.lastVerified,
        mode
      ),
      `  ${colorize(mode, "muted", translator.t("output.rule.remoteDeferred"))}`,
      ""
    );
  }

  lines.push(renderLabelValue(translator.t("output.rule.total", {
    count: rules.length
  }), "", mode));

  const head = [
    translator.t("output.rule.column.id"),
    translator.t("output.rule.column.category"),
    translator.t("output.rule.column.severity"),
    translator.t("output.rule.column.guideline"),
    translator.t("output.rule.column.lastVerified")
  ].map((value) => colorize(mode, "brand", value));

  const table = new Table({
    head
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
