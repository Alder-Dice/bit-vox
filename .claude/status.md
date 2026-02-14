# Project Status

> Last updated: 2026-02-14

---

## Roadmap

### Phase 1: Prototype & Project Setup 🔄 CURRENT
- [x] Gemini Canvas prototype (formant-based speech synth)
- [x] Vite/React project scaffolding
- [x] Flatten project structure
- [x] Install dependencies (lucide-react)
- [x] Project documentation (CLAUDE.md, status.md, architecture.md, LESSONS.md)
- [ ] Install & configure Tailwind CSS (prototype uses Tailwind classes)
- [ ] Initialize git repository
- [ ] Verify prototype runs correctly in dev server

### Phase 2: SAM Integration ⏳
- [ ] Research sam-js npm package / vendor options
- [ ] Create SAM wrapper module (`src/lib/sam.js`)
- [ ] Replace formant synthesis engine with SAM rendering
- [ ] Implement per-syllable SAM parameters (speed, pitch, throat, mouth)
- [ ] Test pitch mapping: `SAM_Pitch = 22050 / Frequency_Hz`
- Depends on: Phase 1

### Phase 3: Refactor App.jsx ⏳
- [ ] Extract audio engine into separate module
- [ ] Extract Deluge export logic into separate module
- [ ] Extract syllable card component
- [ ] Clean up state management
- Depends on: Phase 2

### Phase 4: UI Polish & Features ⏳
- [ ] Per-syllable SAM timbre controls (throat, mouth sliders)
- [ ] Global vs per-syllable parameter toggle
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

**Phase 1: Prototype & Project Setup**

Working on: Documentation setup and project structure cleanup

### Completed This Phase
- [x] Gemini Canvas prototype ported to App.jsx
- [x] Project structure flattened (removed nested bit-vox/ directory)
- [x] lucide-react installed
- [x] Documentation initialized

### In Progress
- [ ] Tailwind CSS installation
- [ ] Git init + first commit

### Blocked / Known Issues
1. **Tailwind not installed**: App.jsx uses Tailwind classes extensively but Tailwind CSS is not configured. UI will not render correctly until installed.
   - Impact: App renders but without any styling
   - Next step: Install Tailwind CSS v4 and configure with Vite
2. **Node.js version**: System has Node 18.19.1, Vite 7.x wants 20.19+. Builds work but shows warning.
   - Impact: Warning only, no functional issue yet
   - Next step: Consider upgrading Node or pinning Vite version

---

## Quick Reference

**To resume**: Start at "Current Focus" above.

**Recent commits**: `git log --oneline -10`

**Gotchas**: Check `.claude/LESSONS.md`
