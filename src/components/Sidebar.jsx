import React from 'react';
import { Trash2, Library, Key, LogOut, User, LogIn, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({
    apiKey, setApiKey,
    history, loadFromHistory, clearHistory,
    onLoginClick,
    currentActivity, deleteHistoryItem, moveHistoryItem
}) {
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
                {history.map((item, index) => (
                    <div
                        key={item.id}
                        className={`history-item group ${currentActivity && currentActivity.id === item.id ? 'active' : ''}`}
                        onClick={() => loadFromHistory(item)}
                        style={{ position: 'relative', paddingLeft: '36px' }} // Make room for controls
                    >
                        {/* Action Buttons (Absolute Left like MaterialPreview) */}
                        <div className="item-actions" onClick={(e) => e.stopPropagation()} style={{
                            position: 'absolute',
                            left: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            opacity: 0.4, // Match MaterialPreview default
                            transition: 'opacity 0.2s'
                        }}>
                            <div className="relocate-actions" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {index > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveHistoryItem(item.id, 'up'); }}
                                        title="Move Up"
                                        className="action-btn"
                                        style={{ padding: 0, height: '12px', display: 'flex', alignItems: 'center' }}
                                    >
                                        <ChevronUp size={12} />
                                    </button>
                                )}
                                {index < history.length - 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveHistoryItem(item.id, 'down'); }}
                                        title="Move Down"
                                        className="action-btn"
                                        style={{ padding: 0, height: '12px', display: 'flex', alignItems: 'center' }}
                                    >
                                        <ChevronDown size={12} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                                title="Delete"
                                className="action-btn delete-btn"
                                style={{ padding: '2px' }}
                            >
                                <Trash2 size={14} color="#ef4444" />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            {/* Dot Removed */}
                            <div style={{ overflow: 'hidden', flex: 1 }}>
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