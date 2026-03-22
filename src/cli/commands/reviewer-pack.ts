import {
  buildReviewerPackReport,
  renderReviewerPackResult
} from "../../scanner/scan-project";
import type { ReviewerPackCommandOptions } from "../../types";

export interface RunReviewerPackResult {
  exitCode: number;
  output: string;
}

export function runReviewerPack(
  options: ReviewerPackCommandOptions = {}
): RunReviewerPackResult {
  const report = buildReviewerPackReport(options);
  const output = renderReviewerPackResult(report.reviewerPack, options);

  return {
    exitCode: report.exitCode,
    output
  };
}

