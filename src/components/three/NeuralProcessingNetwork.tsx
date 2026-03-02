'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAi } from '@/context/AiContext';
import { useScrollStore } from '@/store/useScrollStore';

/* ─────────────────────────────────────────────────────────────
   NeuralProcessingNetwork — v4: Organic Neurons
   
   Inspired by biological neural network visualizations.
   • Large ring-shaped neuron cell bodies (soma)
   • Curved organic fiber connections (dendrites/axons)
   • Dense web of fine strands for depth
   • Floating HUD data labels (via CSS overlay)
   ────────────────────────────────────────────────────────── */

// ── NEURON NODE SHADER: renders as RINGS (hollow circles) ──
const nodeVert = `
  precision highp float;
  attribute float aPhase;
  attribute float aSizeBase;
  attribute float aRingType; // 0 = large ring, 1 = medium, 2 = small dot
  uniform float uTime;
  uniform float uActivity;
  varying float vAlpha;
  varying float vRingType;
  varying float vPhase;

  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float t = uTime;

    // Organic pulsing — each neuron has its own rhythm
    float pulse = sin(t * (0.8 + aPhase * 2.0) + aPhase * 6.28) * 0.5 + 0.5;
    float breathe = sin(t * (0.3 + aPhase * 0.5)) * 0.5 + 0.5;
    
    // Firing bursts
    float fire = pow(sin(t * (5.0 + aPhase * 15.0) + aPhase * 12.56) * 0.5 + 0.5, 10.0);
    
    // Idle: soft ambient glow
    float idleVal = 0.25 + pulse * 0.25 + breathe * 0.15 + fire * 0.3;
    
    // Active: bright firing
    float activeFire = pow(sin(t * (12.0 + aPhase * 25.0) + aPhase * 6.28) * 0.5 + 0.5, 3.0);
    float activeVal = 0.5 + pulse * 0.2 + activeFire * 0.5;
    
    vAlpha = mix(idleVal, activeVal, uActivity);
    vRingType = aRingType;
    vPhase = aPhase;

    // Size based on type — smaller, refined rings
    float baseSize = aSizeBase;
    if (aRingType < 0.5) baseSize *= 4.0;        // large neuron rings
    else if (aRingType < 1.5) baseSize *= 2.5;   // medium rings
    else baseSize *= 1.0;                          // small junction dots
    
    float size = baseSize * (1.0 + uActivity * 0.3 + activeFire * uActivity * 0.5);
    float breatheSize = 1.0 + breathe * 0.08;
    gl_PointSize = size * breatheSize * (200.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const nodeFrag = `
  precision mediump float;
  varying float vAlpha;
  varying float vRingType;
  varying float vPhase;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float alpha = 0.0;
    vec3 color;

    if (vRingType < 0.5) {
      // LARGE NEURON — double ring with glow
      float outerRing = smoothstep(0.46, 0.43, d) * smoothstep(0.38, 0.41, d);
      float innerRing = smoothstep(0.30, 0.27, d) * smoothstep(0.22, 0.25, d);
      float centerDot = smoothstep(0.08, 0.0, d);
      float glow = smoothstep(0.5, 0.15, d) * 0.12;
      alpha = (outerRing * 0.9 + innerRing * 0.5 + centerDot * 0.7 + glow) * vAlpha;
      // White-ish with slight warmth
      color = vec3(0.85, 0.88, 0.92);
    } else if (vRingType < 1.5) {
      // MEDIUM NEURON — single ring
      float ring = smoothstep(0.46, 0.42, d) * smoothstep(0.34, 0.38, d);
      float center = smoothstep(0.1, 0.0, d) * 0.5;
      float glow = smoothstep(0.5, 0.2, d) * 0.1;
      alpha = (ring * 0.8 + center + glow) * vAlpha;
      color = vec3(0.75, 0.82, 0.88);
    } else {
      // SMALL DOT — junction/synapse
      float dot = smoothstep(0.5, 0.1, d);
      alpha = dot * vAlpha * 0.7;
      color = vec3(0.5, 0.75, 0.85);
    }

    gl_FragColor = vec4(color, alpha);
  }
