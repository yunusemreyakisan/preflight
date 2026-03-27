import Table from "cli-table3";
import chalk from "chalk";

import { RULESET_METADATA } from "../rules/registry";
import type {
  AppStoreConnectComparisonStatus,
  AppStoreConnectReport,
  BaselineComparison,
  HumanOutputMode,
  Issue,
  MissingInput,
  NextStep,
  NextStepPriority,
  ReviewReadinessReport,
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
  const label =
    mode === "plain"
      ? tone === "ok"
        ? "OK"
        : tone === "warn"
          ? "WARN"
          : "FAIL"
      : tone === "ok"
        ? "✅ OK"
        : tone === "warn"
          ? "⚠️ WARN"
          : "🛑 FAIL";

  if (tone === "ok") {
    return colorize(mode, "ok", label);
  }

  if (tone === "warn") {
    return colorize(mode, "warn", label);
  }

  return colorize(mode, "fail", label);
}

function colorizeRisk(
  mode: HumanOutputMode,
  level: ScanResult["risk_level"]
): string {
  const label =
    mode === "plain"
      ? level
      : level === "HIGH"
        ? `🔴 ${level}`
        : level === "MEDIUM"
          ? `🟠 ${level}`
          : `🟢 ${level}`;

  if (level === "HIGH") {
    return colorize(mode, "fail", label);
  }

  if (level === "MEDIUM") {
    return colorize(mode, "warn", label);
  }

  return colorize(mode, "ok", label);
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

function renderSectionTitle(
  label: string,
  mode: HumanOutputMode,
  icon?: string
): string {
  if (mode === "plain" || !icon) {
    return `  ${colorize(mode, "strong", label)}`;
  }

  return `  ${colorize(mode, "brand", icon)} ${colorize(mode, "strong", label)}`;
}

function renderToneLine(
  text: string,
  tone: StatusTone,
  mode: HumanOutputMode,
  icon?: string
): string {
  if (mode === "plain" || !icon) {
    return `  ${colorize(mode, tone, text)}`;
  }

  return `  ${colorize(mode, tone, icon)} ${colorize(mode, tone, text)}`;
}

function renderVerdictLine(
  level: RiskLevel,
  translator: Translator,
  mode: HumanOutputMode
): string {
  const text = translator.t(getVerdictKey(level));
  const tone: StatusTone =
    level === "LOW" ? "ok" : level === "MEDIUM" ? "warn" : "fail";
  const icon = level === "LOW" ? "🚀" : level === "MEDIUM" ? "👀" : "🛑";
  return renderToneLine(text, tone, mode, icon);
}

function getNextStepPriorityTone(priority: NextStepPriority): StatusTone {
  if (priority === "now") {
    return "fail";
  }

  if (priority === "soon") {
    return "warn";
  }

  return "ok";
}

function formatNextStepPriorityLabel(
  priority: NextStepPriority,
  translator: Translator,
  mode: HumanOutputMode
): string {
  const label = translator.t(`output.nextSteps.priority.${priority}`);

  if (mode === "plain") {
    return label;
  }

  if (priority === "now") {
    return colorize(mode, "fail", `🔥 ${label}`);
  }

  if (priority === "soon") {
    return colorize(mode, "warn", `⏭️ ${label}`);
  }

  return colorize(mode, "ok", `💡 ${label}`);
}

function formatNextStepBlock(
  step: NextStep,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [
    `  ${formatNextStepPriorityLabel(step.priority, translator, mode)} ${colorize(
      mode,
      "strong",
      step.title
    )}`,
    `    ${colorize(mode, getNextStepPriorityTone(step.priority), step.detail)}`
  ];

  if (step.related_issue_ids && step.related_issue_ids.length > 0) {
    lines.push(
      `    ${colorize(mode, "muted", translator.t("output.nextSteps.relatedIssues"))} ${step.related_issue_ids.join(", ")}`
    );
  }

  if (step.config_paths && step.config_paths.length > 0) {
    lines.push(
      `    ${colorize(mode, "muted", translator.t("output.nextSteps.paths"))} ${step.config_paths.join(", ")}`
    );
  }

  if (step.suggested_value) {
    lines.push(
      `    ${colorize(mode, "muted", translator.t("output.nextSteps.suggestedValue"))}`
    );
    step.suggested_value
      .split("\n")
      .forEach((line) => lines.push(`      ${line}`));
  }

  return lines;
}

function formatNextStepsSection(
  result: ScanResult,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [renderSectionTitle(translator.t("output.nextSteps"), mode, "🪜")];

  if (result.next_steps.length === 0) {
    lines.push(`  ${colorize(mode, "muted", translator.t("output.nextSteps.none"))}`);
    return lines;
  }

  result.next_steps.forEach((step) => {
    lines.push(...formatNextStepBlock(step, translator, mode), "");
  });

  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
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
  const hasDiscoveryBlocker = result.blocking_issues.some(
    (issue) => issue.id === "DISCOVERY_001"
  );
  const rows = SURFACE_CATEGORY_ORDER.map((category) => ({
    label: translator.t(`category.${category}`),
    status: getCategoryTone(category, result)
  }));

  rows.push({
    label: translator.t("output.surface.reviewerPack"),
    status: result.review_readiness.status === "complete" ? "ok" : "fail"
  });

  rows.push({
    label: translator.t("output.surface.appStoreConnect"),
    status:
      result.app_store_connect.status !== "connected"
        ? "warn"
        : result.app_store_connect.summary.value_mismatches > 0 ||
            result.app_store_connect.summary.value_remote_only > 0 ||
            result.app_store_connect.summary.value_local_only > 0 ||
            result.app_store_connect.summary.screenshot_mismatches > 0 ||
            result.app_store_connect.summary.screenshot_remote_only > 0 ||
            result.app_store_connect.summary.screenshot_local_only > 0 ||
            result.app_store_connect.summary.iap_mismatches > 0 ||
            result.app_store_connect.summary.iap_remote_only > 0 ||
            result.app_store_connect.summary.iap_local_only > 0
          ? "warn"
          : "ok"
  });

  rows.push({
    label: translator.t("output.surface.discovery"),
    status:
      result.discovery.project_type === "unknown" && hasDiscoveryBlocker
        ? "fail"
        : result.discovery.project_type === "unknown" || result.discovery.warnings.length > 0
          ? "warn"
          : "ok"
  });

  rows.push({
    label: translator.t("output.surface.missingInputs"),
    status: result.missing_inputs.length > 0 ? "warn" : "ok"
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

function formatSourceLabel(
  source:
    | "config"
    | "discovered"
    | "app-store-connect"
    | "default"
    | "missing"
    | undefined,
  translator: Translator,
  mode: HumanOutputMode
): string {
  if (!source) {
    return "";
  }

  return ` ${colorize(mode, "muted", `[${translator.t(`output.source.${source}`)}]`)}`;
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

function formatDiscoverySection(
  result: ScanResult,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [
    renderSectionTitle(translator.t("output.discovery.title"), mode, "🛰️"),
    renderLabelValue(
      translator.t("output.discovery.projectType"),
      translator.t(`projectType.${result.discovery.project_type}`),
      mode
    ),
    renderLabelValue(
      translator.t("output.discovery.projectRoot"),
      result.discovery.project_root,
      mode
    )
  ];

  if (result.discovery.ios_root) {
    lines.push(
      renderLabelValue(
        translator.t("output.discovery.iosRoot"),
        result.discovery.ios_root,
        mode
      )
    );
  }

  if (result.discovery.sources.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.discovery.sources"))}`);
    result.discovery.sources.forEach((source) => {
      lines.push(`  - ${source}`);
    });
  }

  if (result.discovery.evidence.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.discovery.evidence"))}`);
    result.discovery.evidence.forEach((entry) => {
      const value = entry.value ? ` = ${entry.value}` : "";
      const detail = entry.detail ? ` (${entry.detail})` : "";
      lines.push(`  - ${entry.key}${value}${formatSourceLabel("discovered", translator, mode)}`);
      lines.push(`    ${colorize(mode, "muted", entry.source)}${detail}`);
    });
  }

  if (result.discovery.warnings.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.discovery.warnings"))}`);
    result.discovery.warnings.forEach((warning) => {
      lines.push(`  - ${warning}`);
    });
  }

  return lines;
}

function formatMissingInputBlock(
  input: MissingInput,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  return [
    `  ${formatStatusLabel(mode, "warn")} ${colorize(mode, "strong", input.label)}`,
    `    ${colorize(mode, "muted", translator.t("output.issue.details"))} ${input.message}`,
    `    ${colorize(mode, "muted", translator.t("output.rule.column.category"))} ${translator.t(
      `category.${input.category}`
    )}`,
    `    ${colorize(mode, "muted", translator.t("output.rule.column.severity"))} ${translator.t(
      `severity.${input.severity}`
    )}`
  ];
}

function getComparisonTone(
  status: AppStoreConnectComparisonStatus
): StatusTone {
  return status === "match" ? "ok" : "warn";
}

function formatComparisonStatus(
  status: AppStoreConnectComparisonStatus,
  translator: Translator
): string {
  if (status === "match") {
    return translator.t("output.appStoreConnect.status.match");
  }

  if (status === "mismatch") {
    return translator.t("output.appStoreConnect.status.mismatch");
  }

  if (status === "remote-only") {
    return translator.t("output.appStoreConnect.status.remoteOnly");
  }

  return translator.t("output.appStoreConnect.status.localOnly");
}

function formatReviewReadinessTemplate(
  reviewReadiness: ReviewReadinessReport,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = buildReviewReadinessRows(reviewReadiness, translator, mode);

  if (reviewReadiness.missing.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.reviewerPack.missing"))}`);
    reviewReadiness.missing.forEach((item) => lines.push(`  - ${item}`));
  }

  if (reviewReadiness.notes.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.reviewerPack.notes"))}`);
    reviewReadiness.notes.forEach((note) => lines.push(`  - ${note}`));
  }

  if (reviewReadiness.suggestedReviewNotes) {
    lines.push(
      "",
      `  ${colorize(mode, "strong", translator.t("output.reviewerPack.generatedTemplate"))}`,
      `  ${createDivider(mode)}`,
      reviewReadiness.suggestedReviewNotes,
      `  ${createDivider(mode)}`,
      `  ${colorize(mode, "muted", translator.t("output.reviewerPack.copyInstruction"))}`
    );
  }

  return lines;
}

function formatBaselineValueList(
  values: string[],
  translator: Translator
): string {
  return values.length > 0 ? values.join(", ") : translator.t("output.none");
}

function formatBaselineSection(
  baseline: BaselineComparison,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [
    renderSectionTitle(translator.t("output.baseline.title"), mode, "📈"),
    renderLabelValue(
      translator.t("output.baseline.comparedAgainst"),
      baseline.path,
      mode
    ),
    renderLabelValue(
      translator.t("output.baseline.new"),
      String(baseline.summary.new_items),
      mode
    ),
    renderLabelValue(
      translator.t("output.baseline.resolved"),
      String(baseline.summary.resolved_items),
      mode
    )
  ];

  if (baseline.baseline_scanned_at) {
    lines.splice(
      2,
      0,
      renderLabelValue(
        translator.t("output.baseline.scannedAt"),
        baseline.baseline_scanned_at,
        mode
      )
    );
  }

  if (!baseline.has_changes) {
    lines.push(`  ${colorize(mode, "muted", translator.t("output.baseline.noChanges"))}`);
    return lines;
  }

  const diffRows: Array<[label: string, values: string[]]> = [
    [
      translator.t("output.baseline.blockingIssuesNew"),
      baseline.blocking_issues.new_ids
    ],
    [
      translator.t("output.baseline.blockingIssuesResolved"),
      baseline.blocking_issues.resolved_ids
    ],
    [
      translator.t("output.baseline.warningsNew"),
      baseline.warnings.new_ids
    ],
    [
      translator.t("output.baseline.warningsResolved"),
      baseline.warnings.resolved_ids
    ],
    [
      translator.t("output.baseline.missingInputsNew"),
      baseline.missing_inputs.new_keys
    ],
    [
      translator.t("output.baseline.missingInputsResolved"),
      baseline.missing_inputs.resolved_keys
    ]
  ];

  diffRows
    .filter(([, values]) => values.length > 0)
    .forEach(([label, values]) => {
      lines.push(
        renderLabelValue(label, formatBaselineValueList(values, translator), mode)
      );
    });

  return lines;
}

function buildReviewReadinessRows(
  reviewReadiness: ReviewReadinessReport,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [
    renderStatusRow(
      translator.t("output.reviewerPack.status"),
      reviewReadiness.status === "complete" ? "ok" : "fail",
      mode
    )
  ];

  reviewReadiness.items.forEach((item) => {
    const sourceLabel = formatSourceLabel(item.source, translator, mode);

    lines.push(
      renderStatusRow(
        item.value ? `${item.label}${sourceLabel}: ${item.value}` : `${item.label}${sourceLabel}`,
        item.status === "pass" ? "ok" : "fail",
        mode
      )
    );
  });

  return lines;
}

function formatAppStoreConnectSection(
  report: AppStoreConnectReport,
  translator: Translator,
  mode: HumanOutputMode
): string[] {
  const lines = [
    renderStatusRow(
      translator.t("output.appStoreConnect.statusLabel"),
      report.status === "connected" ? "ok" : "warn",
      mode
    ),
    renderLabelValue(
      translator.t("output.appStoreConnect.connection"),
      translator.t(`output.appStoreConnect.connection.${report.status}`),
      mode
    )
  ];

  if (report.bundle_id) {
    lines.push(
      renderLabelValue(
        translator.t("output.appStoreConnect.bundleId"),
        report.bundle_id,
        mode
      )
    );
  }

  if (report.app_id) {
    lines.push(
      renderLabelValue(translator.t("output.appStoreConnect.appId"), report.app_id, mode)
    );
  }

  if (report.version_string || report.version_state) {
    const details = [
      report.version_string,
      report.version_state ? `[${report.version_state}]` : undefined,
      report.version_source
        ? translator.t(`output.appStoreConnect.versionSource.${report.version_source}`)
        : undefined
    ]
      .filter(Boolean)
      .join(" ");

    lines.push(
      renderLabelValue(translator.t("output.appStoreConnect.version"), details, mode)
    );
  }

  if (report.available_territories.length > 0) {
    lines.push(
      renderLabelValue(
        translator.t("output.appStoreConnect.territories"),
        report.available_territories.join(", "),
        mode
      )
    );
  }

  if (report.has_app_price_schedule !== undefined) {
    lines.push(
      renderLabelValue(
        translator.t("output.appStoreConnect.appPriceSchedule"),
        report.has_app_price_schedule
          ? translator.t("output.yes")
          : translator.t("output.no"),
        mode
      )
    );
  }

  if (report.review_attachment_count !== undefined) {
    lines.push(
      renderLabelValue(
        translator.t("output.appStoreConnect.reviewAttachments"),
        String(report.review_attachment_count),
        mode
      )
    );
  }

  lines.push(
    renderLabelValue(
      translator.t("output.appStoreConnect.summary"),
      [
        `${report.summary.value_mismatches + report.summary.value_remote_only + report.summary.value_local_only} ${translator.t("output.appStoreConnect.summary.values")}`,
        `${report.summary.screenshot_mismatches + report.summary.screenshot_remote_only + report.summary.screenshot_local_only} ${translator.t("output.appStoreConnect.summary.screenshots")}`,
        `${report.summary.iap_mismatches + report.summary.iap_remote_only + report.summary.iap_local_only} ${translator.t("output.appStoreConnect.summary.iaps")}`
      ].join(" / "),
      mode
    )
  );

  if (report.value_checks.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.appStoreConnect.valueChecks"))}`);
    report.value_checks.forEach((check) => {
      lines.push(
        `  ${formatStatusLabel(mode, getComparisonTone(check.status))} ${check.label}: ${formatComparisonStatus(check.status, translator)}`
      );

      if (check.local_value) {
        lines.push(`    ${colorize(mode, "muted", "local")} ${check.local_value}`);
      }

      if (check.remote_value) {
        lines.push(`    ${colorize(mode, "muted", "remote")} ${check.remote_value}`);
      }
    });
  }

  if (report.screenshot_checks.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.appStoreConnect.screenshotChecks"))}`);
    report.screenshot_checks.forEach((check) => {
      lines.push(
        `  ${formatStatusLabel(mode, getComparisonTone(check.status))} ${check.locale} / ${check.device_type}: ${check.local_count} local vs ${check.remote_count} remote`
      );
    });
  }

  if (report.iap_checks.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.appStoreConnect.iapChecks"))}`);
    report.iap_checks.forEach((check) => {
      const schedule = check.has_price_schedule
        ? translator.t("output.yes")
        : check.has_price_schedule === false
          ? translator.t("output.no")
          : "-";

      lines.push(
        `  ${formatStatusLabel(mode, getComparisonTone(check.status))} ${check.product_id}: ${formatComparisonStatus(check.status, translator)}`
      );

      if (check.local_display_name || check.remote_display_name || check.remote_state) {
        lines.push(
          `    ${colorize(mode, "muted", "local")} ${check.local_display_name ?? "-"}`
        );
        lines.push(
          `    ${colorize(mode, "muted", "remote")} ${check.remote_display_name ?? "-"} ${check.remote_state ? `[${check.remote_state}]` : ""}`.trim()
        );
        lines.push(
          `    ${colorize(mode, "muted", translator.t("output.appStoreConnect.priceSchedule"))} ${schedule}`
        );
      }
    });
  }

  if (report.warnings.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.appStoreConnect.warnings"))}`);
    report.warnings.forEach((warning) => lines.push(`  - ${warning}`));
  }

  if (report.notes.length > 0) {
    lines.push("", `  ${colorize(mode, "strong", translator.t("output.appStoreConnect.notes"))}`);
    report.notes.forEach((note) => lines.push(`  - ${note}`));
  }

  if (report.missing_env.length > 0) {
    lines.push(
      "",
      renderLabelValue(
        translator.t("output.appStoreConnect.missingEnv"),
        report.missing_env.join(", "),
        mode
      )
    );
  }

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
    `${translator.t("output.discovery.projectType")}: ${translator.t(
      `projectType.${result.discovery.project_type}`
    )}`
  );

  if (result.missing_inputs.length > 0) {
    lines.push(`${translator.t("output.missingInputs.title")}:`);
    result.missing_inputs.forEach((input) =>
      lines.push(`- [${translator.t(`severity.${input.severity}`)}] ${input.label}: ${input.message}`)
    );
  }

  lines.push(
    `${translator.t("output.reviewerPack.status")}: ${
      result.review_readiness.status === "complete"
        ? translator.t("output.complete")
        : translator.t("output.incomplete")
    }`
  );

  lines.push(
    `${translator.t("output.appStoreConnect.statusLabel")}: ${translator.t(
      `output.appStoreConnect.connection.${result.app_store_connect.status}`
    )}`
  );

  if (result.app_store_connect.warnings.length > 0) {
    lines.push(`${translator.t("output.appStoreConnect.warnings")}:`);
    result.app_store_connect.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  if (result.app_store_connect.notes.length > 0) {
    lines.push(`${translator.t("output.appStoreConnect.notes")}:`);
    result.app_store_connect.notes.forEach((note) => lines.push(`- ${note}`));
  }

  if (result.app_store_connect.missing_env.length > 0) {
    lines.push(
      `${translator.t("output.appStoreConnect.missingEnv")}: ${result.app_store_connect.missing_env.join(", ")}`
    );
  }

  if (result.baseline) {
    lines.push(
      `${translator.t("output.baseline.title")}: ${translator.t("output.baseline.summaryLine", {
        newCount: result.baseline.summary.new_items,
        resolvedCount: result.baseline.summary.resolved_items
      })}`,
      `${translator.t("output.baseline.comparedAgainst")}: ${result.baseline.path}`
    );

    if (result.baseline.baseline_scanned_at) {
      lines.push(
        `${translator.t("output.baseline.scannedAt")}: ${result.baseline.baseline_scanned_at}`
      );
    }

    if (!result.baseline.has_changes) {
      lines.push(translator.t("output.baseline.noChanges"));
    } else {
      const diffLines: Array<[label: string, values: string[]]> = [
        [
          translator.t("output.baseline.blockingIssuesNew"),
          result.baseline.blocking_issues.new_ids
        ],
        [
          translator.t("output.baseline.blockingIssuesResolved"),
          result.baseline.blocking_issues.resolved_ids
        ],
        [translator.t("output.baseline.warningsNew"), result.baseline.warnings.new_ids],
        [
          translator.t("output.baseline.warningsResolved"),
          result.baseline.warnings.resolved_ids
        ],
        [
          translator.t("output.baseline.missingInputsNew"),
          result.baseline.missing_inputs.new_keys
        ],
        [
          translator.t("output.baseline.missingInputsResolved"),
          result.baseline.missing_inputs.resolved_keys
        ]
      ];

      diffLines
        .filter(([, values]) => values.length > 0)
        .forEach(([label, values]) =>
          lines.push(`${label}: ${formatBaselineValueList(values, translator)}`)
        );
    }
  }

  if (result.next_steps.length > 0) {
    lines.push(`${translator.t("output.nextSteps")}:`);
    result.next_steps.slice(0, 3).forEach((step) => {
      lines.push(
        `- [${translator.t(`output.nextSteps.priority.${step.priority}`)}] ${step.title}: ${step.detail}`
      );
    });

    if (result.next_steps.length > 3) {
      lines.push(
        translator.t("output.nextSteps.more", {
          count: result.next_steps.length - 3
        })
      );
    }
  }

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
    renderSectionTitle(translator.t("output.surface.title"), mode, "🧭")
  ];

  buildSurfaceRows(result, translator).forEach((row) => {
    lines.push(renderStatusRow(row.label, row.status, mode));
  });

  if (result.primary_reason) {
    lines.push(
      "",
      renderSectionTitle(translator.t("output.primaryReason"), mode, "🎯"),
      `  ${result.primary_reason}`
    );
  }

  lines.push("", ...formatDiscoverySection(result, translator, mode));

  if (result.blocking_issues.length > 0) {
    lines.push(
      "",
      renderSectionTitle(
        `${translator.t("output.blockingIssues")} (${result.blocking_issues.length})`,
        mode,
        "🚫"
      )
    );
    result.blocking_issues.forEach((issue) => {
      lines.push(...formatIssueBlock(issue, translator, mode), "");
    });
  }

  if (result.warnings.length > 0) {
    lines.push(
      "",
      renderSectionTitle(
        `${translator.t("output.warnings")} (${result.warnings.length})`,
        mode,
        "⚠️"
      )
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
    lines.push("", renderSectionTitle(translator.t("output.configWarnings"), mode, "🛠️"));
    result.config_warnings.forEach((warning) => {
      lines.push(`  - ${warning}`);
    });
  }

  if (result.missing_inputs.length > 0) {
    lines.push(
      "",
      renderSectionTitle(
        `${translator.t("output.missingInputs.title")} (${result.missing_inputs.length})`,
        mode,
        "📝"
      )
    );
    result.missing_inputs.forEach((missingInput) => {
      lines.push(...formatMissingInputBlock(missingInput, translator, mode), "");
    });
  }

  if (result.baseline) {
    lines.push("", ...formatBaselineSection(result.baseline, translator, mode));
  }

  lines.push(
    "",
    renderSectionTitle(translator.t("output.reviewerPack.title"), mode, "🧾"),
    ...formatReviewReadinessTemplate(result.review_readiness, translator, mode),
    "",
    renderSectionTitle(translator.t("output.appStoreConnect.title"), mode, "🔌"),
    ...formatAppStoreConnectSection(result.app_store_connect, translator, mode),
    "",
    renderSectionTitle(translator.t("output.verdict"), mode, "🏁"),
    renderVerdictLine(result.risk_level, translator, mode),
    "",
    ...formatNextStepsSection(result, translator, mode)
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

export function formatHumanReviewReadiness(
  reviewReadiness: ReviewReadinessReport,
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
    renderSectionTitle(translator.t("output.reviewerPack.title"), mode, "🧾"),
    ...formatReviewReadinessTemplate(reviewReadiness, translator, mode),
    "",
    renderSectionTitle(translator.t("output.verdict"), mode, "🏁"),
    reviewReadiness.status === "complete"
      ? renderToneLine(
          translator.t("output.reviewerPack.complete"),
          "ok",
          mode,
          "✅"
        )
      : renderToneLine(
          translator.t("output.reviewerPack.incomplete"),
          "fail",
          mode,
          "🛑"
        )
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
    renderSectionTitle(translator.t("output.rules.title"), mode, "📚")
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
