import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ConfigPanel from './components/ConfigPanel';
import MaterialPreview from './components/MaterialPreview';
import { useGemini } from './hooks/useGemini';
import LoginModal from './components/LoginModal';

function Workspace() {
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
    activity: material, // Alias activity to material
    mascotUrl,
    history,
    handleGenerate,
    loadFromHistory,
    clearHistory,
    deleteHistoryItem,
    moveHistoryItem,
    setActivity,
    updateHistoryItem
  } = useGemini();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="app-shell">
      <Sidebar
        apiKey={apiKey}
        setApiKey={setApiKey}
        history={history}
        loadFromHistory={loadFromHistory}
        clearHistory={clearHistory}
        onLoginClick={() => setIsLoginModalOpen(true)}
        currentActivity={material}
        deleteHistoryItem={deleteHistoryItem}
        moveHistoryItem={moveHistoryItem}
      />


      <div className="workspace">
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
          loading={loading}
          onGenerate={handleGenerate}
        />

        <MaterialPreview
          activity={material}
          mascotUrl={mascotUrl}
          loading={loading}
          onUpdate={setActivity}
          onSave={updateHistoryItem}
          onDownload={handlePrint}
          isScaffolded={isScaffolded}
        />
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return <Workspace />;
}