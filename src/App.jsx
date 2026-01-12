import React from 'react';
import Sidebar from './components/Sidebar';
import ConfigPanel from './components/ConfigPanel';
import MaterialPreview from './components/MaterialPreview';
import { generatePDF } from './utils/pdfGenerator';
import { useGemini } from './hooks/useGemini';

export default function App() {
  const {
    apiKey, setApiKey,
    transcript, setTranscript,
    activityType, setActivityType,
    cefrLevel, setCefrLevel,
    isScaffolded, setIsScaffolded,
    length, setLength,
    audience, setAudience,
    visualStyle, setVisualStyle,
    mascotPref, setMascotPref,
    model, setModel,
    loading,
    activity,
    history,
    mascotUrl,
    loadFromHistory,
    clearHistory,
    handleGenerate,
    setActivity
  } = useGemini();

  return (
    <div className="app-shell">
      <Sidebar
        apiKey={apiKey}
        setApiKey={setApiKey}
        history={history}
        loadFromHistory={loadFromHistory}
        clearHistory={clearHistory}
      />

      <main className="workspace">
        <ConfigPanel
          transcript={transcript} setTranscript={setTranscript}
          activityType={activityType} setActivityType={setActivityType}
          cefrLevel={cefrLevel} setCefrLevel={setCefrLevel}
          isScaffolded={isScaffolded} setIsScaffolded={setIsScaffolded}
          length={length} setLength={setLength}
          audience={audience} setAudience={setAudience}
          visualStyle={visualStyle} setVisualStyle={setVisualStyle}
          mascotPref={mascotPref} setMascotPref={setMascotPref}
          model={model} setModel={setModel}
          loading={loading} onGenerate={handleGenerate}
        />

        <MaterialPreview
          activity={activity}
          mascotUrl={mascotUrl}
          isScaffolded={isScaffolded}
          onDownload={() => generatePDF(activity, mascotUrl, isScaffolded)}
          onUpdate={setActivity}
        />
      </main>

    </div>
  );
}