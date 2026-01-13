import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Hexagon, Mail, Lock, ArrowRight, AlertCircle, Loader2, X } from 'lucide-react';
import './LoginModal.css';

export default function LoginModal({ isOpen, onClose }) {
    const emailRef = useRef();
    const passwordRef = useRef();
    const { login, signup, googleLogin } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup

    if (!isOpen) return null;

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            if (isLogin) {
                await login(emailRef.current.value, passwordRef.current.value);
            } else {
                await signup(emailRef.current.value, passwordRef.current.value);
            }
            onClose(); // Close modal on success
        } catch (err) {
            console.error(err);
            setError('Failed to ' + (isLogin ? 'log in' : 'create an account') + ': ' + err.message);
        }
        setLoading(false);
    }

    async function handleGoogleLogin() {
        try {
            setError('');
            setLoading(true);
            await googleLogin();
            onClose(); // Close modal on success
        } catch (err) {
            console.error(err);
            setError('Failed to log in with Google: ' + err.message);
        }
        setLoading(false);
    }

    // Close when clicking overlay (but not card)
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="login-content">
                {/* Logo / Brand Header */}
                <div className="login-header">
                    <div className="brand-logo-container">
                        <Hexagon size={32} strokeWidth={1.5} />
                    </div>
                    <h1 className="login-title">
                        {isLogin ? 'Welcome Back' : 'Join the Future'}
                    </h1>
                    <p className="login-subtitle">
                        {isLogin ? 'Sign in to sync your library across devices.' : 'Create an account to save your work.'}
                    </p>
                </div>

                {/* Glass Card */}
                <div className="login-card">
                    <button className="btn-close-modal" onClick={onClose} title="Close">
                        <X size={20} />
                    </button>

                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={20} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div className="input-wrapper-login">
                                <Mail className="input-icon" />
                                <input
                                    type="email"
                                    ref={emailRef}
                                    required
                                    className="login-input"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-wrapper-login">
                                <Lock className="input-icon" />
                                <input
                                    type="password"
                                    ref={passwordRef}
                                    required
                                    className="login-input"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="btn-login"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="divider">
                        <span className="divider-text">Or continue with</span>
                    </div>

                    <div>
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="btn-google"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" color="#4285F4" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" color="#34A853" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" color="#FBBC05" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" color="#EA4335" />
                            </svg>
                            Google
                        </button>
                        {/* Add more providers here if needed */}
                    </div>

                    <p className="toggle-text">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="toggle-link"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                </div>

                <div className="login-footer">
                    <p>&copy; {new Date().getFullYear()} Arc Material Architect. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
