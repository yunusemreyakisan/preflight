import type { MissingInput, Issue, ScanResult } from "../types";

type AnnotationLevel = "error" | "warning";

function escapeAnnotationData(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeAnnotationProperty(value: string): string {
  return escapeAnnotationData(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function formatAnnotation(
  level: AnnotationLevel,
  title: string,
  message: string
): string {
  return `::${level} title=${escapeAnnotationProperty(title)}::${escapeAnnotationData(message)}`;
}

function formatIssueAnnotation(level: AnnotationLevel, issue: Issue): string {
  return formatAnnotation(
    level,
    `[${issue.id}] ${issue.title}`,
    `${issue.message} Fix: ${issue.fix}`
  );
}

function formatMissingInputAnnotation(input: MissingInput): string {
  return formatAnnotation(
    "warning",
    `[${input.key}] ${input.label}`,
    input.message
  );
}

export function formatGithubAnnotations(result: ScanResult): string[] {
  return [
    ...result.blocking_issues.map((issue) => formatIssueAnnotation("error", issue)),
    ...result.warnings.map((issue) => formatIssueAnnotation("warning", issue)),
    ...result.missing_inputs.map((input) => formatMissingInputAnnotation(input))
  ];
}
