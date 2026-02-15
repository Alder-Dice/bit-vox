# Project Status

> Last updated: 2026-02-14

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

### Phase 2: SAM Integration & UI 🔄 CURRENT
- [x] Research sam-js npm package / vendor options
- [x] Create SAM wrapper module (`src/lib/sam.js`)
- [x] Replace formant synthesis engine with SAM rendering
- [x] Implement per-syllable SAM parameters (speed, pitch, throat, mouth)
- [x] Global voice controls with per-card override
- [x] C64-themed UI overhaul (Press Start 2P font, greyscale palette, scanlines, blocky styling)
- [x] Remove "Deluge Ready" footer box
- [ ] Test pitch mapping: `SAM_Pitch = 22050 / Frequency_Hz`
- Depends on: Phase 1

### Phase 3: Refactor App.jsx ⏳
- [ ] Analyse extraction boundaries in App.jsx [Gemini]
- [ ] Extract audio engine into separate module [Sonnet]
- [ ] Extract Deluge export logic into separate module [Sonnet]
- [ ] Extract syllable card component [Sonnet]
- [ ] Clean up state management [Opus]
- Depends on: Phase 2

### Phase 4: UI Polish & Features ⏳
- [ ] Improved phoneme editor (dropdown with all SAM phonemes)
- [ ] Visual waveform preview
- Depends on: Phase 3

### Phase 5: Testing & Deluge Validation ⏳
- [ ] Test WAV export on actual Deluge hardware
- [ ] Verify slice alignment at 8/16/32/64 counts
- [ ] Cross-browser audio testing
- [ ] Mobile responsiveness
- Depends on: Phase 4

---

## Current Focus

**Phase 2: SAM Integration & UI**

Working on: SAM integration complete. C64 UI overhaul complete (greyscale palette). Uncommitted — user testing pending.

### Completed This Phase
- [x] SAM wrapper module created
- [x] Formant engine replaced with SAM rendering
- [x] Per-syllable SAM parameters (pitch, speed, mouth, throat)
- [x] Global voice controls, collapsible per-card overrides
- [x] C64 UI: Press Start 2P pixel font, greyscale palette, scanline overlay
- [x] C64 UI: Square borders, no rounded corners, blocky slider styling
- [x] C64 UI: Pad numbers as [01] [02] bracket style
- [x] Removed "Deluge Ready" footer box, kept stats row

### Blocked / Known Issues
1. ~~**Node.js version**: Resolved — Node 22 installed via nvm (2026-02-15)~~

---

## Quick Reference

**To resume**: Start at "Current Focus" above.

**Recent commits**: `git log --oneline -10`

**Gotchas**: Check `.claude/LESSONS.md`
