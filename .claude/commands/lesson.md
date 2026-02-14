# /lesson - Capture a Lesson Learned

Add a gotcha or pattern to LESSONS.md.

## Instructions

1. **Identify what was learned** - Ask user or recall from recent work:
   - What broke unexpectedly?
   - What non-obvious thing worked?
   - What would you tell yourself before starting?

2. **Format the lesson**:
   ```markdown
   ### [Area]: [Brief rule]
   - **Rule**: [Specific actionable behavior]
   - **Why**: [What goes wrong otherwise]
   - **Context**: [When this applies]
   ```

3. **Add to LESSONS.md** - Append to the "Active Rules" section

4. **Confirm** - Tell user what was added

## Filtering

**DO add** if:
- Non-obvious (wouldn't know without hitting the problem)
- Likely to recur
- Project-specific (not general knowledge)

**DON'T add** if:
- One-off bug fix
- Covered by linters/formatters
- Common knowledge

## Example

```markdown
### Tone.js: Always disconnect() before dispose()
- **Rule**: When disposing LFO nodes, call disconnect() before dispose()
- **Why**: dispose() doesn't remove connections, causing ghost modulation
- **Context**: Any Tone.js node cleanup, especially in patch loading
```
