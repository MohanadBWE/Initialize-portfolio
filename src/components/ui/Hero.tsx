'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useScrollStore } from '@/store/useScrollStore';

export default function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        gsap.fromTo(
            containerRef.current.children,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, stagger: 0.2, duration: 1.6, ease: 'power3.out', delay: 0.5 }
        );
    }, []);

    // Fade out hero as we scroll
    useEffect(() => {
        const unsubscribe = useScrollStore.subscribe((state) => {
            if (!containerRef.current) return;
            const fadeOut = Math.max(0, 1 - state.offset * 3.5);
            containerRef.current.style.opacity = String(fadeOut);
            containerRef.current.style.transform = `translateY(${-state.offset * 120}px)`;
        });
        return unsubscribe;
    }, []);

    return (
        <div ref={containerRef} className="hero-container">
            {/* Name */}
            <div className="hero-name-block">
                <h1 className="hero-name">
                    Mohanad{' '}
                    <span className="hero-name-accent">Mala</span>
                </h1>
            </div>

            {/* Title + Tagline */}
            <div className="hero-title-block">
                <h2 className="hero-title">DATA ENGINEER</h2>
                <p className="hero-tagline">
                    Engineering data pipelines that transform chaos to clarity.
                </p>
            </div>


        </div>
    );
}