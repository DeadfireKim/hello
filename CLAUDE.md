# hello Project Guide

> This file helps Claude understand your project's rules, conventions, and preferences.
> Update this file whenever you discover patterns or rules that should be followed consistently.

## Project Overview

- **Project Type**: [Describe your project - e.g., Web app, API, Library]
- **Tech Stack**: [List main technologies - e.g., Next.js, React, TypeScript]
- **Purpose**: [Brief description of what this project does]

## Project Structure

```
/docs/              # PDCA methodology documents
  /01-plan/         # Planning documents
  /02-design/       # Design specifications
  /03-analysis/     # Analysis and review results
  /04-report/       # Completion reports
```

## Development Methodology

### PDCA Cycle
This project follows the PDCA (Plan-Do-Check-Act) methodology:

1. **Plan** - Check `/docs/01-plan/` before starting new features
2. **Design** - Create design documents in `/docs/02-design/`
3. **Do** - Implement according to design specifications
4. **Check** - Run gap analysis, verify implementation matches design
5. **Act** - Generate completion reports in `/docs/04-report/`

### Workflow Rules
- Always check for existing plan/design documents before implementing features
- Document architectural decisions
- Use bkit plugin commands for PDCA workflow automation

## Package Management

- **Preferred**: [e.g., pnpm, npm, yarn]
- **Install command**: [e.g., `pnpm install`]
- **Dev command**: [e.g., `pnpm dev`]

## Coding Conventions

### File Naming
- Components: [e.g., PascalCase - `UserProfile.tsx`]
- Utilities: [e.g., kebab-case - `format-date.ts`]
- Test files: [e.g., `*.test.ts` or `*.spec.ts`]

### TypeScript
- Prefer `type` over `interface`
- Avoid `any` type - use `unknown` or proper types
- All functions should have explicit return types
- [Add more rules as needed]

### Code Style
- [e.g., Use functional components over class components]
- [e.g., Prefer named exports over default exports]
- [e.g., Use async/await over .then() chains]

## Git Workflow

### Commit Messages
- Use conventional commits format: `type(scope): message`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Example: `feat(auth): add logout button to user profile`

### Branch Naming
- Feature: `feature/description`
- Fix: `fix/description`
- Refactor: `refactor/description`

## Testing

- Unit tests required for: [e.g., all business logic, utilities]
- Test command: [e.g., `pnpm test`]
- Coverage minimum: [e.g., 80%]

## Prohibited Practices

- ❌ No `console.log` in production code (use proper logging)
- ❌ No hardcoded credentials or API keys
- ❌ No commented-out code in commits
- ❌ No large files committed to git
- [Add more as you discover them]

## Security

- Never commit `.env` files
- Always use environment variables for sensitive data
- Validate all user input
- Follow OWASP top 10 security practices

## Performance

- Optimize images before committing
- Use lazy loading for heavy components
- Avoid unnecessary re-renders
- [Add project-specific performance rules]

## Documentation

- All public APIs must have JSDoc comments
- Complex logic should include explanation comments
- Update CLAUDE.md when new patterns emerge
- Keep README.md up to date

## Common Pitfalls

[Add issues you've encountered and how to avoid them]

Example:
- Issue: Using wrong package manager
- Solution: Always use pnpm, not npm or yarn

## Resources

- [Project documentation link]
- [Design system link]
- [API documentation link]

---

**Last Updated**: 2026-02-07
**Maintained By**: Team

> 💡 Tip: Update this file during code reviews when you notice patterns or issues
