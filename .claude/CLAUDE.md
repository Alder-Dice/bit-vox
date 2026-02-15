# Project: Bit-Vox

> Web-based 8-bit speech synthesizer that creates auto-slicing "Slice Kits" for the Synthstrom Deluge groovebox.

## Stack
JavaScript | React (Vite) | Web Audio API, lucide-react

## Key Files
```
src/
├── main.jsx         # React DOM entry point
├── App.jsx          # Core UI, state, sequencer logic, audio engine, export
├── index.css        # Global styles (Vite default - Tailwind not yet installed)
└── assets/          # Static assets
```

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Critical Rules
- Deluge export MUST produce slice counts in multiples of 8 (8, 16, 32, 64)
- All slices in exported WAV MUST be uniform length (padded to longest)
- SAM pitch formula: `SAM_Pitch = 22050 / Frequency_Hz` — do not change this math
- Never commit .env files or API keys

## Delegation

**During planning (including plan mode), decompose work to identify tasks for delegation.** Tag tasks in status.md with [Sonnet], [Gemini], or [Opus]. Also watch for ad-hoc opportunities during execution. All delegated tasks need well-specified inputs/outputs and verifiable results.

**Gemini CLI** (see `.claude/gemini.md` for prompt templates and execution):
- *Generative*: small prompt → large output (components, algorithms, variations, boilerplate)
- *Analytical*: codebase as context → focused output (audits, reviews, bug analysis, docs). Gemini reads files directly; keep the prompt short.

**Sonnet subagents** (Task tool, model: sonnet):
- Scoped, mechanical, pattern-available. Doing, not deciding.
- Run independent tasks in parallel. Specify: file path, exact change, pattern to follow.

**Keep on Opus**: architecture, trade-offs, novel design, cross-cutting judgment. Also any task where Opus already has context loaded and the work is small — don't over-delegate.

## Git Conventions

**status.md phases = high-level tracking | Git = incremental code changes**

- One status.md phase -> multiple git commits.
- No GitHub remote — do not use `gh` CLI. Track issues in `status.md`

### Commit Format
`Phase N: Brief description of what was accomplished`

Example: `Phase 2: Add user authentication flow`

### Commit Frequently At
- Significant sub-task completion
- Working states worth preserving
- Before risky changes
- Before switching tasks

### Rules
- Always reference the current phase/task in commit messages
- Never commit secrets, credentials, or .env files
- Commit documentation changes alongside code changes (not separately)
- Default commit note: "Implementation complete - user testing pending"
- Only mark "Complete and tested" after user confirms

---

## Commands

| Command | When to use |
|---------|-------------|
| `/start` | Beginning of session - loads status & lessons |
| `/end` | End of session - updates docs, summarizes |
| `/status` | Mid-session - quick status.md update |
| `/lesson` | Capture a gotcha or pattern |
| `/refresh` | After context compaction - reload all docs |
| `/gemini` | Delegate a task to Gemini CLI |

**User: Prompt me with these commands to keep documentation current.**

---

## Documentation Locations

| What | Where | When to update |
|------|-------|----------------|
| Current status & roadmap | `status.md` | Every session |
| Gotchas & patterns | `LESSONS.md` | When you learn something |
| System design | `architecture.md` | When design changes |
| Commit history | `git log` | Never duplicate elsewhere |
| Gemini delegation | `gemini.md` | When delegation patterns change |
