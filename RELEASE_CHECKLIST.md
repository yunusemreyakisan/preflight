# Preflight Release Checklist

## Release Metadata

- Confirm `package.json` version is correct.
- Confirm package name is `@yakisan/preflight`.
- Confirm README examples use the final npm package name.
- Confirm `LICENSE` exists.

## Local Verification

Run:

```bash
npm install
npm run verify
npm pack --dry-run
```

Expected:

- typecheck passes
- tests pass
- lint passes
- build passes
- tarball contains only expected publish artifacts

## GitHub Setup

Create the public repository if it does not exist yet:

```bash
gh repo create yunusemreyakisan/preflight --public --source=. --remote=origin --push
```

If the repository already exists:

```bash
git remote add origin https://github.com/yunusemreyakisan/preflight.git
git push -u origin main
```

## Tagging

Create and push the release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## npm Publish

Authenticate first:

```bash
npm login
```

Then publish:

```bash
npm publish --access public
```

## Post-Publish Smoke Test

In a clean directory:

```bash
npx @yakisan/preflight init --lang en
npx @yakisan/preflight rules --json
npx @yakisan/preflight scan --help
```

## Launch

- Update GitHub repo description.
- Publish a short launch post with `npx @yakisan/preflight scan`.
- Share to Hacker News, Reddit, and indie dev communities.
