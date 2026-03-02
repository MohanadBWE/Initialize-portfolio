'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAi } from '@/context/AiContext';
import { useScrollStore } from '@/store/useScrollStore';

/**
 * Neural Nexus — Premium Cinematic Chat Overlay
 * 
 * Flow:
 * 1. IDLE: Elegant suggestion cards float over neural network
 * 2. SUBMIT: Chat bar slides out, old answer dissolves
 * 3. PROCESSING: Dramatic HUD with scanning rings + data streams
 * 4. RESPONSE: Premium typewriter reveal with gradient border card
 * 5. DONE: Chat bar glides back with spring animation
 */

type Phase = 'idle' | 'processing' | 'response';

export default function NeuralChatOverlay() {
    const { sendMessage, isLoading, messages } = useAi();
    const offset = useScrollStore((state) => state.offset || 0);
    const inputRef = useRef<HTMLInputElement>(null);

    const [phase, setPhase] = useState<Phase>('idle');
    const [revealedText, setRevealedText] = useState('');
    const [isRevealing, setIsRevealing] = useState(false);
    const [chatBarVisible, setChatBarVisible] = useState(true);
    const [answerExiting, setAnswerExiting] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);

    const latestResponse = messages.filter(m => m.role === 'assistant').slice(-1)[0];
    const prevResponseRef = useRef<string | null>(null);

    // Track processing → response transition
    useEffect(() => {
        if (isLoading) {
            setPhase('processing');
            setProcessingProgress(0);
            // Animate progress bar
            const interval = setInterval(() => {
                setProcessingProgress(p => Math.min(p + 0.8 + Math.random() * 1.2, 95));
            }, 200);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    // When a new response arrives, start typewriter reveal
    useEffect(() => {
        if (!latestResponse) return;
        if (latestResponse.content === prevResponseRef.current) return;
        prevResponseRef.current = latestResponse.content;

        setProcessingProgress(100);
        setTimeout(() => {
            setPhase('response');
            setIsRevealing(true);
            setRevealedText('');
        }, 400);

        const text = latestResponse.content;
        let i = 0;
        const speed = Math.max(12, Math.min(35, 1000 / text.length));

        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                i++;
                setRevealedText(text.slice(0, i));
                if (i >= text.length) {
                    clearInterval(interval);
                    setIsRevealing(false);
                    setTimeout(() => setChatBarVisible(true), 400);
                }
            }, speed);
            return () => clearInterval(interval);
        }, 400);

        return () => clearTimeout(timeout);
    }, [latestResponse]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!inputRef.current?.value.trim() || isLoading) return;
        const text = inputRef.current.value.trim();
        inputRef.current.value = '';

        if (revealedText) {
            setAnswerExiting(true);
            setTimeout(() => {
                setAnswerExiting(false);
                setRevealedText('');
                prevResponseRef.current = null;
            }, 500);
        }

        setChatBarVisible(false);
        setTimeout(() => sendMessage(text), 200);
    }, [isLoading, sendMessage, revealedText]);

    const handleSuggestion = useCallback((text: string) => {
        setChatBarVisible(false);
        setTimeout(() => sendMessage(text), 200);
    }, [sendMessage]);

    const visibility = Math.max(0, Math.min(1, (offset - 0.75) / 0.20));

    // Scroll hint
    const [showHint, setShowHint] = useState(true);
    useEffect(() => {
        if (offset > 0.1) setShowHint(false);
        const timer = setTimeout(() => setShowHint(false), 3000);
        return () => clearTimeout(timer);
    }, [offset]);

    if (visibility === 0 && !showHint) return null;

    const showIdle = phase === 'idle' && !revealedText;
    const showProcessing = phase === 'processing' && isLoading;
    const showResponse = (phase === 'response' || revealedText) && !isLoading;

    // ── Structured Response Parser ──
    function renderStructuredResponse(text: string) {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];

        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // ## Headers
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <div key={i} className="nexus-section-header">
                        {trimmed.slice(3)}
                    </div>
                );
                return;
            }

            // SKILLS: tag1, tag2, tag3
            if (trimmed.startsWith('SKILLS:')) {
                const skills = trimmed.slice(7).split(',').map(s => s.trim()).filter(Boolean);
                elements.push(
                    <div key={i} className="nexus-skills-row">
                        {skills.map((skill, j) => (
                            <span key={j} className="nexus-skill-tag">{skill}</span>
                        ))}
                    </div>
                );
                return;
            }

            // VERDICT: YES|NO|PARTIAL — explanation
            if (trimmed.startsWith('VERDICT:')) {
                const rest = trimmed.slice(8).trim();
                const dashIndex = rest.indexOf('—') !== -1 ? rest.indexOf('—') : rest.indexOf('-');
                const verdict = (dashIndex > 0 ? rest.slice(0, dashIndex).trim() : rest).toUpperCase();
                const explanation = dashIndex > 0 ? rest.slice(dashIndex + 1).trim() : '';

                let verdictClass = 'nexus-verdict-partial';
                let verdictIcon = '◐';
                if (verdict.includes('YES')) { verdictClass = 'nexus-verdict-yes'; verdictIcon = '✓'; }
                else if (verdict.includes('NO')) { verdictClass = 'nexus-verdict-no'; verdictIcon = '✗'; }

                elements.push(
                    <div key={i} className={`nexus-verdict-box ${verdictClass}`}>
                        <div className="nexus-verdict-header">
                            <span className="nexus-verdict-icon">{verdictIcon}</span>
                            <span className="nexus-verdict-label">{verdict.includes('YES') ? 'YES' : verdict.includes('NO') ? 'NO' : 'PARTIAL'}</span>
                        </div>
                        {explanation && <p className="nexus-verdict-text">{explanation}</p>}
                    </div>
                );
                return;
            }

            // EXP: Role | Company | Year | detail
            if (trimmed.startsWith('EXP:')) {
                const parts = trimmed.slice(4).split('|').map(s => s.trim());
                const [role, company, year, detail] = parts;
                elements.push(
                    <div key={i} className="nexus-exp-card">
                        <div className="nexus-exp-header">
                            <span className="nexus-exp-role">{role || ''}</span>
                            {year && <span className="nexus-exp-year">{year}</span>}
                        </div>
                        {company && <span className="nexus-exp-company">{company}</span>}
                        {detail && <p className="nexus-exp-detail">{detail}</p>}
                    </div>
                );
                return;
            }

            // Regular text — paragraph
            elements.push(
                <p key={i} className="nexus-response-text">{trimmed}</p>
            );
        });

        return elements;
    }

    return (
        <>
            {/* Scroll Hint */}
            <div
                className={`scroll-hint ${showHint ? 'scroll-hint-visible' : ''}`}
                style={{ opacity: showHint ? 1 : 0 }}
            >
                <div className="scroll-hint-glow" />
                Scroll to enter the Quantum Nexus
                <div className="scroll-hint-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {visibility > 0 && (
                <div
                    className="nexus-overlay"
                    style={{
                        opacity: visibility,
                        pointerEvents: visibility > 0.9 ? 'auto' : 'none',
                    }}
                >
                    <div className="nexus-stage">

                        {/* ── IDLE: Welcome + Suggestion Cards ── */}
                        {showIdle && chatBarVisible && (
                            <div className="nexus-welcome">
                                {/* Intro context */}
                                <div className="nexus-intro">
                                    <div className="nexus-intro-icon">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M9 21h6M10 17v-1.5M14 17v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <h2 className="nexus-intro-title">NEURAL NEXUS</h2>
                                    <p className="nexus-intro-subtitle">
                                        AI-powered assistant — ask me anything about Mohanad&apos;s skills, experience, or capabilities.
                                    </p>
                                </div>

                                <div className="nexus-welcome-badge">
                                    <span className="nexus-badge-dot" />
                                    NEURAL NEXUS ACTIVE
                                </div>
                                <div className="nexus-prompt-suggestions">
                                    <button className="nexus-suggest" onClick={() => handleSuggestion('What are your main skills?')}>
                                        <span className="nexus-suggest-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="nexus-suggest-text">Skills & Expertise</span>
                                        <span className="nexus-suggest-arrow">→</span>
                                    </button>
                                    <button className="nexus-suggest" onClick={() => handleSuggestion('Tell me about your projects')}>
                                        <span className="nexus-suggest-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                            </svg>
                                        </span>
                                        <span className="nexus-suggest-text">Projects</span>
                                        <span className="nexus-suggest-arrow">→</span>
                                    </button>
                                    <button className="nexus-suggest" onClick={() => handleSuggestion('What is your background?')}>
                                        <span className="nexus-suggest-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <span className="nexus-suggest-text">Experience</span>
                                        <span className="nexus-suggest-arrow">→</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── PROCESSING: Dramatic HUD ── */}
                        {showProcessing && (
                            <div className="nexus-processing-state">
                                <div className="nexus-scan-lines" />

                                {/* Central processing core */}
                                <div className="nexus-process-core">
                                    <div className="nexus-process-ring nexus-process-ring-1" />
                                    <div className="nexus-process-ring nexus-process-ring-2" />
                                    <div className="nexus-process-ring nexus-process-ring-3" />
                                    <div className="nexus-process-dot" />
                                </div>

                                {/* Status text */}
                                <div className="nexus-process-label">
                                    <span className="nexus-glitch" data-text="ANALYZING">ANALYZING</span>
                                </div>

                                {/* Progress bar */}
                                <div className="nexus-progress-track">
                                    <div
                                        className="nexus-progress-fill"
                                        style={{ width: `${processingProgress}%` }}
                                    />
                                    <span className="nexus-progress-text">{Math.round(processingProgress)}%</span>
                                </div>

                                {/* Data stream bars */}
                                <div className="nexus-process-bars">
                                    {[...Array(16)].map((_, i) => (
                                        <div key={i} className="nexus-bar" style={{ animationDelay: `${i * 0.06}s` }} />
                                    ))}
                                </div>

                                {/* Status metrics */}
                                <div className="nexus-process-metrics">
                                    <span className="nexus-metric">
                                        <span className="nexus-metric-label">NODES</span>
                                        <span className="nexus-metric-value nexus-metric-animate">173</span>
                                    </span>
                                    <span className="nexus-metric-divider">|</span>
                                    <span className="nexus-metric">
                                        <span className="nexus-metric-label">SYNAPSES</span>
                                        <span className="nexus-metric-value nexus-metric-animate">2,847</span>
                                    </span>
                                    <span className="nexus-metric-divider">|</span>
                                    <span className="nexus-metric">
                                        <span className="nexus-metric-label">LATENCY</span>
                                        <span className="nexus-metric-value nexus-metric-animate">24ms</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ── RESPONSE: Structured Visual Cards ── */}
                        {showResponse && revealedText && (
                            <div className={`nexus-response-state ${answerExiting ? 'nexus-answer-exit' : ''}`}>
                                <div className="nexus-response-badge">
                                    <span className="nexus-badge-dot" />
                                    NEXUS RESPONSE
                                </div>
                                <div className="nexus-response-card">
                                    <div className="nexus-response-border" />
                                    <div className="nexus-response-glow" />
                                    <div className="nexus-response-content">
                                        {renderStructuredResponse(revealedText)}
                                        {isRevealing && <span className="nexus-cursor">|</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Chat Bar ── */}
                    <form
                        onSubmit={handleSubmit}
                        className={`nexus-chatbar ${chatBarVisible ? 'nexus-chatbar-visible' : 'nexus-chatbar-hidden'}`}
                    >
                        <div className="nexus-chatbar-inner">
                            <div className="nexus-chatbar-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="11" fill="white" />
                                    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="black" fontSize="14" fontWeight="900" fontFamily="Inter, sans-serif">M</text>
                                </svg>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={isLoading ? 'Neural pathways processing...' : 'Ask about my skills, projects, experience...'}
                                disabled={isLoading || !chatBarVisible}
                                className="nexus-chatbar-input"
                            />
                            <button type="submit" disabled={isLoading || !chatBarVisible} className="nexus-chatbar-send">
                                {isLoading ? (
                                    <span className="nexus-send-spin">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
