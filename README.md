# Preflight

Preflight is a CLI-first, CI-integrated App Store submission risk engine for iOS apps.

It answers three questions:

1. Will this build get rejected?
2. Why?
3. How do I fix it right now?

Preflight is not a checklist, not a static linter, and not an AI chatbot. It is a local release gate that turns reviewer access, metadata, privacy, IAP, and completeness signals into a deterministic risk decision.

## Current Scope

- CLI-first and local-first
- Auto-discovery-first scanning from local Apple project files
- Supported project types:
  - native iOS
  - Flutter iOS
  - React Native iOS
- Optional sparse override config via `preflight.config.json`
- 30 deterministic rules across reviewer access, completeness, metadata, privacy, IAP, and content
- Reviewer Pack validation and review-note generation
- Branded terminal output with plain fallback
- Human-readable and JSON output
- CI-ready exit codes
- 10 supported CLI locales:
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

English and Turkish have full localized messaging. The remaining bundled locales fall back to English for untranslated keys.

## Not In Scope Yet

- App Store Connect API integration
- IPA scanning
- Runtime flow simulation
- Cloud dashboard
- Remote rule sync

## Install

### npm

```bash
npm install -g @yakisan/preflight
preflight scan
```

Or run it without installing globally:

```bash
npx @yakisan/preflight scan
```

### curl

```bash
curl -fsSL https://raw.githubusercontent.com/yunusemreyakisan/preflight/stable/scripts/install.sh | bash
```

### Go shim

```bash
go install github.com/yunusemreyakisan/preflight/cmd/preflight@latest
preflight scan
```

The Go binary is a thin launcher. It delegates to the published npm package, so Node.js and npm still need to exist on the machine.

### Homebrew formula

For local installs from this repository:

```bash
brew install ./Formula/preflight.rb
```

Use `brew install --HEAD ./Formula/preflight.rb` if you want the latest branch state before the next npm release.

The same formula can later be moved into a custom tap repo without changing the package itself.

## Commands

Available commands:

- `preflight init`
- `preflight scan`
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

## Exit Codes

- `0`: low risk
- `1`: medium risk or non-blocking warning
- `2`: high risk or blocked release

With `preflight scan --strict`, `MEDIUM` risk also exits with `2`.

## Quick Start

Run a full scan first:

```bash
preflight scan
```

If the scan reports missing human-only inputs or you need to override a detected value, create an optional override template:

```bash
preflight init --lang en
```

Generate reviewer-pack output only:

```bash
preflight reviewer-pack --lang tr
```

List bundled rules:

```bash
preflight rules --update
```

## Config Shape

`preflight scan` now auto-discovers local iOS project facts first, then merges `preflight.config.json` only if it exists.

The override file is optional and can stay sparse. Use it for reviewer-only inputs and values that cannot be discovered reliably from local Apple project files. Fully populated older configs still work, and flat legacy aliases are still normalized for backward compatibility.

Minimal override example:

```json
{
  "submission": {
    "primaryMarkets": ["en-US", "tr-TR"]
  },
  "appCapabilities": {
    "loginRequired": true,
    "placeholderContentPresent": false,
    "inaccessibleFeatures": [],
    "brokenFlows": [],
    "onboardingRequiresExternalDependency": false,
    "regionRestricted": false,
    "regionRestrictionNotes": "",
    "vpnRequired": false,
    "ugcPresent": false
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
    "notes": "Test account: reviewer@example.com / password123. Open the signed-in home screen, then go to Settings -> Upgrade to reach the paywall.",
    "loginInstructions": "1. Open app\n2. Tap Sign In\n3. Use the demo account above\n4. Open Settings -> Upgrade",
    "internetRequired": true
  },
  "privacy": {
    "policyUrl": "https://example.com/privacy",
    "nutritionLabelComplete": true
  },
  "business": {
    "subscriptionTermsDisplayed": true,
    "restorePurchasesPresent": true,
    "offersFreeTrial": false,
    "freeTrialTermsDisplayed": false
  },
  "content": {
    "ageRatingDeclared": 4,
    "ageRatingRecommended": 4,
    "ugcModerationDeclared": false
  }
}
```

Auto-discovered signals currently come from local Apple-side files such as:

- `Info.plist`
- `.xcodeproj/project.pbxproj`
- entitlements files
- `PrivacyInfo.xcprivacy`
- `.storekit`
- screenshot folders such as `fastlane/screenshots`

## CI Example

```yaml
- name: Preflight Scan
  run: npx @yakisan/preflight scan --ci
```

Risk behavior:

- any high-severity failure produces `HIGH` risk
- medium-severity warnings produce `MEDIUM` risk
- low-only or clean runs stay `LOW`

## Rule Coverage

The bundled 30 rules are grouped into:

- Reviewer access
- App completeness
- Metadata quality
- Privacy and compliance
- IAP and monetization
- Content and age rating

Use `preflight rules --update` to inspect bundled rule metadata and `lastVerified` dates.

## Development

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Releases

Releases are tag-driven:

```bash
npm run verify
git tag v0.3.0
git push origin stable
git push origin v0.3.0
```

Compact release checklist:

1. Update `package.json` and `package-lock.json` to the target version.
2. Run `npm run verify`.
3. Create the matching tag, for example `v0.3.0`.
4. Push `stable` and the tag.

Pushing the tag triggers the release workflow, which:

- verifies the tagged build
- creates a GitHub Release for the same tag
- publishes to npm when the repository has an `NPM_TOKEN` Actions secret configured
