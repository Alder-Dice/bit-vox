import SamJs from 'sam-js';

const SAM_SAMPLE_RATE = 22050;
const TARGET_SAMPLE_RATE = 44100;

/**
 * Upsample from 22050 Hz to 44100 Hz via nearest-neighbor (sample duplication).
 * Preserves the lo-fi 8-bit character.
 */
function upsample2x(input) {
  const output = new Float32Array(input.length * 2);
  for (let i = 0; i < input.length; i++) {
    output[i * 2] = input[i];
    output[i * 2 + 1] = input[i];
  }
  return output;
}

/**
 * Render a syllable object to a Float32Array at 44100 Hz.
 * Returns null if SAM fails to render the input.
 *
 * Syllable may provide pitch directly (numeric) or as note+octave
 * which gets converted via noteToSamPitch().
 */
export function renderSyllable(syllable) {
  const pitch = syllable.note
    ? noteToSamPitch(syllable.note, syllable.octave)
    : syllable.pitch;

  const sam = new SamJs({
    pitch,
    speed: syllable.speed,
    mouth: syllable.mouth,
    throat: syllable.throat,
  });

  try {
    const raw = sam.buf32(syllable.text, syllable.phonetic);
    if (raw === false) return null;
    return upsample2x(raw);
  } catch {
    return null;
  }
}

/**
 * Convert a Float32Array of samples (44100 Hz) to a Web Audio AudioBuffer.
 */
export function samplesToAudioBuffer(samples, audioContext) {
  const buffer = audioContext.createBuffer(1, samples.length, TARGET_SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  return buffer;
}

/**
 * Convert a musical note + octave to a SAM pitch value.
 * Formula: SAM_Pitch = 22050 / Frequency_Hz
 */
export function noteToSamPitch(note, octave) {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = NOTES.indexOf(note);
  const freq = 440 * Math.pow(2, (noteIndex - 9 + (octave - 4) * 12) / 12);
  return Math.round(SAM_SAMPLE_RATE / freq);
}
