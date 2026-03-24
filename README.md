# Preflight

[![CI](https://github.com/yunusemreyakisan/preflight/actions/workflows/ci.yml/badge.svg)](https://github.com/yunusemreyakisan/preflight/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/yunusemreyakisan/preflight?display_name=tag)](https://github.com/yunusemreyakisan/preflight/releases)

Preflight is a CLI for detecting App Store submission risk from local iOS project files before a build reaches App Review.

It is built for mobile teams that want deterministic, evidence-backed checks in local workflows and CI. Preflight auto-discovers Apple-side project facts, merges an optional sparse override config, and reports what was detected, what was provided by a human, what is still missing, and what changed since the last scan.

<img width="1280" alt="Preflight scan dashboard with baseline diff and GitHub Actions annotations" src="assets/preflight-hero.svg" />

```bash
npx @yakisan/preflight scan
```

## Why Preflight

- Detect App Store submission risk before uploading a build for review
- Catch missing reviewer-only inputs such as demo accounts, login instructions, and review notes
- Inspect privacy, metadata, StoreKit, screenshot, and capability signals from local Apple project files
- Produce human-readable and JSON output that can gate CI and release checklists

## What You Get

- A deterministic risk verdict before you upload a build to App Review
- Structured evidence showing which values were discovered locally
- Missing-input reporting for reviewer-only information that still needs a human
- Reviewer-pack guidance that can be copied into release checklists or CI pipelines

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

## How It Works

1. Preflight detects the project type and scans local Apple-side project files.
2. It builds a partial submission model from discovered facts.
3. It merges an optional `preflight.config.json`, with user-provided values taking precedence.
4. It evaluates deterministic rules and returns risk, evidence, missing inputs, and reviewer-pack guidance.

Preflight is auto-discovery-first in `v0.3.x`. The config file is optional and should contain only reviewer-only inputs or deliberate overrides.

## What Preflight Checks

Preflight evaluates 30 deterministic rules across:

- Reviewer access and reviewer documentation
- App completeness and release readiness
- Metadata quality and screenshot coverage heuristics
- Privacy signals including tracking usage description and privacy manifest presence
- StoreKit and monetization readiness
- Content and age-rating related declarations

Each scan returns:

- `risk_level`, `risk_score`, `blocking_issues`, and `warnings`
- `discovery.project_type` and discovery source paths
- Structured `evidence` for major detected values
- `missing_inputs` for reviewer-only fields that still need human input
- `reviewer_pack` entries marked as `detected`, `user-provided`, or `missing`

## Supported Projects and Discovery Sources

Supported project types:

- Native iOS
- Flutter iOS through the `ios/` project
- React Native iOS through the `ios/` project

Discovery currently reads local Apple-side files only. It does not use App Store Connect APIs or environment variables in `v0.3.x`.

Current discovery sources include:

- `Info.plist`
- `.xcodeproj/project.pbxproj`
- Entitlements files
- `PrivacyInfo.xcprivacy`
- `.storekit`
- Screenshot folders such as `fastlane/screenshots`

## Commands

Available commands:

- `preflight scan`: run a full submission risk scan
- `preflight reviewer-pack`: output reviewer-pack completeness data
- `preflight init`: create an optional override template
- `preflight rules`: list bundled rule coverage and metadata

Common flags:

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

`preflight scan` first discovers what it can from local project files, then merges `preflight.config.json` only if the file exists.

Use the override config for reviewer-only inputs and values that cannot be inferred with confidence from local files. Missing human inputs stay explicitly missing; they are not silently treated as `false`.

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

Fully populated older configs still scan correctly, and legacy aliases continue to be normalized for backward compatibility.

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

Risk behavior:

- Any high-severity failure produces `HIGH` risk
- Medium-severity findings produce `MEDIUM` risk
- Low-only or clean runs stay `LOW`

## Exit Codes

- `0`: low risk
- `1`: medium risk or non-blocking warning
- `2`: high risk or blocked release

With `preflight scan --strict`, `MEDIUM` risk also exits with `2`.

Licensed under the [MIT License](LICENSE).
