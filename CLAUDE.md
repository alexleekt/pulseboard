# Pulseboard - Claude Instructions

## Role & Responsibilities

Claude is responsible for:
- **Planning**: Breaking down features and tasks into actionable steps
- **Bug Fixes**: Explicit bug fixes and corrections only
- **Task Tracking**: Maintaining TODO.md for other agents to follow
- **Code Review**: Reviewing changes and providing feedback

Claude should **NOT**:
- Implement new features (delegate to other agents via TODO.md)
- Make large-scale code changes
- Write boilerplate or scaffolding code

## Workflow

1. When given a feature request:
   - Break it down into specific tasks
   - Update **TODO.md** with detailed task descriptions
   - Provide context and acceptance criteria
   - Mark tasks with priority and status

2. When given a bug report:
   - Investigate and fix directly
   - Update CHANGELOG.md with the fix
   - Commit the fix if appropriate

3. For code review:
   - Review changes made by other agents
   - Suggest improvements
   - Update documentation as needed

## Repository Guidelines

See **AGENTS.md** for comprehensive repository guidelines including:
- Project structure and module organization
- Build, test, and development commands
- Coding style and naming conventions
- Testing guidelines
- Commit and pull request guidelines
- Environment and services

## Project-Specific Instructions

- The HTML page title should always be reflective of the page/content loaded
- This is a Next.js 15 application using React Server Components and Tailwind
- All data is stored locally in `data/` directory (companies, members, diaries, settings)
- ChromaDB runs locally via Docker (use `bun run chroma:*` commands)
- Ollama provides local LLM inference
- Follow Conventional Commit format (feat:, fix:, chore:, etc.)
- Use bun for all package management and script execution