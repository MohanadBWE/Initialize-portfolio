'use client';

import { useScrollStore } from '@/store/useScrollStore';

export default function NexusCinematicIntro() {
    const offset = useScrollStore((state) => state.offset || 0);

    // Fade in at 28%, peak at 36%, fade out at 62%
    let opacity = 0;
    if (offset >= 0.28 && offset <= 0.62) {
        opacity = offset < 0.36
            ? (offset - 0.28) / 0.08
            : 1 - (offset - 0.36) / 0.26;
        opacity = Math.max(0, Math.min(1, opacity));
    }

    if (opacity === 0) return null;

    return (
        <div className="cinematic-intro">
            <div
                className="cinematic-block cinematic-block-title"
                style={{
                    opacity,
                    transform: `translateY(${(1 - opacity) * 20}px)`,
                }}
            >
                <div className="cinematic-deco-line" />
                <span className="cinematic-title-text">NEURAL NEXUS</span>
                <div className="cinematic-deco-line" />
            </div>
        </div>
    );
}
