'use client';

import { ReactLenis, useLenis } from '@studio-freight/react-lenis';
import { useScrollStore } from '@/store/useScrollStore';

// We need an inner component to hook into Lenis
function ScrollTracker({ children }: { children: React.ReactNode }) {
    useLenis(({ scroll, limit }) => {
        // Normalizes scroll to 0 -> 1
        const progress = limit > 0 ? scroll / limit : 0;
        useScrollStore.getState().setOffset(progress);
    });
    return <>{children}</>;
}

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
    return (
        <ReactLenis root options={{ lerp: 0.05, duration: 1.5, smoothWheel: true }}>
            <ScrollTracker>{children}</ScrollTracker>
        </ReactLenis>
    );
}
