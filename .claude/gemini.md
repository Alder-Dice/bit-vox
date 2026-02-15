# Gemini Delegation Reference

> Prompt construction, execution, validation, and output conventions for Gemini CLI delegation.
> Read this when delegating — not every session.

---

## Gemini's Strengths

**Generative**: Visual/creative (shaders, particles, animations, generative art, UI polish), algorithmic (noise, physics, DSP/FFT, easing, procedural generation), rapid variation exploration.

**Analytical**: Massive context window — can absorb entire codebases. Code review, second opinions, audits, bug hunting, refactoring analysis, documentation generation, consistency checks.

---

## Pattern 1: Generative (small prompt → large output)

### Prompt Template

```
TASK: [Clear description of what to generate]

REQUIREMENTS:
- [Framework/API constraints]
- [Performance targets]
- [Integration points — what Claude will connect to]

FREEDOM:
- [What Gemini can decide: visual style, algorithm choice, structure]

OUTPUT:
- Single file, no markdown fences, no explanation text
- [Language/format]: [specific format, e.g. "ES6 module", "Python function"]
- No imports beyond: [explicit allowlist]

VALIDATE: [First/last line expectations, e.g. "First line: export/class, Last char: }/;"]
```

**Key principle**: Constrain the technical interface. Free the creative/generative decisions.

### Execution

**Prerequisites**: Gemini CLI requires Node 20+. System Node is v18 — **prefix every Bash tool call** that invokes `gemini` with the nvm loader (shell state doesn't persist between Bash calls):
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 && gemini "..."
```

**Stdout contamination**: Gemini CLI prints startup logging to stdout (`[STARTUP] ...`, `Loaded cached credentials.`). When redirecting to a file, always **post-process** to strip non-content lines, or validate/clean the output before integration.

```bash
mkdir -p .gemini/output
gemini "[CONSTRUCTED PROMPT]" > .gemini/output/[descriptive-name].js 2>&1

# Variations (batch in one session for cache efficiency)
for i in 1 2 3; do
    gemini "[PROMPT with variation direction $i]" > .gemini/output/variant_$i.js 2>&1
done
```

### Validation

```bash
OUT=".gemini/output/[file]"

# Syntax check
node --check "$OUT" || { echo "Syntax error"; exit 1; }

# Structure check
grep -q '^export\|^class\|^function' "$OUT" || echo "Unexpected structure"

# Strip markdown fences if present
grep -q '```' "$OUT" && sed -i '/```/d' "$OUT"
```

---

## Pattern 2: Analytical (large codebase context → focused output)

### When to Use

- Second opinion on architecture or approach
- Code audit / consistency check across files
- Bug analysis — "here's the symptom, find likely causes"
- Refactoring analysis — "how would you restructure X?"
- Test generation from existing code
- Documentation or dependency mapping

### Prompt Template

```
Read the following files:
- [path/to/file1]
- [path/to/file2]
- [path/to/directory/*]

TASK: [Specific question or analysis to perform]

OUTPUT:
- Write to: .gemini/output/[descriptive-name].md
- Format: [markdown | json | code]
- Structure: [specific sections, schema, or checklist]
- Findings only — no preamble, no restating the task
```

### Input Specification

Claude must explicitly list what Gemini should read:

- **Specific files**: when the question is scoped (e.g. "review this module")
- **Entire codebase**: when the question requires full picture (e.g. "find all inconsistent patterns")
- **Files + context docs**: include `.claude/architecture.md` or `LESSONS.md` when Gemini needs project conventions

Keep the prompt itself short — the codebase IS the context. Don't summarise code in the prompt that Gemini can read directly.

### Execution

```bash
mkdir -p .gemini/output

# Analytical task — Gemini reads files directly
gemini "Read the following files:
- src/App.jsx
- src/core/engine.js

TASK: Identify any event listeners that are registered but never cleaned up on unmount.

OUTPUT:
- Write to: .gemini/output/listener-audit.md
- Format: markdown checklist
- For each finding: file, line number, listener, and suggested fix
- Findings only — no preamble" > .gemini/output/listener-audit.md 2>&1
```

### Validation

Claude reviews the output for:
- Does it answer the specific question asked?
- Are file/line references accurate? (spot-check 2-3)
- Are recommendations sound? (Claude's judgement as integrator)
- Any findings Claude should act on immediately?

---

## Output Conventions

**Directory**: `.gemini/output/` — add to `.gitignore`. Disposable artifacts; only integrated results get committed.

**Naming**: descriptive, pattern-based: `particles-v1.js`, `listener-audit.md`, `refactor-plan.md`

---

## Integration

- **Good output**: Claude integrates into project, adapts to match existing patterns/style
- **Interesting but flawed**: Claude refines the approach (don't re-delegate for small fixes)
- **Off-target**: Rephrase prompt with tighter constraints, re-delegate

Commit normally using project git conventions. No special attribution needed.

---

## Decomposition Pattern

When planning a phase or large task, ask:

1. What components are **self-contained and generatively expensive**? → Gemini generates
2. What requires **deep codebase understanding** that would cost Opus many tokens to read? → Gemini analyses
3. What needs **project context, integration, or debugging**? → Claude handles
4. Where would **variations help the user decide direction**? → Gemini generates, user picks, Claude integrates once

Track delegated sub-tasks in status.md like any other work.
