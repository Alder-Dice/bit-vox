# Lessons Learned

> Behavioral rules discovered during development. Read at session start.

---

## How to Use This File

**Add entries when**:
- Something non-obvious breaks and you figure out why
- A counter-intuitive approach works better than the "obvious" one
- You're likely to make the same mistake again without a reminder

**Don't add**:
- One-off bug fixes
- Common knowledge
- Things covered by linters/formatters

**Format**:
```markdown
### [Tech/Area]: [What to do / What not to do]
- **Rule**: Specific actionable behavior
- **Why**: Brief rationale
- **Context**: Where this applies
```

---

## Active Rules

### Deluge: Slice count must be a multiple of 8
- **Rule**: `targetSliceCount = Math.ceil(count / 8) * 8` — never skip this
- **Why**: Deluge hardware expects 8/16/32/64 slices for automatic pad mapping. Wrong count = slices won't align to pads.
- **Context**: `handleExport()` in App.jsx

### Deluge: All slices must be uniform length
- **Rule**: Pad every slice with silence to match the longest syllable's duration
- **Why**: Non-uniform slices cause Deluge to misalign pad boundaries
- **Context**: Export logic — `maxDuration` calculation

### SAM: Pitch formula is inverted
- **Rule**: `SAM_Pitch = 22050 / Frequency_Hz` — higher frequency = lower SAM pitch value
- **Why**: SAM uses a sample-rate-relative pitch parameter, not Hz directly
- **Context**: Will apply when sam-js integration begins (Phase 2)

### Prototype: autoSyllabize regex is solid
- **Rule**: Keep the syllabizer regex `/[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))*/gi` as-is
- **Why**: Validated in Gemini Canvas prototyping. Handles most English words correctly.
- **Context**: `autoSyllabize()` in App.jsx

---

## Debugging Notes

(None yet)
