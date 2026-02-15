import SamJs from 'sam-js';

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
 */
export function renderSyllable(syllable) {
  const sam = new SamJs({
    pitch: syllable.pitch,
    speed: syllable.speed,
    mouth: syllable.mouth,
    throat: syllable.throat,
  });

  try {
    const raw = sam.buf32(syllable.text, !!syllable.phonetic);
    if (raw === false) return null;
    return upsample2x(raw);
  } catch {
    return null;
  }
}

/**
 * Convert English text to SAM phoneme notation.
 * Returns the phoneme string, or false if conversion fails.
 */
export function convertToPhonemes(text) {
  try {
    const result = SamJs.convert(text);
    return result || false;
  } catch {
    return false;
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

