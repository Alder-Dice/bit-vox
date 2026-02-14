# Bit-Vox

8-bit speech synthesizer that creates auto-slicing Slice Kits for the Synthstrom Deluge groovebox. Inspired by the C64's SAM (Software Automatic Mouth).

## What it does

1. Type a sentence (e.g. "ROBOT ACTIVATED")
2. Auto-syllabize into rhythmic chunks
3. Assign pitch, duration, and phonemes per syllable
4. Export a WAV file perfectly formatted for Deluge's pad grid

## Quick Start

```bash
npm install
npm run dev
```

## Documentation

```
.claude/
├── CLAUDE.md        # Core project instructions
├── status.md        # Current work & roadmap
├── architecture.md  # System design details
└── LESSONS.md       # Gotchas & patterns
```

## Stack

React (Vite) | Web Audio API | lucide-react
