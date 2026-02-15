# /gemini - Delegate Task to Gemini CLI

User wants to explicitly delegate a task (or part of one) to Gemini.

## Instructions

1. **Identify the task** - Ask the user what to delegate, or use context from current work

2. **Determine the pattern**:
   - **Generative** (small prompt → large output): components, algorithms, boilerplate, variations
   - **Analytical** (large context → focused output): reviews, audits, second opinions, bug analysis
   - If neither fits well, explain why and suggest an alternative

3. **Read `.claude/gemini.md`** - Load the reference doc for the appropriate prompt template, output conventions, and validation steps

4. **Construct prompt, execute, validate, integrate** - Follow the patterns in `gemini.md`:
   - Generative: compact prompt, strict output format, syntax validation
   - Analytical: specify exact file paths for Gemini to read, define output structure and location

5. **Report** - Tell the user what was delegated, what came back, and what was integrated or discarded

## When to Use

- User says "delegate this" or "have Gemini do this"
- User wants variations or rapid prototyping
- User wants a second opinion or codebase analysis
- Claude has already identified a delegatable task and user confirms
