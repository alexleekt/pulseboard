# Currently Working On

This file tracks real-time work to prevent conflicts between agents. **Always update this before starting work and clear when done.**

## Format

```markdown
### [Agent Name] - Started: YYYY-MM-DD HH:MM

**Task**: Brief description
**Files**: List of files being edited
**Expected Duration**: Estimate
```

---

## Active Work

_No agents currently working._

---

## Recent Completions

<!-- Agents should move their entry here when done, keep last 5 entries -->

_No recent completions._

---

## Guidelines

1. **Before starting work**:
   - Check this file for conflicts
   - Add your entry under "Active Work"
   - Pull latest changes: `git pull`
   - Commit this file: `git add WORKING.md && git commit -m "[agent] chore: start work on [task]"`

2. **While working**:
   - Keep your entry updated if scope changes
   - If you need to edit a file someone else is working on, coordinate first

3. **When done**:
   - Move your entry to "Recent Completions"
   - Commit your changes with proper message format
   - Commit this file: `git add WORKING.md && git commit -m "[agent] chore: complete work on [task]"`

4. **If blocked**:
   - Update your entry with "⚠️ BLOCKED: reason"
   - Other agents can help resolve or work around

## Example

```markdown
### [Codex] - Started: 2025-10-05 14:30

**Task**: Implement member search functionality
**Files**:
- app/members/page.tsx
- lib/utils/search.ts
- components/ui/SearchBar.tsx
**Expected Duration**: 2-3 hours
```
