# Preflight

Preflight is a CLI for detecting App Store submission risk from local iOS project files before a build reaches App Review.

It is built for mobile teams that want deterministic, evidence-backed release checks in local workflows and CI. Preflight auto-discovers Apple-side project facts, merges an optional sparse override config, and reports what is detected, what was provided by a human, and what is still missing.

```bash
npx @yakisan/preflight scan
```

Preflight helps answer three practical release questions:

1. Is this build likely to create App Review risk?
2. What is missing or inconsistent?
3. What does the reviewer still need from us?

## Why Teams Use Preflight

- Detect App Store submission risk before uploading a build for review
- Catch missing reviewer-only inputs such as demo accounts, login instructions, and review notes
- Inspect privacy, metadata, StoreKit, screenshot, and capability signals from local Apple project files
- Produce human-readable and JSON output that can gate CI or release checklists

## Quick Start

Run a full scan without creating any config first:

```bash
npx @yakisan/preflight scan
```

Generate machine-readable output:

```bash
npx @yakisan/preflight scan --json
```

Generate reviewer-pack output only:

```bash
npx @yakisan/preflight reviewer-pack
```

If the scan reports missing reviewer-only inputs or you need to override a detected value, create an optional override template:

```bash
npx @yakisan/preflight init
```

## How It Works

1. Preflight detects the project type and scans local Apple-side project files.
2. It builds a partial submission model from discovered facts.
3. It merges an optional `preflight.config.json`, with user-provided values taking precedence.
4. It evaluates deterministic rules and returns risk, evidence, missing inputs, and reviewer-pack guidance.

Preflight is auto-discovery-first in `v0.3.x`. The config file is optional and should only contain reviewer-only inputs or deliberate overrides.

## What Preflight Checks

Preflight evaluates 30 deterministic rules across:

- Reviewer access and reviewer documentation
- App completeness and release readiness
- Metadata quality and screenshot coverage heuristics
- Privacy signals including tracking usage description and privacy manifest presence
- StoreKit and monetization readiness
- Content and age-rating related declarations

The scan output includes:

- `risk_level`, `risk_score`, `blocking_issues`, and `warnings`
- `discovery.project_type` and discovery source paths
- structured `evidence` for major detected values
- `missing_inputs` for reviewer-only fields that still need human input
- `reviewer_pack` entries marked as `detected`, `user-provided`, or `missing`

## Supported Projects and Discovery Sources

Supported project types:

- native iOS
- Flutter iOS through the `ios/` project
- React Native iOS through the `ios/` project

Discovery currently reads local Apple-side files only. It does not use App Store Connect APIs or environment variables in `v0.3.x`.

Current discovery sources include:

- `Info.plist`
- `.xcodeproj/project.pbxproj`
- entitlements files
- `PrivacyInfo.xcprivacy`
- `.storekit`
- screenshot folders such as `fastlane/screenshots`

## Install

Preflight is distributed via npm only and requires Node.js 20 or newer.

Run it without installing anything globally:

```bash
npx @yakisan/preflight scan
```

Or install the CLI globally:

```bash
npm install -g @yakisan/preflight
preflight scan
```

## Commands

Available commands:

- `preflight scan`
- `preflight init`
- `preflight reviewer-pack`
- `preflight rules`

Common flags:

- `--lang <locale>`: output locale
- `--config <path>`: path to an optional override file
- `--json`: machine-readable output
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

## CI Example

```yaml
- name: Preflight Scan
  run: npx @yakisan/preflight scan --ci --json
```

Risk behavior:

- any high-severity failure produces `HIGH` risk
- medium-severity findings produce `MEDIUM` risk
- low-only or clean runs stay `LOW`

## Exit Codes

- `0`: low risk
- `1`: medium risk or non-blocking warning
- `2`: high risk or blocked release

With `preflight scan --strict`, `MEDIUM` risk also exits with `2`.

## Development

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Releases

Releases are npm-only and tag-driven:

```bash
VERSION=$(node -p "require('./package.json').version")
npm run verify
git tag "v$VERSION"
git push origin stable
git push origin "v$VERSION"
```

Pushing the tag triggers the release workflow, which:

- verifies the tagged build
- creates a GitHub Release for the same tag
- publishes the npm package when the repository has an `NPM_TOKEN` Actions secret configured
