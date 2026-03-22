import { generateReviewerPackTemplate } from "./generator";
import type { ReviewerPackItem, ReviewerPackReport, Translator } from "../types";
import type { ScanInput } from "../scanner/build-scan-input";

function buildItem(
  key: string,
  label: string,
  status: "pass" | "fail",
  value?: string
): ReviewerPackItem {
  return {
    key,
    label,
    status,
    value
  };
}

export function evaluateReviewerPack(
  input: ScanInput,
  translator: Translator
): ReviewerPackReport {
  const items: ReviewerPackItem[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  const demoLabel = translator.t("reviewerPack.item.demoAccount");
  if (input.effectiveDemoAccountRequired && !input.hasCompleteDemoAccount) {
    items.push(buildItem("demoAccount", demoLabel, "fail"));
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
          : undefined
      )
    );
  }

  const reviewNotesLabel = translator.t("reviewerPack.item.reviewNotes");
  if (!input.config.review.notes.trim()) {
    items.push(buildItem("reviewNotes", reviewNotesLabel, "fail"));
    missing.push(reviewNotesLabel);
    notes.push(translator.t("reviewerPack.note.reviewNotes"));
  } else {
    items.push(buildItem("reviewNotes", reviewNotesLabel, "pass", input.config.review.notes));
  }

  const loginInstructionsLabel = translator.t("reviewerPack.item.loginInstructions");
  if (input.config.appCapabilities.loginRequired && !input.config.review.loginInstructions.trim()) {
    items.push(buildItem("loginInstructions", loginInstructionsLabel, "fail"));
    missing.push(loginInstructionsLabel);
    notes.push(translator.t("reviewerPack.note.loginInstructions"));
  } else {
    items.push(
      buildItem(
        "loginInstructions",
        loginInstructionsLabel,
        "pass",
        input.config.review.loginInstructions || undefined
      )
    );
  }

  const contactLabel = translator.t("reviewerPack.item.contact");
  if (!input.hasCompleteReviewerContact) {
    items.push(buildItem("contact", contactLabel, "fail"));
    missing.push(contactLabel);
    notes.push(translator.t("reviewerPack.note.contact"));
  } else {
    items.push(
      buildItem(
        "contact",
        contactLabel,
        "pass",
        `${input.config.review.contact?.name} <${input.config.review.contact?.email}>`
      )
    );
  }

  return {
    status: missing.length > 0 ? "incomplete" : "complete",
    items,
    missing,
    notes,
    generatedReviewNotesTemplate: generateReviewerPackTemplate(input, translator)
  };
}

