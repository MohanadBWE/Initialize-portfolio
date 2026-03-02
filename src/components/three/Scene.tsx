'use client';

import { Suspense, useEffect, useState } from 'react';

import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

import DataCore from './DataCore';
import CameraRig from './CameraRig';
import NeuralProcessingNetwork from './NeuralProcessingNetwork';   // ← NEW
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { useAi } from '@/context/AiContext';

export default function Scene() {
    const { config, tier } = useDeviceTier();
    const { orbPulsing, openChat } = useAi();
    const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setDpr(config.dpr);
    }, [config.dpr]);

    if (!isClient || tier === 'low') return null;

    return (
        <div
            className="canvas-container"
            aria-hidden="true"
        >
            <Canvas
                dpr={dpr}
                camera={{ position: [0, 0, 5.5], fov: 50 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true,
                    toneMapping: 4,
                    toneMappingExposure: 1.25,
                }}
                style={{ background: 'transparent' }}
            >
                <PerformanceMonitor
                    onDecline={() => setDpr([0.75, 1])}
                    onIncline={() => setDpr(config.dpr)}
                />
                <AdaptiveDpr pixelated />

                <Suspense fallback={null}>

                    <ambientLight intensity={0.4} color="#0a1628" />
                    <directionalLight position={[3, 4, 5]} intensity={1.2} color="#e8f0ff" />
                    <pointLight position={[5, 5, 5]} intensity={1.0} color="#00e5c8" distance={20} decay={2} />
                    <pointLight position={[-5, -3, 3]} intensity={0.6} color="#e040fb" distance={15} decay={2} />
                    <pointLight position={[-3, 4, -4]} intensity={0.5} color="#00d4ff" distance={15} decay={2} />
                    {tier === 'high' && (
                        <pointLight position={[0, 8, -5]} intensity={0.3} color="#ffab40" distance={12} decay={2} />
                    )}

                    <CameraRig />
                    <DataCore />

                    {/* 🔥 BIG NEURAL NETWORK — appears in black void + activates on question */}
                    <NeuralProcessingNetwork />

                    {/* Post-processing Bloom — optimized for scroll perf */}
                    <EffectComposer multisampling={0}>
                        <Bloom
                            intensity={tier === 'high' ? 1.1 : 0.7}
                            luminanceThreshold={0.3}
                            luminanceSmoothing={0.9}
                            height={300}
                        />
                    </EffectComposer>
                </Suspense>
            </Canvas>
        </div>
    );
}