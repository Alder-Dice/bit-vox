# Project Status

> Last updated: 2026-02-15 (Phase 6 in progress)

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

### Phase 5: Step-Sequencer Card UI ✅
- [x] Replace VOICE slider panel with 5 mode cards (PH, PITCH, SPEED, MOUTH, THROAT)
- [x] Two card modes: menu (phoneme editing) and step (draggable bar overlay)
- [x] Cross-card drag — draw values across syllable cards in step mode
- [x] Global offset drag with clamping — drag param card to shift all syllables uniformly
- [x] Conditional UI — hide phoneme input/picker/play in step mode, keep delete
- [x] CSS touch-action for mobile drag surfaces
- Depends on: Phase 4

---

### Phase 6: UI Polish & Branding (In Progress)
- [x] Compact header controls — preview/export as icon buttons in generate row
- [x] Per-parameter colors (yellow, orange, ltblue, purple) for mode cards and step bars
- [x] Color-reactive input text and generate button
- [x] Remove card number badges
- [x] Remove fixed stats footer — inline slice info next to controls
- [x] SVG graffiti header banner (Gemini-generated, replaces h1)
- [ ] Refine header SVG with Gemini — iterate on letter style, fill space better [Gemini]
- [ ] Cross-browser audio testing (from Phase 4 backlog)
- [ ] Mobile responsiveness testing (from Phase 4 backlog)

---

## Current Focus

**Phase 6 in progress.** UI polish and branding. Header SVG integrated but needs refinement.

### Next up
- Iterate on header SVG with Gemini (letter style, graffiti energy, space filling)
- Cross-browser / mobile testing

### Blocked / Known Issues
_(none)_

---

## Quick Reference

**To resume**: Start at "Current Focus" above.

**Recent commits**: `git log --oneline -10`

**Gotchas**: Check `.claude/LESSONS.md`
