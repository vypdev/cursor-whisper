# Deployment and Release Process

**Last Updated**: 2026-05-24

---

## Local Build

```bash
source scripts/ensure-node.sh && pnpm install
pnpm run lint
pnpm test
pnpm run compile
pnpm run package
pnpm run package:verify   # confirm all platform native binaries in VSIX
```

Scripts and manifest fields are defined in [`package.json`](../../package.json). Webpack config: [`webpack.config.js`](../../webpack.config.js).

---

## CI/CD

Release workflow: [`.github/workflows/release_workflow.yml`](../../.github/workflows/release_workflow.yml)

Typical pipeline on version tag:
1. Install dependencies (Node 22, pnpm)
2. Lint and test
3. Compile and package VSIX
4. Publish to VSCode Marketplace / Open VSX (when configured)
5. Attach VSIX to GitHub Release

---

## Release Checklist

### Pre-Release

- [ ] All tests passing (`pnpm test`)
- [ ] No linter errors (`pnpm run lint`)
- [ ] Manual smoke tests complete (see [Testing Strategy](../testing/strategy.md))
- [ ] Cross-platform tested (macOS, Windows, Linux)
- [ ] Documentation updated
- [ ] Version bumped in `package.json`
- [ ] Git tag created

### Release

1. Bump version: `pnpm version patch|minor|major`
2. Push tag: `git push origin vX.Y.Z`
3. Verify CI produces VSIX
4. Test VSIX locally: `code --install-extension cursor-whisper-X.Y.Z.vsix`
5. Confirm marketplace listing (if published)

### Post-Release

- [ ] Verify installation from marketplace or GitHub Releases
- [ ] Monitor GitHub Issues for regressions

---

## Version Management

Semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

---

## Distribution

| Channel | Purpose |
|---------|---------|
| VSCode Marketplace | Primary (when available) |
| Open VSX | VSCodium and forks |
| GitHub Releases | Direct VSIX download |

**Install from VSIX:** Extensions → `...` → Install from VSIX, or `code --install-extension cursor-whisper-X.Y.Z.vsix`

---

## Rollback

If a critical bug ships:

1. Unpublish broken version if possible (`vsce unpublish cursor-whisper@X.Y.Z`)
2. Fix on a hotfix branch, test, release patch version
3. Communicate via GitHub Release notes and Issues

---

**Related:** [Testing Strategy](../testing/strategy.md) · [Project Progress](../../PROGRESS.md)
