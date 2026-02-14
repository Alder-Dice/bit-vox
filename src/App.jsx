import { useState, useRef } from 'react';
import { Play, Square, Download, Plus, Trash2, Volume2, Music, Waves, Type, Zap, Grid, ArrowRight, AlertTriangle } from 'lucide-react';
import { renderSyllable, samplesToAudioBuffer } from './lib/sam.js';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [1, 2, 3, 4];
const SAM_DEFAULTS = { note: 'C', octave: 2, speed: 72, mouth: 128, throat: 128 };

const App = () => {
  const [inputText, setInputText] = useState("");
  const [syllables, setSyllables] = useState([
    { id: 1, text: 'SAT', phonetic: false, note: 'C', octave: 2, speed: 72, mouth: 128, throat: 128 },
    { id: 2, text: 'UR', phonetic: false, note: 'C', octave: 2, speed: 72, mouth: 128, throat: 128 },
    { id: 3, text: 'DAY', phonetic: false, note: 'E', octave: 2, speed: 72, mouth: 128, throat: 128 },
  ]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSyllableIdx, setCurrentSyllableIdx] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [renderErrors, setRenderErrors] = useState({});
  const [maxSliceDuration, setMaxSliceDuration] = useState(null);

  const audioContextRef = useRef(null);
  const isPlayingRef = useRef(false);

  // --- Deluge Calculation Logic ---
  const activeCount = syllables.length;
  const targetSliceCount = Math.ceil(Math.max(activeCount, 1) / 8) * 8;
  const paddingCount = targetSliceCount - activeCount;

  // --- Text Processing ---

  const autoSyllabize = (word) => {
    const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))*/gi;
    const matches = word.match(syllableRegex);
    if (!matches) return word.match(/.{1,3}/g) || [word];
    return matches;
  };

  const convertTextToSyllables = () => {
    const words = inputText.trim().split(/\s+/);
    let newSyllables = [];

    words.forEach(word => {
      if (!word) return;
      const chunks = autoSyllabize(word);
      chunks.forEach(chunk => {
        newSyllables.push({
          id: Math.random(),
          text: chunk.toUpperCase(),
          phonetic: false,
          ...SAM_DEFAULTS,
        });
      });
    });

    if (newSyllables.length > 0) {
      setSyllables(newSyllables);
      setRenderErrors({});
      setMaxSliceDuration(null);
    }
  };

  const updateSyllable = (id, field, value) => {
    setSyllables(syllables.map(s => s.id === id ? { ...s, [field]: value } : s));
    setRenderErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  // --- Audio Helpers ---

  const getOrCreateAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playSingleSyllable = async (syllable) => {
    const samples = renderSyllable(syllable);
    if (!samples) {
      setRenderErrors(prev => ({ ...prev, [syllable.id]: true }));
      return;
    }
    setRenderErrors(prev => { const next = { ...prev }; delete next[syllable.id]; return next; });

    const ctx = getOrCreateAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const buffer = samplesToAudioBuffer(samples, ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  // --- Playback ---

  const handlePreview = async () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentSyllableIdx(-1);
      return;
    }

    const ctx = getOrCreateAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    isPlayingRef.current = true;
    setIsPlaying(true);

    const errors = {};

    for (let i = 0; i < syllables.length; i++) {
      if (!isPlayingRef.current) break;
      setCurrentSyllableIdx(i);

      const samples = renderSyllable(syllables[i]);
      if (!samples) {
        errors[syllables[i].id] = true;
        continue;
      }

      const buffer = samplesToAudioBuffer(samples, ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();

      // Wait for playback to finish + small gap
      await new Promise(r => setTimeout(r, (samples.length / 44100) * 1000 + 50));
    }

    setRenderErrors(prev => ({ ...prev, ...errors }));
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
    const errors = {};

    // Render all syllables to raw buffers
    const renderedBuffers = syllables.map(syl => {
      const samples = renderSyllable(syl);
      if (!samples) {
        errors[syl.id] = true;
        return new Float32Array(0);
      }
      return samples;
    });

    if (Object.keys(errors).length > 0) {
      setRenderErrors(prev => ({ ...prev, ...errors }));
    }

    // Find longest buffer for uniform slice length
    const maxLen = Math.max(...renderedBuffers.map(b => b.length), 1);
    setMaxSliceDuration(maxLen / sampleRate);

    // Build concatenated output: targetSliceCount slices, each maxLen samples
    const totalSamples = targetSliceCount * maxLen;
    const output = new Float32Array(totalSamples);

    renderedBuffers.forEach((buf, i) => {
      output.set(buf, i * maxLen);
      // Remaining samples in this slice are already 0 (silence padding)
    });

    const wavData = writeWavHeader(output, sampleRate);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `bitvox_kit_${activeCount}syl_${targetSliceCount}pad.wav`;
    link.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  // --- Slider helper ---
  const SliderRow = ({ label, value, min, max, sylId, field }) => (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-500 uppercase w-10 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step="1" value={value}
        onChange={(e) => updateSyllable(sylId, field, parseInt(e.target.value))}
        className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-600"
      />
      <span className="text-[10px] font-bold text-slate-400 w-7 text-right">{value}</span>
    </div>
  );

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
              className={`relative flex flex-col p-4 rounded-xl border-2 transition-all group ${
                renderErrors[syl.id]
                  ? 'bg-red-950/30 border-red-800'
                  : currentSyllableIdx === sIdx
                    ? 'bg-slate-800 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                    : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-950 text-cyan-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-800">
                    PAD {sIdx + 1}
                  </div>
                  <button
                    onClick={() => updateSyllable(syl.id, 'phonetic', !syl.phonetic)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                      syl.phonetic
                        ? 'bg-amber-900/50 text-amber-400 border-amber-700'
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {syl.phonetic ? 'PHO' : 'TXT'}
                  </button>
                  {renderErrors[syl.id] && (
                    <AlertTriangle size={12} className="text-red-400" />
                  )}
                </div>
                <button onClick={() => setSyllables(syllables.filter(s => s.id !== syl.id))} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={syl.text}
                onChange={(e) => updateSyllable(syl.id, 'text', e.target.value.toUpperCase())}
                placeholder={syl.phonetic ? 'SAM phonemes...' : 'Text...'}
                className={`w-full bg-slate-950/50 border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none mb-3 ${
                  renderErrors[syl.id]
                    ? 'border-red-800 text-red-300 focus:border-red-500'
                    : 'border-slate-800/50 text-cyan-300 focus:border-cyan-500'
                }`}
              />

              {/* Note/Octave + SAM Parameter Sliders */}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 uppercase w-10 shrink-0">Pitch</span>
                  <div className="flex-1 flex items-center gap-1">
                    <Music size={10} className="text-slate-500 shrink-0" />
                    <select
                      value={syl.note}
                      onChange={(e) => updateSyllable(syl.id, 'note', e.target.value)}
                      className="bg-slate-950 text-[10px] font-bold text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 focus:outline-none appearance-none cursor-pointer"
                    >
                      {NOTES.map(n => <option key={n} value={n} className="bg-slate-900">{n}</option>)}
                    </select>
                    <select
                      value={syl.octave}
                      onChange={(e) => updateSyllable(syl.id, 'octave', parseInt(e.target.value))}
                      className="bg-slate-950 text-[10px] font-bold text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 focus:outline-none appearance-none cursor-pointer"
                    >
                      {OCTAVES.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                    </select>
                  </div>
                </div>
                <SliderRow label="Speed" value={syl.speed} min={40} max={200} sylId={syl.id} field="speed" />
                <SliderRow label="Mouth" value={syl.mouth} min={0} max={255} sylId={syl.id} field="mouth" />
                <SliderRow label="Throat" value={syl.throat} min={0} max={255} sylId={syl.id} field="throat" />
              </div>

              <div className="mt-auto flex justify-end">
                <button
                  onClick={() => playSingleSyllable(syl)}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 text-cyan-400"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Padding Slices */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div key={`pad-${i}`} className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/20 opacity-50">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2">Blank Pad {activeCount + i + 1}</span>
              <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center text-slate-700">
                <Grid size={16} />
              </div>
            </div>
          ))}

          <button onClick={() => setSyllables([...syllables, { id: Date.now(), text: '', phonetic: false, ...SAM_DEFAULTS }])}
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
              <span className="text-lg font-bold text-slate-300">
                {maxSliceDuration !== null ? `${maxSliceDuration.toFixed(2)}s` : '\u2014'}
              </span>
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
