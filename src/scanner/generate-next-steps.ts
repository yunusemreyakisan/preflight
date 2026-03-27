import type {
  Issue,
  MissingInput,
  NextStep,
  NextStepKind,
  NextStepPriority,
  ScanResult,
  Translator
} from "../types";

type MissingInputMetadata = {
  configPaths: string[];
  suggestedValue?: (result: ScanResult, translator: Translator) => string | undefined;
};

const priorityOrder: Record<NextStepPriority, number> = {
  now: 0,
  soon: 1,
  later: 2
};

const kindOrder: Record<NextStepKind, number> = {
  "missing-input": 0,
  "issue-fix": 1,
  "app-store-connect-followup": 2,
  "config-followup": 3
};

const missingInputMetadata: Record<string, MissingInputMetadata> = {
  "review.demoAccount": {
    configPaths: ["review.demoAccount.username", "review.demoAccount.password"],
    suggestedValue: (_result, translator) => translator.t("nextStep.suggested.demoAccount")
  },
  "review.notes": {
    configPaths: ["review.notes"],
    suggestedValue: (result) => result.review_readiness.suggestedReviewNotes
  },
  "review.loginInstructions": {
    configPaths: ["review.loginInstructions"],
    suggestedValue: (_result, translator) => translator.t("template.init.loginInstructions")
  },
  "review.contact": {
    configPaths: ["review.contact.name", "review.contact.email"],
    suggestedValue: (_result, translator) => translator.t("nextStep.suggested.contact")
  }
};

const issueMissingInputOverlap: Record<string, string[]> = {
  REVIEWER_001: ["review.demoAccount"],
  REVIEWER_002: ["review.demoAccount"],
  REVIEWER_003: ["review.loginInstructions", "review.notes"],
  REVIEWER_004: ["review.contact"]
};

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function sortNextSteps(steps: NextStep[]): NextStep[] {
  return [...steps].sort((left, right) => {
    return (
      priorityOrder[left.priority] - priorityOrder[right.priority] ||
      kindOrder[left.kind] - kindOrder[right.kind] ||
      left.id.localeCompare(right.id)
    );
  });
}

function buildMissingInputStep(
  input: MissingInput,
  result: ScanResult,
  translator: Translator
): NextStep {
  const metadata = missingInputMetadata[input.key];

  return {
    id: `missing-input:${input.key}`,
    title: translator.t("nextStep.complete.title", {
      label: input.label
    }),
    detail: input.message,
    priority: "now",
    kind: "missing-input",
    config_paths: metadata?.configPaths ?? [input.key],
    suggested_value: normalizeText(metadata?.suggestedValue?.(result, translator))
  };
}

function buildIssueStep(
  issue: Issue,
  priority: NextStepPriority,
  translator: Translator
): NextStep {
  return {
    id: `issue-fix:${issue.id}`,
    title: translator.t("nextStep.issueFix.title", {
      issueId: issue.id
    }),
    detail: `${issue.title}. ${issue.fix}`,
    priority,
    kind: "issue-fix",
    related_issue_ids: [issue.id],
    suggested_value: normalizeText(issue.autoFixTemplate)
  };
}

function buildConfigWarningStep(
  warnings: string[],
  translator: Translator
): NextStep | undefined {
  if (warnings.length === 0) {
    return undefined;
  }

  return {
    id: "config-followup:warnings",
    title: translator.t("nextStep.config.title"),
    detail: warnings.join(" "),
    priority: "later",
    kind: "config-followup"
  };
}

