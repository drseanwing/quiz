# Contributing to REdI Quiz Platform

Thank you for your interest in contributing to the REdI Quiz Platform! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize patient safety and data security in all contributions

## Getting Started

1. **Fork and Clone**
   ```bash
   git clone <your-fork-url>
   cd quiz
   ```

2. **Set Up Development Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## Development Workflow

### Making Changes

1. **Code Standards**
   - Follow TypeScript strict mode
   - Use existing code patterns
   - Add JSDoc comments to functions
   - Follow naming conventions in CLAUDE_INSTRUCTIONS.md

2. **Testing**
   ```bash
   # Backend
   cd backend
   npm run lint
   npm run typecheck
   npm test

   # Frontend
   cd frontend
   npm run lint
   npm run typecheck
   npm test
   ```

3. **Commit Messages**
   Use conventional commits format:
   ```
   type(scope): subject

   body

   footer
   ```

   Types: feat, fix, docs, style, refactor, test, chore

   Examples:
   - `feat(quiz): add image map question type`
   - `fix(auth): resolve token refresh issue`
   - `docs(api): update authentication endpoint docs`

### Pull Requests

1. **Before Submitting**
   - Ensure all tests pass
   - Update documentation if needed
   - Add tests for new features
   - Check for security implications

2. **PR Description**
   - Use the pull request template
   - Describe what changed and why
   - Link related issues
   - Add screenshots for UI changes

3. **Review Process**
   - Address reviewer feedback
   - Keep PR scope focused
   - Squash commits before merging

## Development Guidelines

### Backend

- Use Prisma for all database operations
- Implement proper error handling
- Log important events with context
- Validate all user input
- Write integration tests for API endpoints

### Frontend

- Use functional components with hooks
- Follow REdI design tokens for styling
- Ensure accessibility (WCAG 2.1 AA)
- Test keyboard navigation
- Use React Query for server state

### Security

- Never commit secrets or credentials
- Sanitize all HTML input
- Validate file uploads
- Use parameterized queries
- Follow OWASP guidelines

### Database

- Create migrations for schema changes
- Test migrations both up and down
- Update Prisma schema
- Document breaking changes

## Project Structure

See [CLAUDE_INSTRUCTIONS.md](../CLAUDE_INSTRUCTIONS.md) for detailed project structure and guidelines.

## Questions?

- Check existing documentation
- Review closed issues and PRs
- Ask in pull request comments

## License

By contributing, you agree that your contributions will be subject to the project's proprietary license.
