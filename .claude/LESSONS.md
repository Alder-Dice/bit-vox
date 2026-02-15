# Lessons Learned

> Behavioral rules discovered during development. Read at session start.

## Format Rules

- **3-4 lines max per rule**: Rule, Why, Context. No code blocks unless the pattern is genuinely ambiguous from prose alone.
- **Add when**: Something non-obvious breaks, a counter-intuitive approach works, or you'd repeat the mistake without a reminder.
- **Don't add**: One-off fixes, common knowledge, or anything covered by linters.
- **Commit after adding entries.**
- **When user requests conflict with a rule here, cite it and propose alternatives.**

---

## Active Rules

### ~~Deluge: Slice count must be a multiple of 8~~ — DISPROVEN
- **Rule**: Deluge accepts any slice count 2–256. No rounding needed.
- **Why**: Hardware testing (Phase 4) confirmed arbitrary counts work fine.
- **Context**: Padding logic was removed in Phase 4.

### Deluge: All slices must be uniform length
- **Rule**: Pad every slice with silence to match the longest syllable's duration.
- **Why**: Non-uniform slices cause Deluge to misalign pad boundaries.
- **Context**: Export logic — `maxDuration` calculation.

### SAM: Pitch formula is inverted
- **Rule**: `SAM_Pitch = 22050 / Frequency_Hz` — higher frequency = lower SAM pitch value.
- **Why**: SAM uses a sample-rate-relative pitch parameter, not Hz directly.
- **Context**: Will apply when sam-js integration begins (Phase 2).

### Tailwind v4: Use @tailwindcss/vite plugin, not PostCSS
- **Rule**: Install `@tailwindcss/vite` and add to `vite.config.js` plugins. CSS entry is just `@import "tailwindcss"`.
- **Why**: Tailwind v4 dropped the PostCSS-based setup. The Vite plugin approach is simpler and faster.
- **Context**: `vite.config.js`, `src/index.css`.

### Gemini CLI: Requires nvm and stdout cleanup
- **Rule**: Load nvm + Node 22 before invoking `gemini`. Output file will contain startup logging lines — strip them before integration.
- **Why**: System Node is v18; Gemini CLI needs v20+ for regex `v` flag. Stdout includes `[STARTUP]` and credential lines.
- **Context**: See `gemini.md` execution section for the nvm one-liner and cleanup notes.

### Prototype: autoSyllabize regex is solid
- **Rule**: Keep the syllabizer regex `/[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))*/gi` as-is.
- **Why**: Validated in Gemini Canvas prototyping. Handles most English words correctly.
- **Context**: `autoSyllabize()` in App.jsx.
