import { renderScanResult, scanProject } from "../../scanner/scan-project";
import type { ScanCommandOptions, ScanResult } from "../../types";

export interface RunScanResult {
  exitCode: number;
  output: string;
  result: ScanResult;
}

export function runScan(options: ScanCommandOptions = {}): RunScanResult {
  const result = scanProject(options);
  const output = renderScanResult(result, options);

  return {
    exitCode: result.exit_code,
    output,
    result
  };
}

