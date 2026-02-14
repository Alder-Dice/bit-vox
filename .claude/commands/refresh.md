# /refresh - Reload Context After Compaction

Run this after context compaction to restore documentation awareness.

## Instructions

1. **Read CLAUDE.md** - Re-read `.claude/CLAUDE.md` to restore critical rules, git conventions, and command references

2. **Read status.md** - Re-read `.claude/status.md` and note:
   - Current phase and what's in progress
   - Any blockers or known issues

3. **Read LESSONS.md** - Re-read `.claude/LESSONS.md` and note all active rules

4. **Confirm to user** - Briefly report what was restored

## Output Format

```
## Context Refreshed

**Phase**: [current phase from status.md]
**In progress**: [from status.md]
**Blockers**: [from status.md or "None"]
**Active lessons**: [count] rules loaded
**Git convention**: [commit format from CLAUDE.md]

Context restored. Ready to continue.
```

## When to Use

- After seeing "context compacted" or similar messages
- When Claude seems to have forgotten project conventions
- When the user notices Claude repeating mistakes covered in LESSONS.md
