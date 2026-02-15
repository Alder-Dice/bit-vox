# Project Status

> Last updated: 2026-02-15

---

## Roadmap

### Phase 1: Prototype & Project Setup ✅
- [x] Gemini Canvas prototype (formant-based speech synth)
- [x] Vite/React project scaffolding
- [x] Flatten project structure
- [x] Install dependencies (lucide-react)
- [x] Project documentation (CLAUDE.md, status.md, architecture.md, LESSONS.md)
- [x] Install & configure Tailwind CSS v4
- [x] Initialize git repository
- [x] Clean up Vite template boilerplate (App.css, placeholder SVGs)
- [x] Verify prototype runs correctly in dev server

### Phase 2: SAM Integration & UI ✅
- [x] Research sam-js npm package / vendor options
- [x] Create SAM wrapper module (`src/lib/sam.js`)
- [x] Replace formant synthesis engine with SAM rendering
- [x] Implement per-syllable SAM parameters (speed, pitch, throat, mouth)
- [x] Global voice controls with per-card override
- [x] C64-themed UI overhaul (Press Start 2P font, greyscale palette, scanlines, blocky styling)
- [x] Remove "Deluge Ready" footer box
- [x] ~~Test pitch mapping~~ — Dropped. SAM has baked-in pitch intonation; not suitable for quantised note singing.
- Depends on: Phase 1

### ~~Phase 3: Refactor App.jsx~~ — Skipped
- Deferred as low-value this late in development.

### Phase 3: UI Polish & Features ✅
- [x] Phoneme editor — cards resolve to SAM phonemes, picker UI with all phonemes by category
- [x] ~~Visual waveform preview~~ — Dropped. Duplicates what any audio editor already provides.
- Depends on: Phase 2

### Phase 4: Testing & Deluge Validation ✅
- [x] Test WAV export on actual Deluge hardware — slices align perfectly
- [x] Remove multiples-of-8 padding constraint (Deluge accepts 2–256 slices)
- [x] Smart filenames from input text (e.g. `saturday_3slices.wav`)
- [x] Remove BLANK padding cards from UI
- [x] Simplify footer (remove DELUGE TARGET stat)
- [ ] Cross-browser audio testing
- [ ] Mobile responsiveness
- Depends on: Phase 3

---

## Current Focus

**Phase 4: Testing & Deluge Validation**

Core Deluge validation complete — hardware-tested, padding removed, filenames improved. Remaining: cross-browser and mobile testing.

### Completed This Phase
- Hardware test confirmed perfect slice alignment on Deluge
- Removed multiples-of-8 padding constraint (unnecessary — Deluge accepts any count 2–256)
- Export filenames derived from input text, fallback `bitvox`
- Removed BLANK padding cards and DELUGE TARGET footer stat
- Updated CLAUDE.md critical rules to reflect actual Deluge behavior

### Blocked / Known Issues
_(none)_

---

## Quick Reference

**To resume**: Start at "Current Focus" above.

**Recent commits**: `git log --oneline -10`

**Gotchas**: Check `.claude/LESSONS.md`
