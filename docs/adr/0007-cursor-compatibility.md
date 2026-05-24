# ADR-0007: Prioritize Classic Mode Compatibility

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0006](0006-text-insertion-strategy.md)

---

## Context

Cursor has evolved significantly. As of version 3.0, there are different modes:

1. **Classic Mode** - Traditional VSCode-style interface, full extension support
2. **Editor Window** - Standard editing window, full extension support
3. **Agents Window (Glass)** - New AI-focused interface, **limited extension support**

Based on research (May 2026):
- **Agents Window** does NOT fully support VSCode extensions
- Common extensions (Prettier, linters, TypeScript tools) don't load in Glass
- Remote extensions (WSL, Dev Containers) not supported
- Chat integration is different/limited

We need to decide:
- Which Cursor mode(s) to target?
- How to handle compatibility issues?
- What to communicate to users?

---

## Decision

**We will prioritize Classic Mode and Editor Window compatibility, with graceful degradation in Agents Window.**

Key aspects:
1. **Primary target**: Classic Mode (`cursor --classic`)
2. **Secondary target**: Editor Window (standard editing)
3. **Limited support**: Agents Window (Glass) with compatibility warnings
4. **Detection**: Detect Agents Window and warn users
5. **Fallbacks**: Provide clipboard-based workflows for unsupported contexts
6. **Documentation**: Clearly document compatibility requirements

### Implementation

```typescript
export class CursorCompatibilityChecker {
  static isCursorEnvironment(): boolean {
    return vscode.env.appName.includes('Cursor');
  }

  static async isAgentsWindow(): Promise<boolean> {
    // Detect if we're in Agents Window (Glass)
    // Heuristic: check for missing commands that are available in Classic
    const commands = await vscode.commands.getCommands();
    return this.isCursorEnvironment() && 
           !commands.includes('workbench.action.chat.open');
  }

  static async showCompatibilityWarning(): Promise<void> {
    if (await this.isAgentsWindow()) {
      const selection = await vscode.window.showWarningMessage(
        'Promptimize works best in Classic Mode or Editor Window. ' +
        'The Agents Window has limited extension support.',
        'Open in Editor Window',
        'Continue Anyway'
      );

      if (selection === 'Open in Editor Window') {
        await vscode.commands.executeCommand('workbench.action.openEditorWindow');
      }
    }
  }
}
```

---

## Alternatives Considered

### Alternative 1: Agents Window First
- **Description**: Prioritize and optimize for Agents Window (Glass)
- **Pros**:
  - Future-focused
  - Aligns with Cursor's vision
  - Might gain features before others
- **Cons**:
  - Currently has poor extension support
  - Many features don't work
  - Uncertain timeline for full support
  - Small user base currently
  - Risky bet on unproven platform
- **Why not chosen**: Too many limitations, unstable foundation

### Alternative 2: Support All Modes Equally
- **Description**: Try to fully support all Cursor modes
- **Pros**:
  - Maximum reach
  - No user confusion
  - Future-proof
- **Cons**:
  - Extremely difficult with current Glass limitations
  - Requires significant workarounds
  - Maintenance burden
  - May not even be possible
  - Delays launch
- **Why not chosen**: Not realistic given current Glass constraints

### Alternative 3: VSCode Only, No Cursor
- **Description**: Only support standard VSCode, ignore Cursor entirely
- **Pros**:
  - Simpler compatibility story
  - Larger user base (VSCode vs Cursor)
  - No Cursor-specific issues
- **Cons**:
  - Misses primary use case (Cursor chat integration)
  - Less compelling value proposition
  - Former name "Cursor Whisper" was misleading
  - Cursor users are target audience
- **Why not chosen**: Cursor integration is a key differentiator

### Alternative 4: Block Agents Window Completely
- **Description**: Refuse to activate in Agents Window
- **Pros**:
  - No compatibility issues
  - Clear user communication
  - No bug reports from unsupported mode
