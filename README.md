# Preflight

[![CI](https://github.com/yunusemreyakisan/preflight/actions/workflows/ci.yml/badge.svg)](https://github.com/yunusemreyakisan/preflight/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/yunusemreyakisan/preflight?display_name=tag)](https://github.com/yunusemreyakisan/preflight/releases)

Preflight is a CLI for detecting App Store submission risk from local iOS project files before a build reaches App Review.

It is built for mobile teams that want deterministic, evidence-backed checks in local workflows and CI. Preflight auto-discovers Apple-side project facts, merges an optional sparse override config, and reports what was detected, what still needs human input, and what changed since the previous scan.

<img width="1280" alt="Preflight scan dashboard with baseline diff and GitHub Actions annotations" src="assets/preflight-hero.svg" />

```bash
npx @yakisan/preflight scan
```

## Overview

- Detect App Store submission risk before uploading a build for review
- Catch missing reviewer-only inputs such as demo accounts, login instructions, and review notes
- Inspect privacy, metadata, StoreKit, screenshot, and capability signals from local Apple project files
- Produce human-readable, JSON, baseline-diff, and CI-friendly output

## Quick Start

Preflight requires Node.js 20 or newer and is distributed through npm.

Run a full scan without creating any config first:

```bash
npx @yakisan/preflight scan
```

Or install it globally:

```bash
npm install -g @yakisan/preflight
preflight scan
```

Useful first commands:

- Full scan: `npx @yakisan/preflight scan`
- Machine-readable output: `npx @yakisan/preflight scan --json`
- Compare with a previous report: `npx @yakisan/preflight scan --baseline preflight-report.json`
- Emit GitHub Actions annotations: `npx @yakisan/preflight scan --annotations github`
- Reviewer-pack only: `npx @yakisan/preflight reviewer-pack`
- Generate an override template: `npx @yakisan/preflight init`

## What Preflight Checks

Preflight evaluates 30 deterministic rules across:

- Reviewer access and reviewer documentation
- App completeness and release readiness
- Metadata quality and screenshot coverage heuristics
- Privacy signals including tracking usage description and privacy manifest presence
- StoreKit and monetization readiness
- Content and age-rating related declarations

## Supported Projects and Discovery Sources

Supported project types:

- Native iOS
- Flutter iOS through the `ios/` project
- React Native iOS through the `ios/` project

Discovery currently reads local Apple-side files only. It does not use App Store Connect APIs or environment variables.

Current discovery sources include:

- `Info.plist`
- `.xcodeproj/project.pbxproj`
- Entitlements files
- `PrivacyInfo.xcprivacy`
- `.storekit`
- Screenshot folders such as `fastlane/screenshots`

## Commands

Core commands:

| Command | Purpose |
| --- | --- |
| `preflight scan` | Run a full submission risk scan |
| `preflight reviewer-pack` | Validate reviewer-pack completeness only |
| `preflight init` | Create an optional override template |
| `preflight rules` | List bundled rules and metadata |

Key flags:

- `--lang <locale>`: output locale
- `--config <path>`: path to an optional override file
- `--json`: machine-readable output
- `--baseline <path>`: compare the current scan against a previous JSON scan report
- `--annotations <target>`: emit workflow annotations, currently `github`
- `--ci`: concise CI output for `scan`
- `--strict`: treat `MEDIUM` risk as blocking for `scan`
- `--plain`: disable branded terminal formatting
- `--update`: include bundled rule metadata for `rules`
- `--force`: overwrite an existing file for `init`

Preflight automatically falls back to plain terminal output when `stdout` is not a TTY or `NO_COLOR=1` is present.

Supported locales:

- `en`
- `tr`
- `de`
- `fr`
- `es`
- `it`
- `pt-BR`
- `ja`
- `ko`
- `zh-CN`

English and Turkish currently have full localized messaging. Other bundled locales fall back to English for untranslated keys.

## Optional Override Config

`preflight scan` discovers what it can from local project files first, then merges `preflight.config.json` only if the file exists.

Use the override config only for reviewer-only inputs and deliberate overrides that cannot be inferred reliably from local files.

Minimal example:

```json
{
  "appCapabilities": {
    "loginRequired": true
  },
  "review": {
    "demoAccountRequired": true,
    "demoAccount": {
      "username": "reviewer@example.com",
      "password": "password123",
      "notes": ""
    },
    "contact": {
      "name": "Release Team",
      "email": "mobile@example.com",
      "phone": ""
    },
    "notes": "Use the demo account to sign in, then open Settings -> Upgrade to review the subscription paywall.",
    "loginInstructions": "Open the app, tap Sign In, use the demo credentials above, then navigate to Settings -> Upgrade.",
    "internetRequired": true
  },
  "privacy": {
    "policyUrl": "https://example.com/privacy",
    "nutritionLabelComplete": true
  }
}
```

## Baseline Diffs and PR Annotations

Store a JSON report from one run, then compare future scans against it:

```bash
npx @yakisan/preflight scan --json > preflight-report.json
npx @yakisan/preflight scan --baseline preflight-report.json
```

For GitHub Actions or pull request workflows, emit annotations directly into the job log:

```bash
npx @yakisan/preflight scan --annotations github
```

## CI Example

Use Preflight as a gate in CI:

```yaml
- name: Preflight Scan
  run: npx @yakisan/preflight scan --ci --annotations github --json > preflight-report.json
```

Scan output includes `risk_level`, `risk_score`, `blocking_issues`, `warnings`, discovery evidence, `missing_inputs`, and `reviewer_pack` status.

## Exit Codes

- `0`: low risk
- `1`: medium risk or non-blocking warning
- `2`: high risk or blocked release

With `preflight scan --strict`, `MEDIUM` risk also exits with `2`.

Licensed under the [MIT License](LICENSE).
