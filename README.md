# Preflight

Preflight is a CLI-first, CI-integrated App Store submission risk engine for iOS apps.

It answers three questions:

1. Will this build get rejected?
2. Why?
3. How do I fix it right now?

Preflight is not a checklist, not a static linter, and not an AI chatbot. It is a local release gate that turns reviewer access, metadata, privacy, IAP, and completeness signals into a deterministic risk decision.

## Current Scope

- CLI-first and local-first
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
- IPA or entitlement scanning
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
- `--config <path>`: override `preflight.config.json`
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

Create a starter config:

```bash
preflight init --lang en
```

Run a full scan:

```bash
preflight scan
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

Preflight accepts the canonical nested schema and also normalizes older flat aliases for backward compatibility.

```json
{
  "app": {
    "name": "Example App",
    "bundleId": "com.example.app"
  },
  "submission": {
    "platform": "ios",
    "primaryMarkets": ["en-US", "tr-TR"]
  },
  "appCapabilities": {
    "loginRequired": true,
    "paywallPresent": true,
    "paywallReachable": true,
    "placeholderContentPresent": false,
    "declaredFeatures": ["sign-in", "paywall", "settings"],
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
    "notes": "Test account: reviewer@example.com / password123. Paywall is reachable from Settings > Upgrade.",
    "loginInstructions": "1. Open app\n2. Tap Sign In\n3. Use the demo account above",
    "internetRequired": true
  },
  "metadata": {
    "subtitle": "Release safety",
    "description": "Prevent avoidable App Store review issues before submission.",
    "keywords": "ios,review,release",
    "primaryMarkets": ["en-US", "tr-TR"],
    "requiredScreenshotDeviceTypes": ["iphone-6.7", "iphone-6.5"],
    "localizations": [
      {
        "locale": "en-US",
        "title": "Example App",
        "subtitle": "Release safety",
        "description": "Prevent avoidable App Store review issues before submission.",
        "keywords": "ios,review,release"
      }
    ],
    "screenshots": [
      {
        "path": "assets/screenshots/iphone-6.7-1.png",
        "locales": ["en-US", "tr-TR"],
        "deviceType": "iphone-6.7"
      },
      {
        "path": "assets/screenshots/iphone-6.7-2.png",
        "locales": ["en-US", "tr-TR"],
        "deviceType": "iphone-6.7"
      },
      {
        "path": "assets/screenshots/iphone-6.5-1.png",
        "locales": ["en-US", "tr-TR"],
        "deviceType": "iphone-6.5"
      }
    ]
  },
  "privacy": {
    "policyUrl": "https://example.com/privacy",
    "policyReachable": true,
    "nutritionLabelComplete": true,
    "privacyManifestPresent": true,
    "requiredReasonApisDeclared": true,
    "trackingUsed": false,
    "trackingUsageDescriptionPresent": false,
    "dataCollectionMatchesLabel": true
  },
  "business": {
    "hasIap": true,
    "iapProducts": [
      {
        "productId": "pro.monthly",
        "displayName": "Pro Monthly",
        "reachableFromPaywall": true
      }
    ],
    "subscriptionTermsDisplayed": true,
    "externalPaymentLinksPresent": false,
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
git tag v0.2.0
git push origin stable
git push origin v0.2.0
```

The release workflow always verifies the tagged build. npm publish runs automatically only when the repository has an `NPM_TOKEN` Actions secret configured.
