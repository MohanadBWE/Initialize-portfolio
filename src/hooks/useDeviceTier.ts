'use client';

import { useState, useEffect } from 'react';

export type DeviceTier = 'high' | 'medium' | 'low';

export interface TierConfig {
    particleCount: number;
    dpr: [number, number];
    enablePostProcessing: boolean;
    enableAurora: boolean;
    shadowMapSize: number;
    maxLights: number;
    geometryDetail: number;
}

const TIER_CONFIGS: Record<DeviceTier, TierConfig> = {
    high: {
        particleCount: 1500,
        dpr: [1, 2],
        enablePostProcessing: true,
        enableAurora: true,
        shadowMapSize: 1024,
        maxLights: 4,
        geometryDetail: 64,
    },
    medium: {
        particleCount: 600,
        dpr: [1, 1.5],
        enablePostProcessing: false,
        enableAurora: true,
        shadowMapSize: 512,
        maxLights: 2,
        geometryDetail: 32,
    },
    low: {
        particleCount: 150,
        dpr: [0.75, 1],
        enablePostProcessing: false,
        enableAurora: false,
        shadowMapSize: 0,
        maxLights: 1,
        geometryDetail: 16,
    },
};

function detectTier(): DeviceTier {
    if (typeof window === 'undefined') return 'medium';

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) return 'low';

    // Check GPU renderer
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
        : '';

    // Known low-end GPU keywords
    const lowEndGPUs = ['mali-4', 'mali-t', 'adreno 3', 'adreno 4', 'adreno 50', 'powervr', 'sgx'];
    const isLowGPU = lowEndGPUs.some((g) => renderer.includes(g));

    // Device memory (Chrome only)
    const nav = navigator as Navigator & { deviceMemory?: number };
    const memory = nav.deviceMemory || 4;

    // Hardware concurrency
    const cores = navigator.hardwareConcurrency || 4;

    // Screen size factor
    const pixels = window.screen.width * window.screen.height;
    const isSmallScreen = pixels < 400000; // ~< 720p

    // Touch device heuristic
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Score based system
    let score = 0;
    if (memory >= 6) score += 3;
    else if (memory >= 4) score += 2;
    else score += 0;

    if (cores >= 6) score += 2;
    else if (cores >= 4) score += 1;

    if (!isLowGPU) score += 2;
    if (!isSmallScreen) score += 1;

    // Mobile penalty (touch devices are more thermally constrained)
    if (isTouch) score -= 1;

    canvas.remove();

    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
}

export function useDeviceTier() {
    const [tier, setTier] = useState<DeviceTier>('medium');
    const [config, setConfig] = useState<TierConfig>(TIER_CONFIGS.medium);

    useEffect(() => {
        const detected = detectTier();
        setTier(detected);
        setConfig(TIER_CONFIGS[detected]);
    }, []);

    return { tier, config };
}
