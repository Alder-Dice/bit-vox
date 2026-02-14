import { useState, useRef } from 'react';
import { Play, Square, Download, Plus, Trash2, Volume2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { renderSyllable, samplesToAudioBuffer } from './lib/sam.js';

const SAM_DEFAULTS = { pitch: 64, speed: 72, mouth: 128, throat: 128 };
const SAM_PARAMS = [
  { field: 'pitch', label: 'Pitch', min: 1, max: 255 },
  { field: 'speed', label: 'Speed', min: 40, max: 200 },
  { field: 'mouth', label: 'Mouth', min: 0, max: 255 },
  { field: 'throat', label: 'Throat', min: 0, max: 255 },
];

const App = () => {
  const [inputText, setInputText] = useState("");
  const [globalVoice, setGlobalVoice] = useState({ ...SAM_DEFAULTS });
  const [syllables, setSyllables] = useState([
    { id: 1, text: 'SAT', ...SAM_DEFAULTS },
    { id: 2, text: 'UR', ...SAM_DEFAULTS },
    { id: 3, text: 'DAY', ...SAM_DEFAULTS },
  ]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSyllableIdx, setCurrentSyllableIdx] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [renderErrors, setRenderErrors] = useState({});
  const [maxSliceDuration, setMaxSliceDuration] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

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
          ...globalVoice,
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

  const updateGlobalVoice = (field, value) => {
    setGlobalVoice(prev => ({ ...prev, [field]: value }));
    setSyllables(prev => prev.map(s => ({ ...s, [field]: value })));
    setRenderErrors({});
  };

  const toggleCardExpanded = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
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

  // --- Pad number formatter ---
  const padNum = (n) => `[${String(n).padStart(2, '0')}]`;

  // --- Slider helper ---
  const SliderRow = ({ label, value, min, max, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] w-12 shrink-0" style={{ color: 'var(--c64-muted)' }}>{label}</span>
      <input
        type="range" min={min} max={max} step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1 cursor-pointer"
      />
      <span className="text-[8px] font-bold w-7 text-right" style={{ color: 'var(--c64-cyan)' }}>{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col" style={{ background: 'var(--c64-bg)', color: 'var(--c64-text)' }}>
      <header className="max-w-6xl mx-auto w-full mb-8 pb-6" style={{ borderBottom: '2px solid var(--c64-border)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-wide" style={{ color: 'var(--c64-cyan)' }}>
              BIT-VOX DELUGE
            </h1>
            <p className="text-[8px] mt-2 tracking-widest" style={{ color: 'var(--c64-muted)' }}>AUTO-SLICING SPEECH SEQUENCER</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2 font-bold text-[10px]"
              style={{
                background: isPlaying ? 'var(--c64-red)' : 'var(--c64-panel)',
                border: `2px solid ${isPlaying ? 'var(--c64-red)' : 'var(--c64-cyan)'}`,
                color: isPlaying ? 'var(--c64-text)' : 'var(--c64-cyan)',
              }}
            >
              {isPlaying ? <Square size={14} /> : <Play size={14} />}
              {isPlaying ? 'STOP' : 'PREVIEW'}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 font-bold text-[10px]"
              style={{
                background: isExporting ? 'var(--c64-panel)' : 'var(--c64-green)',
                border: `2px solid ${isExporting ? 'var(--c64-muted)' : 'var(--c64-green)'}`,
                color: isExporting ? 'var(--c64-muted)' : '#fff',
                cursor: isExporting ? 'wait' : 'pointer',
              }}
            >
              <Download size={14} />
              {isExporting ? 'RENDERING...' : 'EXPORT KIT'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-2 p-3" style={{ background: 'var(--c64-panel)', border: '2px solid var(--c64-border)' }}>
          <div className="flex-1">
            <input
              type="text"
              placeholder="TYPE SENTENCE..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full px-3 py-2 text-[10px] font-bold focus:outline-none"
              style={{
                background: 'var(--c64-bg)',
                border: '2px solid var(--c64-border)',
                color: 'var(--c64-cyan)',
              }}
              onKeyDown={(e) => e.key === 'Enter' && convertTextToSyllables()}
            />
          </div>
          <button
            onClick={convertTextToSyllables}
            className="flex items-center justify-center gap-2 px-6 py-2 text-[10px] font-bold"
            style={{
              background: 'var(--c64-panel)',
              border: '2px solid var(--c64-cyan)',
              color: 'var(--c64-cyan)',
            }}
          >
            GENERATE
          </button>
        </div>

        {/* Global Voice Controls */}
        <div className="mt-4 p-4" style={{ background: 'var(--c64-panel)', border: '2px solid var(--c64-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[8px] font-bold tracking-widest" style={{ color: 'var(--c64-muted)' }}>VOICE</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
            {SAM_PARAMS.map(p => (
              <SliderRow
                key={p.field}
                label={p.label}
                value={globalVoice[p.field]}
                min={p.min}
                max={p.max}
                onChange={(v) => updateGlobalVoice(p.field, v)}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1 pb-40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {syllables.map((syl, sIdx) => (
            <div
              key={syl.id}
              className="relative flex flex-col p-4 group"
              style={{
                background: 'var(--c64-panel)',
                border: `2px solid ${
                  renderErrors[syl.id]
                    ? 'var(--c64-red)'
                    : currentSyllableIdx === sIdx
                      ? 'var(--c64-cyan)'
                      : 'var(--c64-border)'
                }`,
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold px-2 py-0.5" style={{ background: 'var(--c64-bg)', border: '1px solid var(--c64-border)', color: 'var(--c64-cyan)' }}>
                    {padNum(sIdx + 1)}
                  </span>
                  {renderErrors[syl.id] && (
                    <AlertTriangle size={10} style={{ color: 'var(--c64-red)' }} />
                  )}
                </div>
                <button
                  onClick={() => setSyllables(syllables.filter(s => s.id !== syl.id))}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--c64-muted)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={syl.text}
                onChange={(e) => updateSyllable(syl.id, 'text', e.target.value.toUpperCase())}
                placeholder="TEXT..."
                className="w-full px-3 py-2 text-[10px] font-bold focus:outline-none mb-3"
                style={{
                  background: 'var(--c64-bg)',
                  border: `2px solid ${renderErrors[syl.id] ? 'var(--c64-red)' : 'var(--c64-border)'}`,
                  color: renderErrors[syl.id] ? 'var(--c64-red)' : 'var(--c64-cyan)',
                }}
              />

              {/* Per-syllable overrides (collapsed by default) */}
              {expandedCards[syl.id] && (
                <div className="flex flex-col gap-1.5 mb-3 pt-2" style={{ borderTop: '1px solid var(--c64-border)' }}>
                  {SAM_PARAMS.map(p => (
                    <SliderRow
                      key={p.field}
                      label={p.label}
                      value={syl[p.field]}
                      min={p.min}
                      max={p.max}
                      onChange={(v) => updateSyllable(syl.id, p.field, v)}
                    />
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between">
                <button
                  onClick={() => toggleCardExpanded(syl.id)}
                  className="flex items-center gap-1 text-[8px]"
                  style={{ color: 'var(--c64-muted)' }}
                >
                  {expandedCards[syl.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {expandedCards[syl.id] ? 'HIDE' : 'VOICE'}
                </button>
                <button
                  onClick={() => playSingleSyllable(syl)}
                  className="p-1.5"
                  style={{ background: 'var(--c64-bg)', border: '1px solid var(--c64-border)', color: 'var(--c64-cyan)' }}
                >
                  <Volume2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Padding Slices */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div
              key={`pad-${i}`}
              className="flex flex-col items-center justify-center p-4 opacity-40"
              style={{ border: '2px dashed var(--c64-border)', background: 'var(--c64-panel)' }}
            >
              <span className="text-[8px] font-bold tracking-widest mb-2" style={{ color: 'var(--c64-muted)' }}>
                BLANK {padNum(activeCount + i + 1)}
              </span>
            </div>
          ))}

          <button
            onClick={() => setSyllables([...syllables, { id: Date.now(), text: '', ...globalVoice }])}
            className="flex flex-col items-center justify-center gap-2 p-8"
            style={{ border: '2px dashed var(--c64-border)', color: 'var(--c64-muted)', background: 'transparent' }}
          >
            <Plus size={24} />
            <span className="text-[8px] font-bold tracking-widest">ADD SYLLABLE</span>
          </button>
        </div>
      </main>

      {/* Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50" style={{ background: 'var(--c64-panel)', borderTop: '2px solid var(--c64-border)' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-6 text-[8px]">
          <div className="flex flex-col">
            <span style={{ color: 'var(--c64-muted)' }}>ACTIVE SLICES</span>
            <span className="text-base font-bold" style={{ color: 'var(--c64-cyan)' }}>{activeCount}</span>
          </div>

          <span style={{ color: 'var(--c64-muted)' }}>&gt;</span>

          <div className="flex flex-col">
            <span style={{ color: 'var(--c64-muted)' }}>DELUGE TARGET</span>
            <span className="text-base font-bold" style={{ color: 'var(--c64-green)' }}>{targetSliceCount} <span className="text-[8px]" style={{ color: 'var(--c64-muted)' }}>PADS</span></span>
          </div>

          <div className="hidden md:block" style={{ width: '1px', height: '24px', background: 'var(--c64-border)' }} />

          <div className="hidden md:flex flex-col">
            <span style={{ color: 'var(--c64-muted)' }}>UNIFORM SLICE LEN</span>
            <span className="text-base font-bold" style={{ color: 'var(--c64-text)' }}>
              {maxSliceDuration !== null ? `${maxSliceDuration.toFixed(2)}S` : '\u2014'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