function buildAppStoreConnectSetupStep(
  result: ScanResult,
  translator: Translator
): NextStep | undefined {
  if (result.app_store_connect.status === "connected") {
    return undefined;
  }

  const needsFollowup =
    result.app_store_connect.missing_env.length > 0 ||
    result.app_store_connect.warnings.length > 0;

  if (!needsFollowup) {
    return undefined;
  }

  const detailParts = [
    normalizeText(
      result.app_store_connect.warnings[0] ?? result.app_store_connect.notes[0]
    ),
    result.app_store_connect.missing_env.length > 0
      ? translator.t("nextStep.appStoreConnect.setup.env", {
          missingEnv: result.app_store_connect.missing_env.join(", ")
        })
      : undefined
  ].filter(Boolean);

  return {
    id: "app-store-connect-followup:setup",
    title: translator.t("nextStep.appStoreConnect.setup.title"),
    detail: detailParts.join(" "),
    priority: "soon",
    kind: "app-store-connect-followup"
  };
}

function countAppStoreConnectDrift(result: ScanResult): {
  iapCount: number;
  screenshotCount: number;
  total: number;
  valueCount: number;
} {
  const valueCount =
    result.app_store_connect.summary.value_mismatches +
    result.app_store_connect.summary.value_remote_only +
    result.app_store_connect.summary.value_local_only;
  const screenshotCount =
    result.app_store_connect.summary.screenshot_mismatches +
    result.app_store_connect.summary.screenshot_remote_only +
    result.app_store_connect.summary.screenshot_local_only;
  const iapCount =
    result.app_store_connect.summary.iap_mismatches +
    result.app_store_connect.summary.iap_remote_only +
    result.app_store_connect.summary.iap_local_only;

  return {
    valueCount,
    screenshotCount,
    iapCount,
    total: valueCount + screenshotCount + iapCount
  };
}

function buildAppStoreConnectConnectedStep(
  result: ScanResult,
  translator: Translator
): NextStep | undefined {
  if (result.app_store_connect.status !== "connected") {
    return undefined;
  }

  const drift = countAppStoreConnectDrift(result);

  if (drift.total > 0) {
    return {
      id: "app-store-connect-followup:drift",
      title: translator.t("nextStep.appStoreConnect.drift.title"),
      detail: translator.t("nextStep.appStoreConnect.drift.detail", {
        iapCount: drift.iapCount,
        screenshotCount: drift.screenshotCount,
        valueCount: drift.valueCount
      }),
      priority: "soon",
      kind: "app-store-connect-followup"
    };
  }

  if (result.app_store_connect.warnings.length > 0) {
    return {
      id: "app-store-connect-followup:warnings",
      title: translator.t("nextStep.appStoreConnect.warnings.title"),
      detail: result.app_store_connect.warnings.join(" "),
      priority: "soon",
      kind: "app-store-connect-followup"
    };
  }

  return undefined;
}

function shouldSkipIssueStep(
  issue: Issue,
  missingInputKeys: Set<string>
): boolean {
  const overlaps = issueMissingInputOverlap[issue.id];

  return overlaps ? overlaps.some((key) => missingInputKeys.has(key)) : false;
}

export function generateNextSteps(
  result: ScanResult,
  translator: Translator
): NextStep[] {
  const missingInputKeys = new Set(result.missing_inputs.map((input) => input.key));
  const steps: NextStep[] = [];

  result.missing_inputs.forEach((input) => {
    steps.push(buildMissingInputStep(input, result, translator));
  });

  [...result.blocking_issues, ...result.warnings].forEach((issue) => {
    if (shouldSkipIssueStep(issue, missingInputKeys)) {
      return;
    }

    steps.push(
      buildIssueStep(
        issue,
        issue.severity === "high" ? "now" : "soon",
        translator
      )
    );
  });

  const appStoreConnectStep =
    buildAppStoreConnectSetupStep(result, translator) ??
    buildAppStoreConnectConnectedStep(result, translator);

  if (appStoreConnectStep) {
    steps.push(appStoreConnectStep);
  }

  const configWarningStep = buildConfigWarningStep(result.config_warnings, translator);

  if (configWarningStep) {
    steps.push(configWarningStep);
  }

  return sortNextSteps(steps);
}
