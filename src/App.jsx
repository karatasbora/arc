import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ConfigPanel from './components/ConfigPanel';
import MaterialPreview from './components/MaterialPreview';
import { useGemini } from './hooks/useGemini';
import LoginModal from './components/LoginModal';

function Workspace() {
  const {
    apiKey, setApiKey,
    params, setParams,
    loading,
    material,
    history,
    generateMaterial,
    loadFromHistory,
    clearHistory
  } = useGemini();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        apiKey={apiKey}
        setApiKey={setApiKey}
        history={history}
        loadFromHistory={loadFromHistory}
        clearHistory={clearHistory}
        onLoginClick={() => setIsLoginModalOpen(true)}
      />

      <div className="workspace">
        <ConfigPanel
          params={params}
          setParams={setParams}
          onGenerate={generateMaterial}
          loading={loading}
        />

        <MaterialPreview
          material={material}
          loading={loading}
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