`;

// ── FIBER/CONNECTION SHADER ──
const fiberVert = `
  precision highp float;
  attribute float aFiberPhase;
  attribute float aFiberProgress;
  attribute float aFiberThickness;
  uniform float uTime;
  uniform float uActivity;
  varying float vLineAlpha;

  void main() {
    float t = uTime;
    
    // Traveling signal pulse along fiber
    float speed = 0.15 + aFiberPhase * 0.25;
    float pulse = fract(t * speed + aFiberPhase);
    float signal = smoothstep(0.0, 0.08, 1.0 - abs(aFiberProgress - pulse));
    
    // Idle: visible organic strands
    float baseAlpha = aFiberThickness * (0.06 + sin(t * 0.3 + aFiberPhase * 6.28) * 0.03);
    
    // Active: bright signal pulses
    float activeAlpha = aFiberThickness * (0.04 + signal * 0.5);
    
    vLineAlpha = mix(baseAlpha, activeAlpha, uActivity);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fiberFrag = `
  precision mediump float;
  varying float vLineAlpha;
  void main() {
    // Light gray-white fibers like the reference
    gl_FragColor = vec4(0.7, 0.75, 0.8, vLineAlpha);
  }
`;

// ── Build organic neural network ──
function buildOrganicNetwork() {
    const positions: number[] = [];
    const phases: number[] = [];
    const sizes: number[] = [];
    const ringTypes: number[] = [];

    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    // ═══════════════════════════════════════
    // LARGE NEURON CELL BODIES (15-20)
    // These are the big ring nodes from the reference
    // ═══════════════════════════════════════
    const neuronCenters: [number, number, number][] = [];
    const largeNeurons = [
        // Spread across the brain shape
        [-2.5, 2.0, 1.5], [-0.8, 3.0, 0.5], [1.5, 2.5, 1.0],
        [-3.5, 0.5, -0.5], [-1.0, 1.0, 2.5], [2.0, 1.0, -1.0],
        [3.5, 0.5, 0.5], [-2.0, -0.5, -2.0], [0.5, 0.0, -2.5],
        [2.5, -0.5, -1.5], [-3.0, -1.5, 1.0], [0.0, -1.0, 1.5],
        [3.0, -1.0, 0.0], [-1.5, 2.5, -1.5], [1.0, -2.0, -0.5],
        [-0.5, 0.5, 0.0], [2.5, 2.0, -0.5], [-2.5, -1.0, 2.0],
    ];

    for (const [x, y, z] of largeNeurons) {
        const jitter = 0.3;
        const nx = x + (rand() - 0.5) * jitter;
        const ny = y + (rand() - 0.5) * jitter;
        const nz = z + (rand() - 0.5) * jitter;
        positions.push(nx, ny, nz);
        neuronCenters.push([nx, ny, nz]);
        phases.push(rand());
        sizes.push(0.12 + rand() * 0.08);
        ringTypes.push(0); // large ring type
    }

    // ═══════════════════════════════════════
    // MEDIUM NEURON NODES (30-40)
    // Smaller rings scattered around
    // ═══════════════════════════════════════
    for (let i = 0; i < 35; i++) {
        const x = (rand() - 0.5) * 10;
        const y = (rand() - 0.5) * 7;
        const z = (rand() - 0.5) * 8;
        positions.push(x, y, z);
        neuronCenters.push([x, y, z]);
        phases.push(rand());
        sizes.push(0.08 + rand() * 0.06);
        ringTypes.push(1); // medium ring type
    }

    // ═══════════════════════════════════════
    // SMALL JUNCTION DOTS (100+)
    // Tiny dots along fiber paths and at intersections
    // ═══════════════════════════════════════
    for (let i = 0; i < 120; i++) {
        const x = (rand() - 0.5) * 12;
        const y = (rand() - 0.5) * 9;
        const z = (rand() - 0.5) * 10;
        positions.push(x, y, z);
        phases.push(rand());
        sizes.push(0.04 + rand() * 0.04);
        ringTypes.push(2); // small dot type
    }

    // ═══════════════════════════════════════
    // CURVED FIBER CONNECTIONS (organic bezier curves)
    // Each connection is a curved path with multiple segments
    // ═══════════════════════════════════════
    const fiberPos: number[] = [];
    const fiberPhases: number[] = [];
    const fiberProgress: number[] = [];
    const fiberThickness: number[] = [];

    const CURVE_SEGMENTS = 16; // segments per curve

    // Helper: create a curved fiber between two points
    function addFiber(
        ax: number, ay: number, az: number,
        bx: number, by: number, bz: number,
        thickness: number
    ) {
        // Control point: midpoint with perpendicular offset for organic curve
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const mz = (az + bz) / 2;

        // Perpendicular offset for curve — makes it organic
        const dx = bx - ax, dy = by - ay, dz = bz - az;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const offset = len * (0.15 + rand() * 0.25);

        // Random perpendicular direction
        const px = (rand() - 0.5);
        const py = (rand() - 0.5);
        const pz = (rand() - 0.5);
        const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1;

        const cpx = mx + (px / pLen) * offset;
        const cpy = my + (py / pLen) * offset;
        const cpz = mz + (pz / pLen) * offset;

        const phase = rand();

        // Sample quadratic bezier curve
        for (let s = 0; s < CURVE_SEGMENTS; s++) {
            const t0 = s / CURVE_SEGMENTS;
            const t1 = (s + 1) / CURVE_SEGMENTS;

            // Quadratic bezier: B(t) = (1-t)²A + 2(1-t)tC + t²B
            const x0 = (1 - t0) * (1 - t0) * ax + 2 * (1 - t0) * t0 * cpx + t0 * t0 * bx;
            const y0 = (1 - t0) * (1 - t0) * ay + 2 * (1 - t0) * t0 * cpy + t0 * t0 * by;
            const z0 = (1 - t0) * (1 - t0) * az + 2 * (1 - t0) * t0 * cpz + t0 * t0 * bz;

            const x1 = (1 - t1) * (1 - t1) * ax + 2 * (1 - t1) * t1 * cpx + t1 * t1 * bx;
            const y1 = (1 - t1) * (1 - t1) * ay + 2 * (1 - t1) * t1 * cpy + t1 * t1 * by;
            const z1 = (1 - t1) * (1 - t1) * az + 2 * (1 - t1) * t1 * cpz + t1 * t1 * bz;

            fiberPos.push(x0, y0, z0, x1, y1, z1);
            fiberPhases.push(phase, phase);
            fiberProgress.push(t0, t1);
            fiberThickness.push(thickness, thickness);
        }
    }

    // Connect neurons to nearest neighbors with curved fibers
    const totalNeurons = neuronCenters.length;
    for (let i = 0; i < totalNeurons; i++) {
        const [ax, ay, az] = neuronCenters[i];

        // Find closest neurons
        const neighbors: { idx: number; dist: number }[] = [];
        for (let j = 0; j < totalNeurons; j++) {
            if (i === j) continue;
            const [bx, by, bz] = neuronCenters[j];
            const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);
            if (dist < 5.0) neighbors.push({ idx: j, dist });
        }
        neighbors.sort((a, b) => a.dist - b.dist);

        // Connect to 2-4 nearest
        const take = Math.min(neighbors.length, 2 + (i % 3));
        for (let k = 0; k < take; k++) {
            const [bx, by, bz] = neuronCenters[neighbors[k].idx];

            // Main fiber (thicker)
            addFiber(ax, ay, az, bx, by, bz, 1.0);

            // Secondary parallel fiber (thinner, offset) for organic bundle effect
            if (rand() > 0.4) {
                const off = 0.15;
                addFiber(
                    ax + (rand() - 0.5) * off, ay + (rand() - 0.5) * off, az + (rand() - 0.5) * off,
                    bx + (rand() - 0.5) * off, by + (rand() - 0.5) * off, bz + (rand() - 0.5) * off,
                    0.6
                );
            }
        }
    }



    return {
        nodePositions: new Float32Array(positions),
        nodePhases: new Float32Array(phases),
        nodeSizes: new Float32Array(sizes),
        nodeRingTypes: new Float32Array(ringTypes),
        fiberPositions: new Float32Array(fiberPos),
        fiberPhases: new Float32Array(fiberPhases),
        fiberProgress: new Float32Array(fiberProgress),
        fiberThickness: new Float32Array(fiberThickness),
    };
}

