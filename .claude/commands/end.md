# /end - Session End

Run this before ending a work session to ensure documentation is updated.

## Instructions

1. **Review what was done** - List commits made this session (`git log --oneline -10`)

2. **Update status.md** - Edit `.claude/status.md`, obeying its rules:
   - Move completed items to [x]
   - Update "In Progress" section
   - Add any new blockers/issues discovered
   - Update the "Last updated" date

3. **Check for lessons** - Ask yourself:
   - Did anything break unexpectedly?
   - Did I discover a gotcha or pattern?
   - Would future-me benefit from a note? And would that benefit be enough to justify the token cost? (All instances of future-me will read the lesson on session start)

   If yes, add to `.claude/LESSONS.md`, obeying its rules

4. **Summarize for user** - Report what was updated

## Output Format

```
## Session End

**Completed this session**:
- [list of things done]

**Status.md updated**:
- [changes made]

**Lessons added**: [Yes/No - if yes, briefly what]

**Next session should**: [suggested starting point]
```

## Required Actions

You MUST:
- Edit `.claude/status.md` with current state
- Check for uncommitted changes (`git status`) and ask the user if they want to commit before ending
