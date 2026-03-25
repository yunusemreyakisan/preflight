import type { Translator } from "../types";
import type { ScanInput } from "../scanner/build-scan-input";

function pushIndented(lines: string[], value: string): void {
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      lines.push(`  ${line}`);
    });
}

export function generateSuggestedReviewNotes(
  input: ScanInput,
  translator: Translator
): string {
  const lines: string[] = [];
  const reviewNotes = input.config.review.notes.trim();
  const paywallPathSource =
    reviewNotes || "Open the signed-in home screen and use the upgrade entry point.";

  lines.push(`${translator.t("reviewerPack.template.testAccount")}:`);
  lines.push(
    `  ${translator.t("reviewerPack.template.email")}: ${
      input.config.review.demoAccount?.username ?? "reviewer@example.com"
    }`
  );
  lines.push(
    `  ${translator.t("reviewerPack.template.password")}: ${
      input.config.review.demoAccount?.password ?? "password123"
    }`
  );
  lines.push("");
  lines.push(`${translator.t("reviewerPack.template.loginSteps")}:`);

  if (input.config.review.loginInstructions.trim()) {
    pushIndented(lines, input.config.review.loginInstructions);
  } else {
    lines.push(`  ${translator.t("reviewerPack.template.step1")}`);
    lines.push(`  ${translator.t("reviewerPack.template.step2")}`);
    lines.push(`  ${translator.t("reviewerPack.template.step3")}`);
    lines.push(`  ${translator.t("reviewerPack.template.step4")}`);
  }

  lines.push("");
  lines.push(`${translator.t("reviewerPack.template.notes")}:`);

  if (input.config.review.internetRequired) {
    lines.push(`  - ${translator.t("reviewerPack.template.internetRequired")}`);
  }

  if (input.config.appCapabilities.regionRestricted || input.config.appCapabilities.vpnRequired) {
    lines.push(
      `  - ${translator.t("reviewerPack.template.regionRestriction", {
        value:
          input.config.appCapabilities.regionRestrictionNotes ||
          (input.config.appCapabilities.vpnRequired ? "VPN required" : "Region restricted")
      })}`
    );
  }

  if (input.config.appCapabilities.paywallPresent) {
    lines.push(
      `  - ${translator.t("reviewerPack.template.paywallPath", {
        value: paywallPathSource
      })}`
    );
  }

  if (!input.config.business.hasIap) {
    lines.push(`  - ${translator.t("reviewerPack.template.noIap")}`);
  }

  if (reviewNotes && (!input.config.appCapabilities.paywallPresent || reviewNotes !== paywallPathSource)) {
    lines.push(`  - ${reviewNotes}`);
  }

  return lines.join("\n");
}