export default function NeuralProcessingNetwork() {
    const { isLoading } = useAi();
    const offset = useScrollStore((state) => state.offset || 0);
    const groupRef = useRef<THREE.Group>(null);
    const activityRef = useRef(0);

    const net = useMemo(() => buildOrganicNetwork(), []);

    const nodeGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(net.nodePositions, 3));
        geo.setAttribute('aPhase', new THREE.BufferAttribute(net.nodePhases, 1));
        geo.setAttribute('aSizeBase', new THREE.BufferAttribute(net.nodeSizes, 1));
        geo.setAttribute('aRingType', new THREE.BufferAttribute(net.nodeRingTypes, 1));
        return geo;
    }, [net]);

    const nodeMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: nodeVert,
        fragmentShader: nodeFrag,
        uniforms: {
            uTime: { value: 0 },
            uActivity: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }), []);

    const fiberGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(net.fiberPositions, 3));
        geo.setAttribute('aFiberPhase', new THREE.BufferAttribute(net.fiberPhases, 1));
        geo.setAttribute('aFiberProgress', new THREE.BufferAttribute(net.fiberProgress, 1));
        geo.setAttribute('aFiberThickness', new THREE.BufferAttribute(net.fiberThickness, 1));
        return geo;
    }, [net]);

    const fiberMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: fiberVert,
        fragmentShader: fiberFrag,
        uniforms: {
            uTime: { value: 0 },
            uActivity: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }), []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const target = isLoading ? 1 : 0;
        activityRef.current += (target - activityRef.current) * 0.04;

        nodeMat.uniforms.uTime.value = t;
        nodeMat.uniforms.uActivity.value = activityRef.current;
        fiberMat.uniforms.uTime.value = t;
        fiberMat.uniforms.uActivity.value = activityRef.current;

        // Very slow rotation
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.025;
        }
    });

    // Scale for viewport
    const { viewport } = useThree();
    const isMobile = viewport.width < 10;
    const baseScale = isMobile ? 0.7 : 0.9;
    const zPos = isMobile ? -14 : -10;

    // Only show in the void
    const vis = Math.max(0, Math.min(1, (offset - 0.55) / 0.2));
    if (vis <= 0) return null;

    return (
        <group ref={groupRef} position={[0, isMobile ? 0.5 : 0, zPos]} scale={vis * baseScale}>
            <points geometry={nodeGeo} material={nodeMat} />
            <lineSegments geometry={fiberGeo} material={fiberMat} />
        </group>
    );
}
