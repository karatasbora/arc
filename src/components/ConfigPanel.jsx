import React from 'react';
import { Command, ToggleLeft, ToggleRight, Loader, Sparkles } from 'lucide-react';

export default function ConfigPanel({
    transcript, setTranscript,
    activityType, setActivityType,
    cefrLevel, setCefrLevel,
    isScaffolded, setIsScaffolded,
    loading, onGenerate
}) {
    return (
        <div className="editor-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#71717a' }}>
                <Command size={18} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>New Configuration</span>
            </div>

            <div className="input-group">
                <label>Source Material / Topic</label>
                <textarea
                    placeholder="Enter text or a topic (e.g., 'The history of the internet' or 'Quantum Physics for kids')..."
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                    <label>Focus</label>
                    <select value={activityType} onChange={e => setActivityType(e.target.value)}>
                        <option value="comprehension">Comprehension</option>
                        <option value="vocabulary">Vocabulary</option>
                        <option value="grammar">Grammar</option>
                        <option value="discussion">Discussion</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>CEFR Level</label>
                    <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
                        <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
                    </select>
                </div>
            </div>

            <div
                className={`toggle-box ${isScaffolded ? 'active' : ''}`}
                onClick={() => setIsScaffolded(!isScaffolded)}
            >
                {isScaffolded ? <ToggleRight color="black" /> : <ToggleLeft color="#d4d4d8" />}
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Scaffolding Mode</span>
            </div>

            <button
                className="generate-btn"
                onClick={onGenerate}
                disabled={loading}
                style={{
                    background: loading ? '#f4f4f5' : 'black',
                    color: loading ? '#a1a1aa' : 'white',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Loader size={16} className="animate-spin" /> Architects Logic...
                    </span>
                ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Sparkles size={16} /> Generate Lesson
                    </span>
                )}
            </button>
        </div>
    );
}