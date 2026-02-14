import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Download, Plus, Trash2, Volume2, Music, Waves, Type, Zap, Grid, ArrowRight } from 'lucide-react';

// --- Vowel Formant Frequencies (Approximate for 8-bit sound) ---
// F1 and F2 frequencies define the "shape" of the vowel.
const FORMANT_TABLE = {
  'AA': { f1: 730, f2: 1090 }, // "Father"
  'AE': { f1: 660, f2: 1720 }, // "Cat"
  'AH': { f1: 640, f2: 1190 }, // "Cut"
  'AO': { f1: 570, f2: 840 },  // "Dog"
  'AW': { f1: 730, f2: 1090 }, // "Out" (starts as AA)
  'AY': { f1: 660, f2: 1720 }, // "Bite" (starts as AE)
  'EH': { f1: 530, f2: 1840 }, // "Pet"
  'ER': { f1: 490, f2: 1350 }, // "Fur"
  'EY': { f1: 530, f2: 1840 }, // "Plate" (starts as EH)
  'IH': { f1: 390, f2: 1990 }, // "Bit"
  'IY': { f1: 270, f2: 2290 }, // "Feet"
  'OW': { f1: 570, f2: 840 },  // "Go"
  'OY': { f1: 570, f2: 840 },  // "Toy"
  'UH': { f1: 440, f2: 1020 }, // "Book"
  'UW': { f1: 300, f2: 870 },  // "Boot"
  // Default fallback for consonants/others
  'DEFAULT': { f1: 500, f2: 1500 } 
};

// Fallback Map: Characters to Vowels/Consonants
const CHAR_TO_PHONEME = {
  'A': 'AE', 'B': 'B', 'C': 'K', 'D': 'D', 'E': 'EH', 
  'F': 'F', 'G': 'G', 'H': 'HH', 'I': 'IH', 'J': 'JH', 
  'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N', 'O': 'AA', 
  'P': 'P', 'Q': 'K', 'R': 'R', 'S': 'S', 'T': 'T', 
  'U': 'AH', 'V': 'V', 'W': 'UW', 'X': 'S', 'Y': 'Y', 'Z': 'Z'
};

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVES = [1, 2, 3, 4];

