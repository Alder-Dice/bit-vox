# Architecture

> System design and technical details. Read when you need deeper context.

## Overview

Bit-Vox is a browser-based speech synthesizer targeting the Synthstrom Deluge groovebox. Users type text, which gets broken into syllables. Each syllable becomes a "pad" with configurable pitch, duration, and phoneme content. The app renders these syllables as audio and exports a WAV file formatted specifically for the Deluge's "Slice Kit" mode.

The current prototype uses a custom formant synthesis engine (dual bandpass filters on a sawtooth oscillator). The planned upgrade replaces this with sam-js, a JavaScript port of the C64's "Software Automatic Mouth" (SAM) speech chip.

## Components

### Text-to-Syllable Engine
**Purpose**: Converts typed text into an array of syllable objects
**Location**: `src/App.jsx` (inline — `autoSyllabize()` and `convertTextToSyllables()`)
**Key logic**:
- Regex syllabizer: `/[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))*/gi`
- Character-to-phoneme mapping via `CHAR_TO_PHONEME` lookup table
- Fallback: chunks text into groups of 3 if no vowels found

### Audio Engine (Current: Formant Synthesis)
**Purpose**: Renders phonemes as audio using Web Audio API
**Location**: `src/App.jsx` (inline — `playPhoneme()`, `playFullSyllable()`)
**How it works**:
- Vowels: Sawtooth oscillator → two parallel bandpass filters (F1/F2 formants) → gain envelope
- Consonants (sibilants): White noise → highpass filter → gain envelope
- Formant frequencies defined in `FORMANT_TABLE` constant

### Audio Engine (Planned: SAM)
**Purpose**: Replace formant synthesis with sam-js for authentic 8-bit speech
**Location**: `src/lib/sam.js` (to be created)
**Key formula**: `SAM_Pitch = 22050 / Frequency_Hz`
**SAM parameters**: speed, pitch, throat (formant shape), mouth (formant shape)

### Sequencer UI
**Purpose**: Visual grid of syllable "cards" with per-syllable controls
**Location**: `src/App.jsx` (JSX return block)
**Per-syllable controls**: phoneme chips (add/remove), note selector, octave selector, duration slider, preview button
**Global controls**: Preview (play sequence), Export (generate WAV)

### Deluge Export Engine
**Purpose**: Renders the full sequence to a WAV file with Deluge-compatible formatting
**Location**: `src/App.jsx` (inline — `handleExport()`, `writeWavHeader()`)
**Critical constraints**:
- Total slices must be a multiple of 8: `targetSliceCount = Math.ceil(count / 8) * 8`
- All slices uniform length (padded to longest syllable duration)
- Empty "ghost" slices are silence (OfflineAudioContext zeros)
- Output: 44100 Hz, 16-bit PCM, mono WAV

### Stats Footer
**Purpose**: Shows Deluge-relevant metrics (active slices, target pad count, uniform slice length)
**Location**: `src/App.jsx` (fixed bottom bar)

## Data Flow

```
[Text Input] → autoSyllabize() → [Syllable State Array]
                                        ↓
                                  [Sequencer UI Cards]
                                        ↓
                              playFullSyllable() per card
                                        ↓
                              [Web Audio API / SAM] → Speaker
                                        ↓
                              handleExport()
                                        ↓
                              [OfflineAudioContext] → writeWavHeader() → .wav download
```

## Syllable State Shape

```javascript
{
  id: Number,           // Unique identifier
  phonemes: String[],   // e.g. ['S', 'AE']
  note: String,         // e.g. 'C', 'F#'
  octave: Number,       // 1-4
  duration: Number      // seconds (0.1 - 1.5)
}
```

## External Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| react / react-dom | UI framework | Installed |
| lucide-react | Icon components | Installed |
| sam-js | SAM speech synthesis | Not yet installed (Phase 2) |
| tailwindcss | Utility CSS framework | Not yet installed (Phase 1) |

## Configuration

**No environment variables required** — this is a purely client-side app.

**Config files**:
- `vite.config.js` — Vite build config (React plugin)
- `eslint.config.js` — Linting rules

## Testing Strategy

No tests yet. Planned:
- Unit tests for syllabizer regex edge cases
- Integration tests for WAV export format correctness
- Manual testing on Deluge hardware for slice alignment

---

## Modification Guidelines

**Replacing the audio engine (Phase 2)**:
1. Create `src/lib/sam.js` wrapper
2. Replace `playPhoneme()` and `playFullSyllable()` to use SAM
3. Keep the same function signatures — the sequencer UI calls them the same way
4. Update `handleExport()` to use SAM via OfflineAudioContext

**Adding a new syllable control**:
1. Add field to syllable state shape
2. Add UI control in the syllable card JSX
3. Pass to audio engine functions

**Changing export format**:
- The multiple-of-8 math in `handleExport()` is Deluge-specific. Do not change unless Deluge firmware changes.
- `writeWavHeader()` follows standard PCM WAV spec. Modify with caution.
