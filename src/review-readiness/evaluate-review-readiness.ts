import { generateSuggestedReviewNotes } from "./generator";
import type { ReviewReadinessItem, ReviewReadinessReport, Translator } from "../types";
import type { ScanInput } from "../scanner/build-scan-input";

function buildItem(
  key: string,
  label: string,
  status: "pass" | "fail",
  value?: string,
  source?: ReviewReadinessItem["source"]
): ReviewReadinessItem {
  return {
    key,
    label,
    status,
    value,
    source
  };
}

export function evaluateReviewReadiness(
  input: ScanInput,
  translator: Translator
): ReviewReadinessReport {
  const items: ReviewReadinessItem[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  const demoLabel = translator.t("reviewerPack.item.demoAccount");
  if (input.effectiveDemoAccountRequired && !input.hasCompleteDemoAccount) {
    items.push(buildItem("demoAccount", demoLabel, "fail", undefined, "missing"));
    missing.push(demoLabel);
    notes.push(translator.t("reviewerPack.note.demoAccount"));
  } else {
    items.push(
      buildItem(
        "demoAccount",
        demoLabel,
        "pass",
        input.hasCompleteDemoAccount
          ? `${input.config.review.demoAccount?.username} / ${input.config.review.demoAccount?.password}`
          : undefined,
        input.hasCompleteDemoAccount
          ? input.getFieldSource("review.demoAccount.username")
          : undefined
      )
    );
  }

  const reviewNotesLabel = translator.t("reviewerPack.item.reviewNotes");
  if (!input.hasReviewNotes) {
    items.push(buildItem("reviewNotes", reviewNotesLabel, "fail", undefined, "missing"));
    missing.push(reviewNotesLabel);
    notes.push(translator.t("reviewerPack.note.reviewNotes"));
  } else {
    items.push(
      buildItem(
        "reviewNotes",
        reviewNotesLabel,
        "pass",
        input.config.review.notes,
        input.getFieldSource("review.notes")
      )
    );
  }

  const loginInstructionsLabel = translator.t("reviewerPack.item.loginInstructions");
  if (input.config.appCapabilities.loginRequired && !input.hasLoginInstructions) {
    items.push(buildItem("loginInstructions", loginInstructionsLabel, "fail", undefined, "missing"));
    missing.push(loginInstructionsLabel);
    notes.push(translator.t("reviewerPack.note.loginInstructions"));
  } else {
    items.push(
      buildItem(
        "loginInstructions",
        loginInstructionsLabel,
        "pass",
        input.config.review.loginInstructions || undefined,
        input.hasLoginInstructions
          ? input.getFieldSource("review.loginInstructions")
          : undefined
      )
    );
  }

  const contactLabel = translator.t("reviewerPack.item.contact");
  if (!input.hasCompleteReviewerContact) {
    items.push(buildItem("contact", contactLabel, "fail", undefined, "missing"));
    missing.push(contactLabel);
    notes.push(translator.t("reviewerPack.note.contact"));
  } else {
    items.push(
      buildItem(
        "contact",
        contactLabel,
        "pass",
        `${input.config.review.contact?.name} <${input.config.review.contact?.email}>`,
        input.getFieldSource("review.contact.name")
      )
    );
  }

  return {
    status: missing.length > 0 ? "incomplete" : "complete",
    items,
    missing,
    notes,
    suggestedReviewNotes: generateSuggestedReviewNotes(input, translator)
  };
}
