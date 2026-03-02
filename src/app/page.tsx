'use client';

import dynamic from 'next/dynamic';
import { AiProvider } from '@/context/AiContext';
import SmoothScrollProvider from '@/components/SmoothScrollProvider';
import LoadingScreen from '@/components/LoadingScreen';
import CosmicBackground from '@/components/CosmicBackground';
import Hero from '@/components/ui/Hero';
import NeuralChatOverlay from '@/components/ui/NeuralChatOverlay';
import NexusCinematicIntro from '@/components/ui/NexusCinematicIntro';

const Scene = dynamic(() => import('@/components/three/Scene'), { ssr: false });

export default function Home() {
  return (
    <AiProvider>
      <SmoothScrollProvider>
        <LoadingScreen />

        {/* Layer 0: Canvas2D cosmic starfield + nebula + data streams */}
        <CosmicBackground />

        {/* Layer 1: R3F 3D Neural Data Sphere Experience */}
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10 }}>
          <Scene />
        </div>

        {/* Layer 2: Intro HTML Overlay (Hero) */}
        <Hero />

        {/* Layer 2.5: Cinematic scroll intro for Neural Nexus */}
        <NexusCinematicIntro />

        {/* Layer 3: Full-screen Neural Chat Overlay (driven by scroll) */}
        <NeuralChatOverlay />
      </SmoothScrollProvider>
    </AiProvider>
  );
}
