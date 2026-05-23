# Cursor Whisper Documentation

Welcome to the comprehensive documentation for Cursor Whisper, a professional VSCode/Cursor extension for voice-to-prompt transformation.

---

## 📚 Documentation Structure

This documentation is organized into the following sections:

### [`architecture/`](architecture/)
Complete architectural documentation including:
- System overview and layers
- Component diagrams
- Dependency graphs
- Architectural patterns
- Design decisions

### [`adr/`](adr/)
Architecture Decision Records (ADRs) documenting:
- Key technical decisions
- Rationale and context
- Alternatives considered
- Consequences and trade-offs

### [`api/`](api/)
API reference documentation for:
- Public interfaces
- Use cases
- Domain entities
- Infrastructure services
- Presentation components

### [`application/`](application/)
Application layer documentation:
- Use case detailed specifications
- Port/interface definitions
- Data Transfer Objects (DTOs)
- Application workflows

### [`domain/`](domain/)
Domain layer documentation:
- Entity definitions
- Value objects
- Business rules
- Domain events
- Error types

### [`infrastructure/`](infrastructure/)
Infrastructure layer documentation:
- External service integrations (OpenAI, audio)
- Adapters and implementations
- Configuration management
- Storage strategies

### [`presentation/`](presentation/)
Presentation layer documentation:
- UI components
- Commands and shortcuts
- Webview implementation
- State management
- Visual design system

### [`flows/`](flows/)
Complete workflow documentation:
- User interaction flows
- System process flows
- Error handling flows
- Sequence diagrams

### [`ux/`](ux/)
User experience documentation:
- UI states and transitions
- Interaction patterns
- Visual feedback
- Accessibility
- Performance targets

### [`security/`](security/)
Security and privacy documentation:
- API key management
- Data handling policies
- Microphone permissions
- Privacy guarantees
- Threat model

### [`testing/`](testing/)
Testing strategy and guidelines:
- Unit testing approach
- Integration testing
- E2E testing scenarios
- Test coverage targets
- Testing tools and setup

### [`deployment/`](deployment/)
Deployment and distribution documentation:
- Build process
- Packaging for VSCode Marketplace
- CI/CD pipelines
- Release process
- Version management

### [`roadmap/`](roadmap/)
Product roadmap and planning:
- MVP definition
- Version milestones
- Feature priorities
- Technical debt tracking
- Future enhancements

### [`research/`](research/)
Technical research and investigations:
- Cursor compatibility findings
- VSCode API limitations
- Whisper API capabilities
- Audio processing techniques
- Performance benchmarks

### [`cursor-compatibility/`](cursor-compatibility/)
Cursor-specific compatibility documentation:
- Known limitations
- Agents Window (Glass) issues
- Fallback strategies
- Tested configurations
- Workarounds

---

## 🎯 Quick Navigation

### For New Contributors
1. Start with [`architecture/overview.md`](architecture/overview.md)
2. Read [`architecture/clean-architecture.md`](architecture/clean-architecture.md)
3. Review [`adr/`](adr/) for key decisions
4. Check [`CONTRIBUTING.md`](../CONTRIBUTING.md)

### For Implementers
1. Read [`api/`](api/) for interface definitions
2. Check [`application/use-cases/`](application/use-cases/) for business logic
3. Review [`flows/`](flows/) for complete workflows
4. Consult [`testing/strategy.md`](testing/strategy.md) for testing approach

### For Users
1. Read the main [`README.md`](../README.md)
2. Check [`ux/user-guide.md`](ux/user-guide.md)
3. Review [`ux/troubleshooting.md`](ux/troubleshooting.md)
4. See [`security/privacy-policy.md`](security/privacy-policy.md)

### For Maintainers
1. Review [`roadmap/mvp.md`](roadmap/mvp.md) and [`roadmap/versions.md`](roadmap/versions.md)
2. Check [`deployment/release-process.md`](deployment/release-process.md)
3. Monitor [`research/`](research/) for technical findings
4. Update [`adr/`](adr/) when making architectural changes

---

## 📖 Documentation Principles

This documentation follows these principles:

### 1. **Completeness**
Every module, interface, and decision is documented with:
- Purpose and responsibilities
- Interfaces and contracts
- Examples and usage
- Edge cases and limitations

### 2. **Clarity**
Documentation is:
- Written in clear, concise language
- Accompanied by diagrams where helpful
- Organized logically
- Easy to navigate

### 3. **Maintainability**
Documentation is:
- Version-controlled alongside code
- Updated with code changes
- Reviewed in pull requests
- Living and evolving

### 4. **Actionability**
Documentation provides:
- Clear next steps
- Code examples
- Decision frameworks
- Practical guidance

---

## 🔄 Keeping Documentation Updated

### When to Update Documentation

- **Architecture changes**: Update `architecture/` and create ADR in `adr/`
- **New features**: Update `api/`, `flows/`, and `roadmap/`
- **API changes**: Update `api/` and relevant layer docs
- **Bug fixes**: Update `ux/troubleshooting.md` if user-facing
- **Performance improvements**: Update `research/benchmarks.md`

### Documentation Review Process

1. Documentation changes should be part of every PR
2. Reviewers check both code and docs
3. Breaking changes require ADR
4. Major features require flow diagrams

---

## 🎨 Diagram Conventions

We use **Mermaid** for all diagrams. Common diagram types:

- **Sequence Diagrams**: For flows and interactions
- **Class Diagrams**: For domain models and relationships
- **Flowcharts**: For decision trees and processes
- **State Diagrams**: For UI states and transitions

See [`architecture/diagrams.md`](architecture/diagrams.md) for examples.

---

## 📝 Writing Guidelines

### Code Examples

- Use TypeScript with full type annotations
- Include imports for context
- Show realistic, production-ready code
- Comment non-obvious decisions

### Diagrams

- Keep diagrams focused on one concept
- Use consistent naming with codebase
- Include legends for symbols
- Export as Mermaid code

### ADRs

- Follow ADR template in `adr/template.md`
- Number sequentially: `0001-title.md`
- Include context, decision, and consequences
- Link to related ADRs

---

## 🤝 Contributing to Documentation

Documentation contributions are as valuable as code contributions!

### How to Contribute

1. **Identify gaps**: Missing or outdated docs
2. **Create issue**: Describe what needs documenting
3. **Write docs**: Follow structure and conventions
4. **Submit PR**: Documentation changes like code changes

### Documentation Standards

- Use Markdown for all documentation
- Follow existing structure and organization
- Include diagrams for complex concepts
- Provide code examples where relevant
- Link related documentation
- Keep language clear and concise

---

## 🔗 External Resources

### VSCode Extension Development
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [VSCode Extension Samples](https://github.com/microsoft/vscode-extension-samples)

### OpenAI APIs
- [Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [GPT-4 API Documentation](https://platform.openai.com/docs/guides/gpt)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)

### Architecture Patterns
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)

---

## 📧 Documentation Questions?

If you have questions about the documentation:

1. Check existing documentation first
2. Search [GitHub Discussions](https://github.com/your-org/cursor-whisper/discussions)
3. Create a new discussion with tag `documentation`
4. For specific issues, open a [GitHub Issue](https://github.com/your-org/cursor-whisper/issues)

---

## 📅 Last Updated

This documentation index was last updated: **2026-05-23**

Check individual document headers for specific update dates.

---

**Happy documenting! 📚**
