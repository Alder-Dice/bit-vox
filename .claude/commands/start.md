# /start - Session Start

Begin every work session with this checklist.

## Instructions

1. **Read status.md** - Load `.claude/status.md` and summarize:
   - Current phase and what's in progress
   - Any blockers or known issues
   - What was the last thing completed

2. **Read LESSONS.md** - Load `.claude/LESSONS.md` and note any rules relevant to likely work

3. **Confirm understanding** - Tell the user:
   - "Current phase: [X]"
   - "In progress: [Y]"
   - "Blockers: [Z] or none"
   - "Ready to continue with [likely next task]"

4. **Create tasks** - If the user describes work, use `TaskCreate` to track it

## Output Format

```
## Session Start

**Current phase**: [from status.md]
**In progress**: [from status.md]
**Blockers**: [from status.md or "None"]
**Relevant lessons**: [any that apply, or "None specific"]

Ready to continue. What would you like to work on?
```
