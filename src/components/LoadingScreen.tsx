'use client';

import { useState, useEffect } from 'react';

export default function LoadingScreen() {
    const [progress, setProgress] = useState(0);
    const [hidden, setHidden] = useState(false);
    const [removed, setRemoved] = useState(false);

    useEffect(() => {
        // Simulate loading progress
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                // Accelerate towards end
                const increment = prev < 60 ? 8 : prev < 90 ? 4 : 2;
                return Math.min(100, prev + increment);
            });
        }, 80);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (progress >= 100) {
            const hideTimer = setTimeout(() => setHidden(true), 400);
            const removeTimer = setTimeout(() => setRemoved(true), 1000);
            return () => {
                clearTimeout(hideTimer);
                clearTimeout(removeTimer);
            };
        }
    }, [progress]);

    if (removed) return null;

    return (
        <div className={`loading-screen ${hidden ? 'hidden' : ''}`}>
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        fontSize: 'clamp(1.2rem, 4vw, 2rem)',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)',
                    }}
                >
                    Mohanad <span style={{ color: 'var(--reef-teal)' }}>Mala</span>
                </div>
                <div
                    style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.65rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase' as const,
                        color: 'var(--text-secondary)',
                    }}
                >
                    Data Engineer
                </div>
            </div>

            <div>
                <div className="loading-bar-track">
                    <div
                        className="loading-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="loading-text" style={{ marginTop: '0.8rem', textAlign: 'center' }}>
                    {progress < 100 ? 'Initializing reef...' : 'Dive in'}
                </p>
            </div>
        </div>
    );
}