const App = () => {
  const [inputText, setInputText] = useState("");
  const [syllables, setSyllables] = useState([
    { id: 1, phonemes: ['S', 'AE'], note: 'C', octave: 2, duration: 0.4 },
    { id: 2, phonemes: ['T', 'ER'], note: 'C', octave: 2, duration: 0.4 },
    { id: 3, phonemes: ['D', 'EY'], note: 'E', octave: 2, duration: 0.6 },
  ]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSyllableIdx, setCurrentSyllableIdx] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  
  const audioContextRef = useRef(null);
  const isPlayingRef = useRef(false); 

  // --- Deluge Calculation Logic ---
  const maxDuration = Math.max(...syllables.map(s => s.duration), 0.1);
  const activeCount = syllables.length;
  // Round up to nearest multiple of 8
  const targetSliceCount = Math.ceil(Math.max(activeCount, 1) / 8) * 8;
  const paddingCount = targetSliceCount - activeCount;
  
  // --- Enhanced Audio Engine (Dual Formant) ---

  const getFrequency = (note, octave) => {
    const noteIndex = NOTES.indexOf(note);
    return 440 * Math.pow(2, (noteIndex - 9 + (octave - 4) * 12) / 12);
  };

  const createNoiseBuffer = (ctx) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const playPhoneme = (phoneme, note, octave, duration, context, startTime) => {
    const freq = getFrequency(note, octave);
    const isSibilant = ['S', 'SH', 'F', 'TH', 'T', 'K', 'P', 'HH'].includes(phoneme);
    const formants = FORMANT_TABLE[phoneme] || FORMANT_TABLE['DEFAULT'];

    const masterGain = context.createGain();
    masterGain.connect(context.destination);
    
    // Envelope
    masterGain.gain.setValueAtTime(0, startTime);
    masterGain.gain.linearRampToValueAtTime(isSibilant ? 0.1 : 0.3, startTime + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    if (isSibilant) {
      // Noise Source for Consonants
      const noise = context.createBufferSource();
      noise.buffer = createNoiseBuffer(context);
      
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, startTime);
      
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start(startTime);
      noise.stop(startTime + duration);
    } else {
      // Sawtooth Oscillator (Glottal Source)
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      // Formant Filter 1 (Throat/Mouth Shape)
      const f1 = context.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(formants.f1, startTime);
      f1.Q.value = 5;

      // Formant Filter 2 (Tongue Shape)
      const f2 = context.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(formants.f2, startTime);
      f2.Q.value = 8;

      // Parallel routing for richer sound
      osc.connect(f1);
      osc.connect(f2);
      
      f1.connect(masterGain);
      f2.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }
  };

  const playFullSyllable = (syllable, context, startTime) => {
    const phonemeDuration = syllable.duration / syllable.phonemes.length;
    
    syllable.phonemes.forEach((p, i) => {
      playPhoneme(
        p, 
        syllable.note, 
        syllable.octave, 
        phonemeDuration, 
        context, 
        startTime + (i * phonemeDuration)
      );
    });
  };

  // --- Text Processing ---

  const autoSyllabize = (word) => {
    const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))*/gi;
    const matches = word.match(syllableRegex);
    if (!matches) return word.match(/.{1,3}/g).map(chunk => chunk.split(""));
    return matches.map(match => match.split(""));
  };

  const convertTextToSyllables = () => {
    const words = inputText.toUpperCase().split(/\s+/);
    let newSyllables = [];
    
    words.forEach(word => {
      if (!word) return;
      const rawSyllables = autoSyllabize(word);
      rawSyllables.forEach(rawSyl => {
        newSyllables.push({
          id: Math.random(),
          phonemes: rawSyl.map(c => CHAR_TO_PHONEME[c] || 'AH'),
          note: 'C',
          octave: 2,
          duration: 0.4
        });
      });
    });

    if (newSyllables.length > 0) setSyllables(newSyllables);
  };

  const updateSyllable = (id, field, value) => {
    setSyllables(syllables.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addPhonemeToSyllable = (sId, p) => {
    setSyllables(syllables.map(s => s.id === sId ? { ...s, phonemes: [...s.phonemes, p] } : s));
  };

  const removePhonemeFromSyllable = (sId, pIdx) => {
    setSyllables(syllables.map(s => s.id === sId ? { ...s, phonemes: s.phonemes.filter((_, i) => i !== pIdx) } : s));
  };

  // --- Playback Handlers ---

  const handlePreview = async () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentSyllableIdx(-1);
      return;
    }

    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    isPlayingRef.current = true;
    setIsPlaying(true);
    
    // Play sequence live
    for (let i = 0; i < syllables.length; i++) {
      if (!isPlayingRef.current) break; 
      setCurrentSyllableIdx(i);
      
      // We schedule the sound to start immediately
      playFullSyllable(syllables[i], ctx, ctx.currentTime);
      
      // Wait for syllable duration + gap
      await new Promise(r => setTimeout(r, syllables[i].duration * 1000 + 50));
    }
    
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentSyllableIdx(-1);
  };

  // --- Export Logic ---

  const writeWavHeader = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    const floatTo16BitPCM = (output, offset, input) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };

    floatTo16BitPCM(view, 44, samples);
    return view;
  };

  const handleExport = async () => {
    setIsExporting(true);

    const sampleRate = 44100;
    // Calculate total duration using target slice count (multiples of 8)
    const totalDuration = targetSliceCount * maxDuration;
    
    const offlineCtx = new window.OfflineAudioContext(1, sampleRate * totalDuration, sampleRate);

    // Render active syllables
    syllables.forEach((syllable, index) => {
      const startTime = index * maxDuration;
      playFullSyllable(syllable, offlineCtx, startTime);
    });

    // Note: We don't need to explicitly render "silence" for the padding slices.
    // The OfflineAudioContext buffer is initialized with zeros (silence) for the full duration.
    // So the empty space at the end is already handled!

    try {
      const renderedBuffer = await offlineCtx.startRendering();
      const wavData = writeWavHeader(renderedBuffer.getChannelData(0), sampleRate);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `bitvox_kit_${activeCount}syl_${targetSliceCount}pad.wav`;
      link.click();
    } catch (e) {
      console.error("Render failed", e);
      alert("Render failed. See console.");
    }

    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-mono flex flex-col">
      <header className="max-w-6xl mx-auto w-full mb-8 border-b border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-cyan-400 flex items-center gap-2 italic">
              <Waves className="w-8 h-8 not-italic" /> BIT-VOX DELUGE
            </h1>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Auto-Slicing Speech Sequencer</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handlePreview} 
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${isPlaying ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]'}`}
            >
              {isPlaying ? <Square size={18} /> : <Play size={18} />}
              {isPlaying ? 'STOP' : 'PREVIEW'}
            </button>
            <button 
              onClick={handleExport} 
              disabled={isExporting}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] ${isExporting ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              <Download size={18} /> 
              {isExporting ? 'RENDERING...' : 'EXPORT KIT'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-2xl">
          <div className="flex-1 relative">
            <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="text"
              placeholder="Type sentence (e.g. SATURDAY BANANA DELUGE)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-12 pr-4 py-3 text-cyan-400 focus:outline-none focus:border-cyan-500 uppercase font-bold placeholder:text-slate-700"
              onKeyDown={(e) => e.key === 'Enter' && convertTextToSyllables()}
            />
          </div>
          <button onClick={convertTextToSyllables} className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-sm font-black text-cyan-400 border border-slate-700">
            <Zap size={18} className="text-yellow-400" /> GENERATE
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1 pb-40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {syllables.map((syl, sIdx) => (
            <div 
              key={syl.id} 
              className={`relative flex flex-col p-4 rounded-xl border-2 transition-all group ${currentSyllableIdx === sIdx ? 'bg-slate-800 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'bg-slate-900 border-slate-800'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-950 text-cyan-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-800">
                    PAD {sIdx + 1}
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    <Music size={10} className="text-slate-500" />
                    <select 
                      value={syl.note}
                      onChange={(e) => updateSyllable(syl.id, 'note', e.target.value)}
                      className="bg-transparent text-[10px] font-bold text-slate-300 focus:outline-none appearance-none cursor-pointer"
                    >
                      {NOTES.map(n => <option key={n} value={n} className="bg-slate-900">{n}</option>)}
                    </select>
                    <select 
                      value={syl.octave}
                      onChange={(e) => updateSyllable(syl.id, 'octave', parseInt(e.target.value))}
                      className="bg-transparent text-[10px] font-bold text-slate-300 focus:outline-none appearance-none cursor-pointer"
                    >
                      {OCTAVES.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setSyllables(syllables.filter(s => s.id !== syl.id))} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Phoneme Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4 p-2 bg-slate-950/50 rounded-lg border border-slate-800/50 min-h-[44px] content-start">
                {syl.phonemes.map((p, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-[11px] font-bold text-cyan-300 border border-slate-700 group/p">
                    {p}
                    <button 
                      onClick={() => removePhonemeFromSyllable(syl.id, pIdx)}
                      className="text-slate-500 hover:text-red-400 ml-1 hidden group-hover/p:block"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => addPhonemeToSyllable(syl.id, 'AA')}
                  className="px-2 py-1 rounded text-[11px] font-bold text-slate-600 hover:text-cyan-400 border border-dashed border-slate-800 hover:border-cyan-900 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="mt-auto flex items-center justify-between gap-4">
                <div className="flex-1">
                  <input 
                    type="range" min="0.1" max="1.5" step="0.05" value={syl.duration}
                    onChange={(e) => updateSyllable(syl.id, 'duration', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>
                <span className={`text-[10px] font-bold w-10 text-right ${syl.duration === maxDuration ? 'text-emerald-400' : 'text-slate-500'}`}>
                   {syl.duration}s
                </span>
                <button onClick={() => playFullSyllable(syl, audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)(), (audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)()).currentTime)} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 text-cyan-400">
                  <Volume2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Visualization of Empty "Padding" Slices */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div key={`pad-${i}`} className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/20 opacity-50">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2">Blank Pad {activeCount + i + 1}</span>
              <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center text-slate-700">
                <Grid size={16} />
              </div>
            </div>
          ))}

          <button onClick={() => setSyllables([...syllables, { id: Date.now(), phonemes: ['AA'], note: 'C', octave: 2, duration: 0.4 }])}
            className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-cyan-500 hover:border-cyan-900 transition-all bg-slate-900/20"
          >
            <Plus size={32} />
            <span className="text-xs font-bold uppercase tracking-widest">Add Syllable</span>
          </button>
        </div>
      </main>

      {/* Deluge Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-6 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Active Slices</span>
              <span className="text-xl font-black text-cyan-400">{activeCount}</span>
            </div>
            
            <ArrowRight size={16} className="text-slate-700" />
            
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Deluge Target</span>
              <span className="text-xl font-black text-emerald-400">{targetSliceCount} <span className="text-xs font-normal text-slate-500">Pads</span></span>
            </div>

            <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block" />

            <div className="flex flex-col hidden md:flex">
              <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Uniform Slice Len</span>
              <span className="text-lg font-bold text-slate-300">{maxDuration}s</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Deluge Ready</span>
               <span className="text-[9px] text-slate-500">Set "Slices" to {targetSliceCount} on import</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
