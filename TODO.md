# Pulseboard - Task List

This file tracks planned features and tasks. Tasks are created by Claude and implemented by other agents (e.g., ChatGPT Codex).

## Task Status Key

- 🔴 **Blocked**: Cannot proceed due to dependencies or issues
- 🟡 **In Progress**: Currently being worked on
- 🟢 **Completed**: Task finished and verified
- ⚪ **Pending**: Not yet started

---

## Current Sprint

_No active tasks at the moment._

---

## Backlog

### High Priority

_No items._

### Medium Priority

_No items._

### Low Priority

_No items._

---

## Completed Tasks

_Tasks will be moved here once completed._

---

## Agent Assignment Guidelines

- **Claude**: Planning, bug fixes, documentation, code review
- **Codex/Other Agents**: Feature implementation, large code changes
- Only the assigned agent should update their task status
- If taking over a task, update "Assigned To" field and notify in commit message

---

## Task Template

When adding new tasks, use this format:

```markdown
### [Status] Task Title

**Priority**: High | Medium | Low
**Assigned To**: Unassigned | Claude | Codex | [Agent Name]
**Created**: YYYY-MM-DD
**Due**: YYYY-MM-DD (optional)

**Description**:
Brief description of what needs to be done.

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Files Affected** (estimate):
- path/to/file1.ts
- path/to/file2.tsx

**Context**:
Any relevant background information, file paths, or implementation notes.

**Dependencies**:
- List any tasks that must be completed first
- Or technologies/services that must be available

**Notes**:
Additional information, edge cases, or considerations.

**Before Starting**:
1. Update **WORKING.md** with this task
2. Change status to 🟡 In Progress
3. Update "Assigned To" if not already assigned
4. Pull latest changes: `git pull`
```

---

## Guidelines for Implementation Agents

When picking up a task:
1. ✅ Check **WORKING.md** for conflicts
2. ✅ Update **WORKING.md** with your work
3. ✅ Change task status to 🟡 In Progress
4. ✅ Pull latest: `git pull`
5. ✅ Implement following **AGENTS.md** guidelines
6. ✅ Update **CHANGELOG.md** with changes
7. ✅ Commit with format: `[agent] type: description`
8. ✅ Update task status to 🟢 Completed
9. ✅ Clear **WORKING.md** entry