- **Cons**:
  - Poor user experience
  - Users can't even try it
  - Overly restrictive
  - Prevents any Glass-compatible features
- **Why not chosen**: Too restrictive, bad UX

---

## Consequences

### Positive Consequences
- **Stable foundation**: Classic Mode is mature and stable
- **Full extension support**: All VSCode extension APIs available
- **Predictable behavior**: Well-documented, tested
- **Larger user base**: More users in Classic/Editor than Glass
- **Easier development**: Don't need to work around Glass limitations
- **Better UX**: Features work reliably
- **Clear documentation**: Can document what works

### Negative Consequences
- **Not "cutting edge"**: Not optimizing for newest Cursor mode
- **Split experience**: Different experiences in different modes
- **User confusion**: Some users might expect Glass support
- **Future migration**: Might need significant work to support Glass later
- **Marketing challenge**: Can't claim "full Cursor support"

### Risks
- **Glass becomes dominant**: If most users switch to Glass
  - **Mitigation**: Monitor user feedback and adoption
  - **Mitigation**: Provide basic clipboard fallback in Glass
  - **Mitigation**: Revisit when Glass extension support improves

- **Cursor deprecates Classic**: Classic Mode removed
  - **Mitigation**: Fallback to Editor Window
  - **Mitigation**: Extension still works in standard VSCode
  - **Mitigation**: Unlikely in near future (announced by Cursor)

- **Users frustrated by warnings**: Compatibility warnings annoying
  - **Mitigation**: Make warnings dismissible
  - **Mitigation**: Show only once per session
  - **Mitigation**: Provide "Don't show again" option

### Technical Debt
- **Glass support delay**: Will need work to fully support Glass later
  - **Payoff strategy**: Add Glass support in v0.4+ when APIs stabilize
  - **Estimated effort**: 2-4 weeks of development
  - **Timeline**: Q3 2026 or when Cursor announces stable Glass extension support

---

## Implementation Notes

### Activation Hook

```typescript
// extension.ts
export async function activate(context: vscode.ExtensionContext) {
  // Check compatibility
  const compatibilityChecker = new CursorCompatibilityChecker();
  await compatibilityChecker.showCompatibilityWarning();

  // Continue activation...
  // If in Glass, some features will use fallbacks
}
```

### Feature Detection

```typescript
export class FeatureDetector {
  static async canAccessChat(): Promise<boolean> {
    const commands = await vscode.commands.getCommands();
    return commands.includes('workbench.action.chat.open');
  }

  static async canUseEditor(): Promise<boolean> {
    return !!vscode.window.activeTextEditor;
  }
}
```

### User Documentation

From README.md:

```markdown
## Compatibility

Promptimize works best in:
- ✅ **Cursor Classic Mode** (`cursor --classic`)
- ✅ **Cursor Editor Window**
- ✅ **Standard VSCode**

Limited support:
- ⚠️ **Cursor Agents Window (Glass)** - Basic functionality with fallbacks

If using Agents Window, you'll see a one-time compatibility notice.
```

### Fallback Strategy

```typescript
// In Agents Window, fall back to clipboard
if (await compatibilityChecker.isAgentsWindow()) {
  // Use FallbackTextInserter (clipboard)
  inserters = [fallbackInserter];  // Skip chat/editor inserters
} else {
  // Full feature set
  inserters = [chatInserter, editorInserter, fallbackInserter];
}
```

---

## References

- [Cursor Forum: Agents Window Extension Support](https://forum.cursor.com/t/cursor-3-0-agentic-ide-huge-potential-but-blocked-by-key-usability-gaps/156803)
- [Cursor Forum: WSL Extension Issues](https://forum.cursor.com/t/cursor-3-extension-wsl-is-required-to-open-the-remote-window/156531)
- [Cursor Forum: Dev Containers Not Working](https://forum.cursor.com/t/dev-container-remotes-dont-work-with-glass/156214)
