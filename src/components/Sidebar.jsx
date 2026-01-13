import React from 'react';
import { Trash2, Library, Key, LogOut, User, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ apiKey, setApiKey, history, loadFromHistory, clearHistory, onLoginClick }) {
    // Determine the base URL for assets (handles the 'base: /arc/' config)
    const baseUrl = import.meta.env.BASE_URL;
    const { currentUser, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <aside className="sidebar flex flex-col h-full">
            <div className="brand mb-6">
                <img
                    src={`${baseUrl}arc-emerge.svg`}
                    alt="arc"
                    style={{ height: '38px' }}
                />
            </div>

            <div className="input-wrapper" style={{ marginBottom: '2rem' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sb-text-muted)' }}>
                    <Key size={12} style={{ color: 'var(--sb-text-muted)' }} /> API Key
                </label>
                <input
                    className="input-field"
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--sb-hover)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-main)' }}
                />
            </div>

            {/* History List */}
            <div className="history-list flex-grow overflow-y-auto mb-4">
                <div style={{
                    fontSize: '0.7rem', fontWeight: '600', marginBottom: '10px',
                    textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6,
                    color: 'var(--sb-text-muted)'
                }}>
                    Library {currentUser ? '(Cloud)' : '(Local)'}
                </div>
                {history.length === 0 && (
                    <div className="text-xs text-slate-500 italic p-2 text-center opacity-50">
                        No history yet.
                    </div>
                )}
                {history.map(item => (
                    <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: item.visuals?.themeColors?.primary || '#000'
                            }}></div>
                            <div>
                                <span className="history-title">{item.title}</span>
                                <div className="history-meta">{(item.meta?.level || 'B1').toUpperCase()}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto space-y-2">
                <button onClick={clearHistory} className="btn-clear-history w-full flex items-center gap-2 justify-center">
                    <Trash2 size={14} /> Clear History
                </button>

                {currentUser ? (
                    <div className="user-profile-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                            <div className="user-avatar-placeholder">
                                <User size={16} />
                            </div>
                            <div className="user-info">
                                <span className="user-email" title={currentUser.email}>
                                    {currentUser.email}
                                </span>
                                <span className="user-badge">Premium</span>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="btn-logout-icon"
                            title="Log out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onLoginClick}
                        className="btn-premium-gradient"
                    >
                        <LogIn size={16} />
                        <span>Sign In</span>
                    </button>
                )}
            </div>

            <a
                href="https://karatasbora.github.io/me"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-footer mt-4"
                style={{ textDecoration: 'none' }}
            >
                <img src={`${baseUrl}bora-logo.svg`} alt="Bora Karataş" className="dev-logo" />
                <span className="dev-name">Bora Karataş</span>
            </a>
        </aside>
    );
}