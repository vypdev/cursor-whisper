# Deployment and Release Process

**Last Updated**: 2026-05-23

---

## Build Process

### Local Build

```bash
# Install dependencies
pnpm install

# Run linter
pnpm run lint

# Run tests
pnpm test

# Build extension
pnpm run compile

# Package VSIX
pnpm run package
```

### Build Scripts

```json
// package.json
{
  "scripts": {
    "compile": "webpack --mode production",
    "compile:dev": "webpack --mode development --watch",
    "lint": "eslint src --ext ts",
    "lint:fix": "eslint src --ext ts --fix",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "package": "vsce package",
    "publish": "vsce publish",
    "publish:ovsx": "ovsx publish"
  }
}
```

---

## Package Configuration

### Extension Manifest

```json
// package.json (extension fields)
{
  "name": "cursor-whisper",
  "displayName": "Cursor Whisper - Voice to Optimized Prompt",
  "description": "Transform voice into optimized prompts using OpenAI Whisper and GPT-4",
  "version": "0.1.0",
  "publisher": "cursor-whisper",
  "icon": "assets/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/vypdev/cursor-whisper"
  },
  "engines": {
    "vscode": "^1.120.0"
  },
  "categories": [
    "Other",
    "Machine Learning"
  ],
  "keywords": [
    "voice",
    "speech-to-text",
    "whisper",
    "ai",
    "cursor",
    "productivity"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "cursor-whisper.startRecording",
        "title": "Cursor Whisper: Start Recording"
      },
      {
        "command": "cursor-whisper.stopRecording",
        "title": "Cursor Whisper: Stop Recording"
      },
      {
        "command": "cursor-whisper.configureApiKey",
        "title": "Cursor Whisper: Configure API Key"
      }
    ],
    "keybindings": [
      {
        "command": "cursor-whisper.startRecording",
        "key": "ctrl+alt+v",
        "mac": "cmd+alt+v"
      }
    ],
    "configuration": {
      "title": "Cursor Whisper",
      "properties": {
        "cursorWhisper.transcriptionLanguage": {
          "type": "string",
          "default": "auto",
          "description": "Language for transcription (ISO 639-1 code or 'auto')"
        },
        "cursorWhisper.enablePromptTransformation": {
          "type": "boolean",
          "default": true,
          "description": "Enable AI-powered prompt transformation"
        },
        "cursorWhisper.audioQuality": {
          "type": "string",
          "enum": ["low", "medium", "high"],
          "default": "high",
          "description": "Audio recording quality"
        },
        "cursorWhisper.maxRecordingDuration": {
          "type": "number",
          "default": 120,
          "description": "Maximum recording duration in seconds"
        }
      }
    }
  }
}
```

---

## Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },
  mode: 'production',
  devtool: 'source-map'
};
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm run lint
      
      - name: Test
        run: pnpm test
      
      - name: Build
        run: pnpm run compile
      
      - name: Package
        run: pnpm run package
      
      - name: Publish to VSCode Marketplace
        run: pnpm run publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
      
      - name: Publish to Open VSX
        run: pnpm run publish:ovsx
        env:
          OVSX_PAT: ${{ secrets.OVSX_PAT }}
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: '*.vsix'
          body_path: CHANGELOG.md
```

---

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] Coverage >80%
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Manual testing complete
- [ ] Cross-platform tested (macOS, Windows, Linux)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in `package.json`
- [ ] Git tag created

### Release

1. **Version Bump**:
   ```bash
   pnpm version patch  # 0.1.0 -> 0.1.1
   pnpm version minor  # 0.1.1 -> 0.2.0
   pnpm version major  # 0.2.0 -> 1.0.0
   ```

2. **Create Tag**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. **Build & Test**:
   ```bash
   pnpm run compile
   pnpm test
   pnpm run package
   ```

4. **Test VSIX Locally**:
   ```bash
   code --install-extension cursor-whisper-0.1.0.vsix
   ```

5. **Publish**:
   ```bash
   # VSCode Marketplace
   vsce publish

   # Open VSX
   ovsx publish cursor-whisper-0.1.0.vsix
   ```

6. **Create GitHub Release**:
   - Go to GitHub Releases
   - Create new release from tag
   - Copy CHANGELOG content
   - Attach .vsix file

### Post-Release

- [ ] Verify extension appears on VSCode Marketplace
- [ ] Verify extension appears on Open VSX
- [ ] Test installation from marketplace
- [ ] Update documentation site (if any)
- [ ] Announce on social media
- [ ] Monitor for issues

---

## Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

**Examples**:
- `0.1.0` → `0.1.1`: Bug fix
- `0.1.1` → `0.2.0`: New feature (prompt transformation)
- `0.2.0` → `1.0.0`: First stable release

---

## Distribution

### Channels

1. **VSCode Marketplace**: Primary distribution
2. **Open VSX**: For VSCodium and other forks
3. **GitHub Releases**: Direct VSIX download

### Installation Methods

**From Marketplace**:
```
1. Open VSCode/Cursor
2. Extensions → Search "Cursor Whisper"
3. Click Install
```

**From VSIX**:
```bash
code --install-extension cursor-whisper-0.1.0.vsix
```

**From Source**:
```bash
git clone https://github.com/vypdev/cursor-whisper
cd extension
pnpm install
pnpm run compile
code --extensionDevelopmentPath=$PWD
```

---

## Rollback Procedure

### If Critical Bug Found

1. **Unpublish broken version** (if possible):
   ```bash
   vsce unpublish cursor-whisper@0.1.1
   ```

2. **Fix bug**:
   ```bash
   # Create hotfix branch
   git checkout -b hotfix/critical-bug

   # Fix issue
   # ...

   # Test thoroughly
   pnpm test

   # Merge and release patch
   git checkout main
   git merge hotfix/critical-bug
   pnpm version patch
   git push --tags
   ```

3. **Communicate**:
   - Update GitHub issue
   - Add comment to marketplace
   - Notify users via release notes

---

## Monitoring

### Post-Release Metrics

Track:
- Download count
- Active installations
- Ratings and reviews
- GitHub issues opened
- Error reports (if telemetry added)

### Health Checks

- Extension loads without errors
- Commands are registered
- Configuration works
- API calls succeed
- Cross-platform compatibility

---

## Summary

**Release Flow**:
1. ✅ Code complete & tested
2. ✅ Version bumped & tagged
3. ✅ Built & packaged
4. ✅ Published to marketplaces
5. ✅ GitHub release created
6. ✅ Announced & monitored

**Distribution**:
- VSCode Marketplace (primary)
- Open VSX (secondary)
- GitHub Releases (direct download)

**Versioning**: Semantic (MAJOR.MINOR.PATCH)

---

**Next**: See [Roadmap](../roadmap/versions.md) for planned releases.
