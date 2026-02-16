import { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Plus, Trash2, Volume2, AlertTriangle, X } from 'lucide-react';
import { renderSyllable, samplesToAudioBuffer, convertToPhonemes } from './lib/sam.js';
import { SAM_PHONEMES, PHONEME_CATEGORIES } from './lib/sam-phonemes.js';

const SAM_DEFAULTS = { pitch: 64, speed: 72, mouth: 128, throat: 128 };
const SAM_PARAMS = [
  { field: 'pitch', label: 'PITCH', min: 1, max: 255, color: 'var(--c64-yellow)', invert: true },
  { field: 'speed', label: 'SPEED', min: 40, max: 200, color: 'var(--c64-orange)', invert: true },
  { field: 'mouth', label: 'MOUTH', min: 0, max: 255, color: 'var(--c64-ltblue)' },
  { field: 'throat', label: 'THROAT', min: 0, max: 255, color: 'var(--c64-purple)' },
];

const MODE_CARDS = [
  { field: null, label: 'PHONEME' },
  ...SAM_PARAMS.map(p => ({ field: p.field, label: p.label })),
];

const App = () => {
  const [inputText, setInputText] = useState("");
  const [globalVoice, setGlobalVoice] = useState({ ...SAM_DEFAULTS });
  const [syllables, setSyllables] = useState(() => {
    return ['SAT', 'UR', 'DAY'].map((chunk, i) => {
      const phonemes = convertToPhonemes(chunk);
      return {
        id: i + 1,
        text: phonemes || chunk.toUpperCase(),
        phonetic: phonemes !== false,
        ...SAM_DEFAULTS,
      };
    });
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSyllableIdx, setCurrentSyllableIdx] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [renderErrors, setRenderErrors] = useState({});
  const [maxSliceDuration, setMaxSliceDuration] = useState(null);
  const [cardMode, setCardMode] = useState(null);
  const [pickerOpenFor, setPickerOpenFor] = useState(null);
  const inputRefs = useRef({});
  const cardRefs = useRef({});
  const dragRef = useRef({ active: false, field: null });
  const globalDragRef = useRef({ active: false, field: null, startY: null, startGlobalVal: null, startSyllables: null });

  const audioContextRef = useRef(null);
  const isPlayingRef = useRef(false);

  const activeCount = syllables.length;

  // --- Mode switching ---

  const activateMode = (mode) => {
    setCardMode(mode);
    setPickerOpenFor(null);
  };

  // --- Cross-card drag (syllable cards in step mode) ---

  useEffect(() => {
    if (cardMode === null) return;

    const handlePointerMove = (e) => {
      if (!dragRef.current.active) return;
      const field = dragRef.current.field;
      const param = SAM_PARAMS.find(p => p.field === field);
      if (!param) return;

      for (const [idStr, el] of Object.entries(cardRefs.current)) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          let ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
          if (param.invert) ratio = 1 - ratio;
          const value = Math.round(param.min + ratio * (param.max - param.min));
          const id = Number(idStr);
          setSyllables(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
          break;
        }
      }
    };

    const handlePointerUp = () => {
      dragRef.current.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [cardMode]);

  const handleCardPointerDown = (e, sylId) => {
    const field = cardMode;
    const param = SAM_PARAMS.find(p => p.field === field);
    if (!param) return;
    e.preventDefault();
    dragRef.current = { active: true, field };

    const el = cardRefs.current[sylId];
    if (el) {
      const rect = el.getBoundingClientRect();
      let ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      if (param.invert) ratio = 1 - ratio;
      const value = Math.round(param.min + ratio * (param.max - param.min));
      setSyllables(prev => prev.map(s => s.id === sylId ? { ...s, [field]: value } : s));
    }
  };

  // --- Global offset drag (mode cards) ---

  const handleGlobalPointerDown = (e, field) => {
    const param = SAM_PARAMS.find(p => p.field === field);
    if (!param) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    globalDragRef.current = {
      active: true,
      field,
      startY: e.clientY,
      startGlobalVal: globalVoice[field],
      startSyllables: syllables.map(s => ({ ...s })),
    };
  };

  const handleGlobalPointerMove = (e, field) => {
    const ref = globalDragRef.current;
    if (!ref.active || ref.field !== field) return;
    const param = SAM_PARAMS.find(p => p.field === field);
    if (!param) return;

    const pixelDelta = ref.startY - e.clientY;
    let delta = Math.round((param.invert ? -pixelDelta : pixelDelta) * (param.max - param.min) / 200);

    for (const syl of ref.startSyllables) {
      delta = Math.min(delta, param.max - syl[field]);
      delta = Math.max(delta, param.min - syl[field]);
    }

    const newGlobal = Math.max(param.min, Math.min(param.max, ref.startGlobalVal + delta));
    setGlobalVoice(prev => ({ ...prev, [field]: newGlobal }));
    setSyllables(ref.startSyllables.map(syl => ({
      ...syl,
      [field]: syl[field] + delta,
    })));
  };

  const handleGlobalPointerUp = (e, field) => {
    const ref = globalDragRef.current;
    if (ref.active && ref.field === field) {
      globalDragRef.current = { active: false, field: null, startY: null, startGlobalVal: null, startSyllables: null };
    }
  };

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
    const errors = {};

    words.forEach(word => {
      if (!word) return;
      const chunks = autoSyllabize(word);
      chunks.forEach(chunk => {
        const phonemes = convertToPhonemes(chunk);
        const id = Math.random();
        if (phonemes === false) {
          errors[id] = true;
          newSyllables.push({
            id,
            text: chunk.toUpperCase(),
            phonetic: false,
            ...globalVoice,
          });
        } else {
          newSyllables.push({
            id,
            text: phonemes,
            phonetic: true,
            ...globalVoice,
          });
        }
      });
    });

    if (newSyllables.length > 0) {
      setSyllables(newSyllables);
      setRenderErrors(errors);
      setMaxSliceDuration(null);
      setPickerOpenFor(null);
    }
  };

  const updateSyllable = (id, field, value) => {
    setSyllables(syllables.map(s => s.id === id ? { ...s, [field]: value } : s));
    setRenderErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const insertPhoneme = (syllableId, phonemeCode) => {
    const el = inputRefs.current[syllableId];
    const syl = syllables.find(s => s.id === syllableId);
    if (!syl) return;

    const cursorPos = el ? el.selectionStart ?? syl.text.length : syl.text.length;
    const before = syl.text.slice(0, cursorPos);
    const after = syl.text.slice(cursorPos);
    const newText = before + phonemeCode + after;

    updateSyllable(syllableId, 'text', newText);

    const newPos = cursorPos + phonemeCode.length;
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(newPos, newPos); }
    });
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

    const maxLen = Math.max(...renderedBuffers.map(b => b.length), 1);
    setMaxSliceDuration(maxLen / sampleRate);

    const totalSamples = activeCount * maxLen;
    const output = new Float32Array(totalSamples);

    renderedBuffers.forEach((buf, i) => {
      output.set(buf, i * maxLen);
    });

    const wavData = writeWavHeader(output, sampleRate);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const prefix = inputText.trim().slice(0, 10).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'bitvox';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}_${activeCount}slices.wav`;
    link.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  // --- Helpers ---

  const getBarRatio = (value, field) => {
    const param = SAM_PARAMS.find(p => p.field === field);
    if (!param) return 0;
    const ratio = (value - param.min) / (param.max - param.min);
    return param.invert ? 1 - ratio : ratio;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col" style={{ background: 'var(--c64-bg)', color: 'var(--c64-text)' }}>
      <header className="max-w-6xl mx-auto w-full mb-8 pb-6" style={{ borderBottom: '2px solid var(--c64-border)' }}>
        <div className="flex flex-col gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 80" preserveAspectRatio="xMidYMid meet" className="w-full">
            <g style={{ stroke: cardMode !== null ? SAM_PARAMS.find(p => p.field === cardMode)?.color || 'var(--c64-cyan)' : 'var(--c64-cyan)' }} fill="none" strokeLinecap="square" strokeLinejoin="miter">
              <path strokeWidth="2" d="M30,65 L30,25 L80,25 L90,35 L80,45 L90,55 L80,65 Z M45,55 L45,15 L95,15 L105,25 L95,35 L105,45 L95,55 Z M30,25 L45,15 M80,25 L95,15 M90,35 L105,25 M90,55 L105,45 M80,65 L95,55 M30,65 L45,55" />
              <path strokeWidth="2" d="M155,65 L155,25 L175,25 L175,65 Z M170,55 L170,15 L190,15 L190,55 Z M155,25 L170,15 M175,25 L190,15 M175,65 L190,55 M155,65 L170,55" />
              <path strokeWidth="2" d="M245,65 L245,40 L225,40 L225,25 L285,25 L285,40 L265,40 L265,65 Z M260,55 L260,30 L240,30 L240,15 L300,15 L300,30 L280,30 L280,55 Z M225,25 L240,15 M285,25 L300,15 M285,40 L300,30 M265,65 L280,55 M245,65 L260,55 M225,40 L240,30" />
              <path strokeWidth="2" d="M330,50 L330,40 L350,40 L350,50 Z M345,40 L345,30 L365,30 L365,40 Z M330,40 L345,30 M350,40 L365,30 M350,50 L365,40 M330,50 L345,40" />
              <path strokeWidth="2" d="M425,65 L395,25 L415,25 L435,55 L455,25 L475,25 L445,65 Z M440,55 L410,15 L430,15 L450,45 L470,15 L490,15 L460,55 Z M395,25 L410,15 M415,25 L430,15 M455,25 L470,15 M475,25 L490,15 M445,65 L460,55 M425,65 L440,55" />
              <path strokeWidth="2" d="M505,65 L505,25 L565,25 L565,65 Z M520,55 L520,15 L580,15 L580,55 Z M505,25 L520,15 M565,25 L580,15 M565,65 L580,55 M505,65 L520,55 M525,55 L525,35 L545,35 L545,55 Z M540,45 L540,25 L560,25 L560,45 Z M525,35 L540,25 M545,35 L560,25 M545,55 L560,45 M525,55 L540,45" />
              <path strokeWidth="2" d="M625,25 L645,25 L655,40 L665,25 L685,25 L665,50 L685,65 L665,65 L655,50 L645,65 L625,65 L645,40 Z M640,15 L660,15 L670,30 L680,15 L700,15 L680,40 L700,55 L680,55 L670,40 L660,55 L640,55 L660,30 Z M625,25 L640,15 M645,25 L660,15 M665,25 L680,15 M685,25 L700,15 M685,65 L700,55 M665,65 L680,55 M645,65 L660,55 M625,65 L640,55 M645,40 L660,30 M655,40 L670,30 M665,50 L680,40 M655,50 L670,40" />
            </g>
          </svg>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-2 p-3" style={{ background: 'var(--c64-panel)', border: '2px solid var(--c64-border)' }}>
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
                color: cardMode !== null ? SAM_PARAMS.find(p => p.field === cardMode)?.color || 'var(--c64-cyan)' : 'var(--c64-cyan)',
              }}
              onKeyDown={(e) => e.key === 'Enter' && convertTextToSyllables()}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={convertTextToSyllables}
              className="flex items-center justify-center gap-2 px-6 py-2 text-[8px] font-bold"
              style={{
                background: 'var(--c64-panel)',
                border: '2px solid var(--c64-border)',
                color: cardMode !== null ? SAM_PARAMS.find(p => p.field === cardMode)?.color || 'var(--c64-cyan)' : 'var(--c64-cyan)',
              }}
            >
              GENERATE
            </button>
            <button
              onClick={handlePreview}
              className="flex items-center justify-center aspect-square py-2 px-2"
              style={{
                background: 'var(--c64-panel)',
                border: `2px solid ${isPlaying ? 'var(--c64-red)' : 'var(--c64-border)'}`,
                color: isPlaying ? 'var(--c64-red)' : 'var(--c64-cyan)',
              }}
              title={isPlaying ? 'STOP' : 'PREVIEW'}
            >
              {isPlaying ? <Square size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center aspect-square py-2 px-2"
              style={{
                background: 'var(--c64-panel)',
                border: `2px solid ${isExporting ? 'var(--c64-muted)' : 'var(--c64-border)'}`,
                color: isExporting ? 'var(--c64-muted)' : 'var(--c64-cyan)',
                cursor: isExporting ? 'wait' : 'pointer',
              }}
              title={isExporting ? 'RENDERING...' : 'EXPORT WAV'}
            >
              <Download size={14} />
            </button>
            <div className="ml-2 flex flex-col text-[8px] whitespace-nowrap tabular-nums" style={{ color: 'var(--c64-muted)', lineHeight: '1.6' }}>
              <span>{activeCount} SLICE{activeCount !== 1 ? 'S' : ''}</span>
              {maxSliceDuration !== null && <span>{maxSliceDuration.toFixed(2)}S EACH</span>}
            </div>
          </div>
        </div>

        {/* Global Mode Cards */}
        <div className="mt-4 flex gap-2">
          {MODE_CARDS.map(mc => {
            const isActive = cardMode === mc.field;
            const param = mc.field ? SAM_PARAMS.find(p => p.field === mc.field) : null;
            const ratio = param ? getBarRatio(globalVoice[mc.field], mc.field) : 0;
            const activeColor = param ? param.color : 'var(--c64-cyan)';

            return (
              <div
                key={mc.label}
                className="step-drag-surface relative flex flex-col items-center flex-1 p-2 cursor-pointer select-none"
                style={{
                  background: 'var(--c64-panel)',
                  border: `2px solid ${isActive ? activeColor : 'var(--c64-border)'}`,
                  minHeight: param ? '72px' : undefined,
                }}
                onClick={() => { if (mc.field === null || cardMode !== mc.field) activateMode(mc.field); }}
                onPointerDown={(e) => { if (mc.field && cardMode === mc.field) handleGlobalPointerDown(e, mc.field); }}
                onPointerMove={(e) => { if (mc.field) handleGlobalPointerMove(e, mc.field); }}
                onPointerUp={(e) => { if (mc.field) handleGlobalPointerUp(e, mc.field); }}
              >
                <span className="text-[8px] font-bold" style={{ color: isActive ? activeColor : 'var(--c64-muted)', zIndex: 2, position: 'relative' }}>
                  {mc.label}
                </span>
                {param && (
                  <div className="absolute bottom-0 left-0 right-0" style={{ height: `${ratio * 100}%`, pointerEvents: 'none' }}>
                    <div style={{ height: '2px', background: isActive ? activeColor : 'rgba(255,255,255,0.4)' }} />
                    <div className="w-full" style={{ height: 'calc(100% - 2px)', background: isActive ? activeColor : 'rgba(255,255,255,0.08)', opacity: isActive ? 0.15 : 1 }} />
                  </div>
                )}
                {param && (
                  <span className="text-[7px] mt-auto pt-1" style={{ color: isActive ? activeColor : 'var(--c64-muted)', zIndex: 2, position: 'relative' }}>
                    {globalVoice[mc.field]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {syllables.map((syl, sIdx) => {
            const inStepMode = cardMode !== null;
            const stepParam = inStepMode ? SAM_PARAMS.find(p => p.field === cardMode) : null;
            const stepRatio = stepParam ? getBarRatio(syl[cardMode], cardMode) : 0;
            const stepColor = stepParam ? stepParam.color : null;

            return (
              <div
                key={syl.id}
                ref={(el) => { if (el) cardRefs.current[syl.id] = el; else delete cardRefs.current[syl.id]; }}
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
                  minHeight: inStepMode ? '140px' : undefined,
                }}
              >
                {/* Header — always visible, above overlay */}
                <div className="relative flex justify-between items-start mb-3" style={{ zIndex: 2 }}>
                  <div className="flex items-center gap-2">
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

                {/* Menu mode content */}
                {!inStepMode && (
                  <>
                    {/* Phoneme Input */}
                    <div className="flex gap-1 mb-3">
                      <input
                        ref={(el) => { inputRefs.current[syl.id] = el; }}
                        type="text"
                        value={syl.text}
                        onChange={(e) => updateSyllable(syl.id, 'text', e.target.value.toUpperCase())}
                        placeholder="PHONEMES..."
                        className="flex-1 min-w-0 px-3 py-2 text-[10px] font-bold focus:outline-none"
                        style={{
                          background: 'var(--c64-bg)',
                          border: `2px solid ${renderErrors[syl.id] ? 'var(--c64-red)' : 'var(--c64-border)'}`,
                          color: renderErrors[syl.id] ? 'var(--c64-red)' : 'var(--c64-cyan)',
                        }}
                      />
                      <button
                        onClick={() => setPickerOpenFor(pickerOpenFor === syl.id ? null : syl.id)}
                        className="px-2 py-1 text-[8px] font-bold shrink-0"
                        style={{
                          background: pickerOpenFor === syl.id ? 'var(--c64-cyan)' : 'var(--c64-bg)',
                          border: '2px solid var(--c64-border)',
                          color: pickerOpenFor === syl.id ? 'var(--c64-bg)' : 'var(--c64-muted)',
                        }}
                      >
                        PH
                      </button>
                    </div>

                    {/* Phoneme Picker */}
                    {pickerOpenFor === syl.id && (
                      <div className="mb-3 p-2 max-h-48 overflow-y-auto" style={{ background: 'var(--c64-bg)', border: '2px solid var(--c64-border)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[7px] font-bold tracking-widest" style={{ color: 'var(--c64-muted)' }}>PHONEME PICKER</span>
                          <button onClick={() => setPickerOpenFor(null)} style={{ color: 'var(--c64-muted)' }}><X size={10} /></button>
                        </div>
                        {PHONEME_CATEGORIES.map(cat => {
                          const phonemes = SAM_PHONEMES.filter(p => p.category === cat);
                          if (phonemes.length === 0) return null;
                          return (
                            <div key={cat} className="mb-2">
                              <div className="text-[6px] font-bold mb-1 tracking-widest" style={{ color: 'var(--c64-muted)' }}>{cat.toUpperCase()}</div>
                              <div className="flex flex-wrap gap-1">
                                {phonemes.map(p => (
                                  <button
                                    key={p.code}
                                    onClick={() => insertPhoneme(syl.id, p.code)}
                                    title={p.example}
                                    className="px-1.5 py-0.5 text-[8px] font-bold"
                                    style={{
                                      background: 'var(--c64-panel)',
                                      border: '1px solid var(--c64-border)',
                                      color: 'var(--c64-cyan)',
                                    }}
                                  >
                                    {p.code}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Play button */}
                    <div className="mt-auto flex items-center justify-end">
                      <button
                        onClick={() => playSingleSyllable(syl)}
                        className="p-1.5"
                        style={{ background: 'var(--c64-bg)', border: '1px solid var(--c64-border)', color: 'var(--c64-cyan)' }}
                      >
                        <Volume2 size={12} />
                      </button>
                    </div>
                  </>
                )}

                {/* Step mode overlay */}
                {inStepMode && (
                  <div
                    className="step-drag-surface absolute inset-0"
                    style={{ zIndex: 1, cursor: 'crosshair' }}
                    onPointerDown={(e) => handleCardPointerDown(e, syl.id)}
                  >
                    {/* Bar fill from bottom */}
                    <div className="absolute bottom-0 left-0 right-0" style={{ height: `${stepRatio * 100}%`, pointerEvents: 'none' }}>
                      <div style={{ height: '2px', background: stepColor }} />
                      <div className="w-full" style={{ height: 'calc(100% - 2px)', background: stepColor, opacity: 0.15 }} />
                    </div>
                    {/* Value + phoneme labels */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ pointerEvents: 'none' }}>
                      <span className="text-lg font-bold" style={{ color: stepColor, opacity: 0.4 }}>
                        {syl[cardMode]}
                      </span>
                      <span className="text-lg font-bold" style={{ color: stepColor, opacity: 0.4 }}>
                        {syl.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setSyllables([...syllables, { id: Date.now(), text: '', phonetic: true, ...globalVoice }])}
            className="flex flex-col items-center justify-center gap-2 p-8"
            style={{ border: '2px dashed var(--c64-border)', color: 'var(--c64-muted)', background: 'transparent' }}
          >
            <Plus size={24} />
            <span className="text-[8px] font-bold tracking-widest">ADD SYLLABLE</span>
          </button>
        </div>
      </main>

    </div>
  );
};

export default App;
