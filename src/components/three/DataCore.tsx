'use client';

import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScrollStore } from '@/store/useScrollStore';
import * as THREE from 'three';
import { MeshTransmissionMaterial, Float, Instances, Instance, GradientTexture } from '@react-three/drei';

export default function DataCore() {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Group>(null);
    const innerGeo1Ref = useRef<THREE.Mesh>(null);
    const innerGeo2Ref = useRef<THREE.Mesh>(null);
    const ring1Ref = useRef<THREE.Group>(null);
    const ring2Ref = useRef<THREE.Group>(null);
    const ring3Ref = useRef<THREE.Group>(null);
    const particlesRef = useRef<THREE.Points>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const glowRef = useRef<THREE.Points>(null);

    const offset = useScrollStore((state) => state.offset || 0);

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const rotVel = useRef({ x: 0, y: 0 });

    const onPointerDown = useCallback((e: any) => {
        e.stopPropagation();
        setIsDragging(true);
        dragStart.current = { x: e.clientX || 0, y: e.clientY || 0 };
    }, []);

    const onPointerMove = useCallback((e: any) => {
        if (!isDragging) return;
        const dx = ((e.clientX || 0) - dragStart.current.x) * 0.005;
        const dy = ((e.clientY || 0) - dragStart.current.y) * 0.005;
        rotVel.current.x += dy;
        rotVel.current.y += dx;
        dragStart.current = { x: e.clientX || 0, y: e.clientY || 0 };
    }, [isDragging]);

    const onPointerUp = useCallback(() => setIsDragging(false), []);

    // ========================================================================
    // GEOMETRY DATA
    // ========================================================================

    // 1. Chaotic Data Particles (The "Chaos")
    const numParticles = 1200;
    const { particlePositions, particleColors, particlePhases } = useMemo(() => {
        const pos = new Float32Array(numParticles * 3);
        const col = new Float32Array(numParticles * 3);
        const phases = new Float32Array(numParticles);

        const color1 = new THREE.Color('#00f0ff'); // Cyan
        const color2 = new THREE.Color('#b53dff'); // Purple
        const color3 = new THREE.Color('#ff007f'); // Neon Pink

        for (let i = 0; i < numParticles; i++) {
            // Distribute in a wide torus/disc shape
            const radius = 2.0 + Math.random() * 5.0; // Sparse outside
            const theta = Math.random() * Math.PI * 2;
            const yOffset = (Math.random() - 0.5) * (1.5 + radius * 0.2); // Thicker at edges

            pos[i * 3] = Math.cos(theta) * radius;
            pos[i * 3 + 1] = yOffset;
            pos[i * 3 + 2] = Math.sin(theta) * radius;

            // Pick a color
            const randColor = Math.random();
            const finalColor = randColor < 0.5 ? color1 : (randColor < 0.8 ? color2 : color3);

            col[i * 3] = finalColor.r;
            col[i * 3 + 1] = finalColor.g;
            col[i * 3 + 2] = finalColor.b;

            // Random phase for pulsing
            phases[i] = Math.random() * Math.PI * 2;
        }

        return { particlePositions: pos, particleColors: col, particlePhases: phases };
    }, []);

    // 2. Data Bus Nodes (The "Clarity")
    // Structured data flowing along perfect orbital rings
    const busNodes1 = useMemo(() => Array.from({ length: 24 }).map((_, i) => (i / 24) * Math.PI * 2), []);
    const busNodes2 = useMemo(() => Array.from({ length: 36 }).map((_, i) => (i / 36) * Math.PI * 2), []);
    const busNodes3 = useMemo(() => Array.from({ length: 48 }).map((_, i) => (i / 48) * Math.PI * 2), []);

    // 3. Dynamic Neuron Connections (Rings to Core)
    // We only create the colors and random IDs once, but the positions must be updated every frame
    const { lineColors, lineRandoms, lineRingIndices, basePositions } = useMemo(() => {
        const numConnections = (24 / 2) + (36 / 2) + (48 / 4); // ~ 42 lines
        const col = new Float32Array(numConnections * 2 * 3);
        const rands = new Float32Array(numConnections * 2);
        const ringIdx = new Int32Array(numConnections); // Tracks which ring this line connects to (1, 2, or 3)
        const basePos: THREE.Vector3[] = []; // The un-rotated source destination points

        const colorInner = new THREE.Color('#ffffff');
        const colorOuter1 = new THREE.Color('#00e5ff'); // Ring 1: Cyan
        const colorOuter2 = new THREE.Color('#b53dff'); // Ring 2: Vivid Purple
        const colorOuter3 = new THREE.Color('#4488ff'); // Ring 3: Electric Blue

        let idx = 0;

        const addLine = (radius: number, angle: number, outerColor: THREE.Color, rId: number) => {
            // Both ends of the line use the ring's color for clear differentiation
            col[idx * 6] = outerColor.r; col[idx * 6 + 1] = outerColor.g; col[idx * 6 + 2] = outerColor.b;
            rands[idx * 2] = Math.random();

            // Ring Node base position
            basePos.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
            // Ring Node color/random
            col[idx * 6 + 3] = outerColor.r; col[idx * 6 + 4] = outerColor.g; col[idx * 6 + 5] = outerColor.b;
            rands[idx * 2 + 1] = rands[idx * 2];

            ringIdx[idx] = rId;
            idx++;
        };

        busNodes1.forEach((angle, i) => { if (i % 2 === 0) addLine(1.8, angle, colorOuter1, 1); });
        busNodes2.forEach((angle, i) => { if (i % 2 === 0) addLine(2.6, angle, colorOuter2, 2); });
        busNodes3.forEach((angle, i) => { if (i % 4 === 0) addLine(3.5, angle, colorOuter3, 3); });

        return { lineColors: col, lineRandoms: rands, lineRingIndices: ringIdx, basePositions: basePos };
    }, [busNodes1, busNodes2, busNodes3]);

    // 4. Glow halos for ring dots (one per connection node)
    const { glowPositions, glowColors, glowRandoms } = useMemo(() => {
        const numGlows = basePositions.length;
        const pos = new Float32Array(numGlows * 3);
        const col = new Float32Array(numGlows * 3);
        const rands = new Float32Array(numGlows);

        for (let i = 0; i < numGlows; i++) {
            // Initial positions (will be updated in useFrame)
            pos[i * 3] = basePositions[i].x;
            pos[i * 3 + 1] = basePositions[i].y;
            pos[i * 3 + 2] = basePositions[i].z;
            // Colors match the line colors (outer endpoint)
            col[i * 3] = lineColors[i * 6 + 3];
            col[i * 3 + 1] = lineColors[i * 6 + 4];
            col[i * 3 + 2] = lineColors[i * 6 + 5];
            // Same random as the line for synchronized timing
            rands[i] = lineRandoms[i * 2];
        }

        return { glowPositions: pos, glowColors: col, glowRandoms: rands };
    }, [basePositions, lineColors, lineRandoms]);

    // Glow dot shader material — bright shiny burst when a line fires
    const glowMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            attribute vec3 color;
            attribute float randomId;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            
            void main() {
                vColor = color;
                
                // Same timing logic as the neuron lines
                float cycleLength = 3.5;
                float cycle = mod(uTime + randomId * 100.0, cycleLength);
                float isActive = step(cycle, 1.2);
                
                // Glow intensity: instant bright burst, then slow fade
                float burstIntensity = smoothstep(0.0, 0.02, cycle) * (1.0 - smoothstep(0.02, 1.2, cycle));
                vAlpha = isActive * burstIntensity;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                
                // Size: tiny idle, MASSIVE when firing
                float baseSize = 5.0;
                float fireSize = 180.0;
                gl_PointSize = mix(baseSize, fireSize, vAlpha) / -mvPosition.z;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                // Soft radial gradient for brilliant glow halo
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                // Very soft falloff — wide glow
                float strength = 1.0 - smoothstep(0.0, 0.5, dist);
                strength = pow(strength, 1.5); // Softer than before for wider glow
                
                // Hot white center that fades to ring color at edges
                vec3 finalColor = mix(vColor * 1.5, vec3(1.0), strength * 0.8);
                
                gl_FragColor = vec4(finalColor, strength * vAlpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }), []);

    // Pulsing ring shader materials — one per ring with unique color/speed
    const makeRingMaterial = (color: string, speed: number) => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPos;
            void main() {
                vUv = uv;
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vPos;
            void main() {
                vec3 baseColor = vec3(${new THREE.Color(color).toArray().map(c => c.toFixed(3)).join(', ')});
                
                // Breathing pulse
                float breath = 0.25 + 0.15 * sin(uTime * ${speed.toFixed(1)});
                
                // Scanner sweep — a bright arc traveling around the ring
                float angle = atan(vPos.y, vPos.x);
                float sweep = sin(angle * 2.0 - uTime * ${(speed * 0.7).toFixed(1)}) * 0.5 + 0.5;
                sweep = pow(sweep, 6.0); // Sharp bright band
                
                float alpha = breath + sweep * 0.35;
                vec3 col = mix(baseColor, vec3(1.0), sweep * 0.4);
                
                gl_FragColor = vec4(col, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const ring1Mat = useMemo(() => makeRingMaterial('#00e5ff', 1.8), []);
    const ring2Mat = useMemo(() => makeRingMaterial('#b53dff', 1.2), []);
    const ring3Mat = useMemo(() => makeRingMaterial('#4488ff', 0.7), []);

    // Wireframe data-flow flicker materials — for the core's wireframe layers
    const makeWireflowMaterial = (color: string, speed: number, baseOpacity: number) => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec3 vPos;
            void main() {
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;
            void main() {
                vec3 baseColor = vec3(${new THREE.Color(color).toArray().map(c => c.toFixed(3)).join(', ')});
                
                // Position-based noise flicker — simulates data flowing through wires
                float noise = fract(sin(dot(vPos.xy, vec2(12.9898, 78.233)) + uTime * ${speed.toFixed(1)}) * 43758.5453);
                float flicker = smoothstep(0.3, 0.7, noise);
                
                // Vertical wave sweep — data flowing upward
                float wave = sin(vPos.y * 8.0 - uTime * ${(speed * 2.0).toFixed(1)}) * 0.5 + 0.5;
                wave = pow(wave, 3.0);
                
                float alpha = ${baseOpacity.toFixed(2)} * (0.4 + flicker * 0.6) + wave * 0.15;
                vec3 col = mix(baseColor, vec3(1.0), wave * 0.3);
                
                gl_FragColor = vec4(col, alpha);
            }
        `,
        transparent: true,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const wireflow1Mat = useMemo(() => makeWireflowMaterial('#00e5ff', 1.5, 0.1), []);
    const wireflow2Mat = useMemo(() => makeWireflowMaterial('#4488ff', 2.0, 0.12), []);
    const wireflow3Mat = useMemo(() => makeWireflowMaterial('#b53dff', 1.0, 0.25), []);

    // Custom shader for the particles to pulse and move slightly
    const particleMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uScroll: { value: 0 }
        },
        vertexShader: `
            attribute vec3 color;
            attribute float phase;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            uniform float uScroll;
            
            void main() {
                vColor = color;
                
                // Particles pull inward as you scroll (Chaos to Clarity)
                vec3 pos = position;
                float dist = length(pos);
                float pull = smoothstep(0.0, 1.0, uScroll) * 0.6; // Pull them up to 60% closer
                pos = mix(pos, normalize(pos) * max(0.8, dist * 0.2), pull * 0.8);
                
                // Slow organic drift
                pos.y += sin(uTime * 0.5 + phase) * 0.15;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                
                // Size changes based on depth and scroll
                gl_PointSize = (12.0 * (1.0 + sin(uTime * 2.0 + phase) * 0.5)) / -mvPosition.z;
                
                // Brighten as they get closer to center
                vAlpha = smoothstep(6.0, 1.5, dist) * 0.8 + 0.2;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                // Soft circle point
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float strength = smoothstep(0.5, 0.1, dist);
                gl_FragColor = vec4(vColor * 1.5, strength * vAlpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }), []);

    // Custom shader for neuron lines (pulsing, disconnecting)
    const lineMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            attribute vec3 color;
            attribute float randomId;
            // The position array naturally alternates [core(0,0,0), node(x,y,0), core(0,0,0), node(x,y,0)]
            // We use length(position) to determine if we are at the core (radius = 0) or at the ring (radius > 1)
            // This lets us map a 1.0 to 0.0 'uv' coordinate along the line mathematically.
            varying vec3 vColor;
            varying float vRandom;
            varying float vProgress; // 0.0 at core, 1.0 at outer ring
            
            void main() {
                vColor = color;
                vRandom = randomId;
                vProgress = length(position) > 0.5 ? 1.0 : 0.0;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vColor;
            varying float vRandom;
            varying float vProgress; // 1.0 (Ring) -> 0.0 (Core)
            
            void main() {
                // Each line operates on an independent ~3.5 second cycle based on its random ID
                float cycleLength = 3.5;
                float cycle = mod(uTime + vRandom * 100.0, cycleLength);
                
                // The line is "connected" for the first 1.2 seconds of the cycle
                float isActive = step(cycle, 1.2);
                
                // --- Animation Effects (Only run when active) ---
                
                // 1. The baseline string: Glows softly while active
                float baselineAlpha = 0.15;
                
                // 2. The traveling electron/pulse: Shoots from Ring (1.0) to Core (0.0)
                float travelTime = cycle / 1.2; 
                float pulsePosition = 1.0 - travelTime; 
                
                float diff = vProgress - pulsePosition;
                float head = smoothstep(-0.02, 0.0, diff);
                float tail = smoothstep(0.4, 0.0, diff);
                float pulseAlpha = head * tail * 2.0;
                
                // 3. Connection strike flash
                float strikeFlash = smoothstep(0.0, 0.05, cycle) * (1.0 - smoothstep(0.05, 0.2, cycle));
                
                // 4. Random electrical flicker
                float flicker = step(0.1, fract(sin(uTime * 15.0 + vRandom) * 43758.5453));
                
                // === 5. DOT SPARK EFFECTS ===
                
                // Spark at the RING DOT (vProgress = 1.0) when the line first fires
                // Bright burst that fades quickly
                float dotSpark = smoothstep(0.8, 1.0, vProgress)  // Only near the dot
                              * smoothstep(0.0, 0.05, cycle)       // Ramp up instantly
                              * (1.0 - smoothstep(0.05, 0.6, cycle)); // Fade out over 0.6s
                dotSpark *= 3.0; // Extra bright
                
                // Spark at the CORE (vProgress = 0.0) when the pulse arrives
                float coreSpark = smoothstep(0.2, 0.0, vProgress) // Only near the core
                               * smoothstep(0.8, 1.0, travelTime) // Only when pulse reaches core
                               * (1.0 - smoothstep(1.0, 1.2, cycle / 1.2)); // Quick fade
                coreSpark *= 2.0;
                
                // Calculate final pixel opacity
                float finalAlpha = isActive * ((baselineAlpha + pulseAlpha + strikeFlash + dotSpark + coreSpark) * flicker);
                
                // Modulate color: white at sparks and pulse head
                float whiteness = max(pulseAlpha, max(dotSpark, coreSpark)) * 0.6;
                vec3 finalColor = mix(vColor, vec3(1.0, 1.0, 1.0), whiteness);
                
                gl_FragColor = vec4(finalColor, finalAlpha * 0.9);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 1, // Note: WebGL standard restricts this to 1px on most platforms
    }), []);

    // ========================================================================
    // ANIMATION LOOP
    // ========================================================================
    useFrame((state, delta) => {
        const time = state.clock.getElapsedTime();
        const scroll = offset;

        particleMaterial.uniforms.uTime.value = time;
        particleMaterial.uniforms.uScroll.value = scroll;
        lineMaterial.uniforms.uTime.value = time;
        glowMaterial.uniforms.uTime.value = time;
        ring1Mat.uniforms.uTime.value = time;
        ring2Mat.uniforms.uTime.value = time;
        ring3Mat.uniforms.uTime.value = time;
        wireflow1Mat.uniforms.uTime.value = time;
        wireflow2Mat.uniforms.uTime.value = time;
        wireflow3Mat.uniforms.uTime.value = time;

        if (groupRef.current) {
            // General slow rotation that reacts to drag
            groupRef.current.rotation.y = time * 0.05 + rotVel.current.y;
            groupRef.current.rotation.x = rotVel.current.x;
        }

        if (coreRef.current) {
            // Core slowly spins on its own axes
            coreRef.current.rotation.x = time * 0.2;
            coreRef.current.rotation.y = time * 0.25;
            // Core expands slightly as you scroll into it
            const coreScale = 1.0 + scroll * 0.5;
            coreRef.current.scale.setScalar(coreScale);
        }

        if (innerGeo1Ref.current && innerGeo2Ref.current) {
            innerGeo1Ref.current.rotation.y = -time * 0.5;
            innerGeo1Ref.current.rotation.z = time * 0.3;
            innerGeo2Ref.current.rotation.x = time * 0.4;
            innerGeo2Ref.current.rotation.y = -time * 0.4;
        }

        if (ring1Ref.current && ring2Ref.current && ring3Ref.current) {
            // Rings spin in different directions and speeds
            ring1Ref.current.rotation.z = time * 0.15;
            ring1Ref.current.rotation.x = Math.sin(time * 0.1) * 0.2; // Slight wobble

            ring2Ref.current.rotation.z = -time * 0.1;
            ring2Ref.current.rotation.y = Math.cos(time * 0.08) * 0.2;

            ring3Ref.current.rotation.z = time * 0.05;
            ring3Ref.current.rotation.x = -Math.sin(time * 0.15) * 0.1;

            // Rings align flat as you scroll in (Clarity)
            const alignFactor = scroll * scroll;
            ring1Ref.current.rotation.x = THREE.MathUtils.lerp(ring1Ref.current.rotation.x, Math.PI / 2, alignFactor);
            ring2Ref.current.rotation.y = THREE.MathUtils.lerp(ring2Ref.current.rotation.y, 0, alignFactor);

            // Third ring aligns to form a protective cage around the others
            ring3Ref.current.rotation.x = THREE.MathUtils.lerp(ring3Ref.current.rotation.x, Math.PI / 2, alignFactor);
            ring3Ref.current.rotation.y = THREE.MathUtils.lerp(ring3Ref.current.rotation.y, Math.PI / 2, alignFactor);

            // --- DYNAMIC LINE UPDATES ---
            // Since lineSegments and the rings share the same parent (groupRef),
            // we use the ring's LOCAL matrix (not matrixWorld) to avoid double-transforming.
            if (linesRef.current) {
                const positionAttribute = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
                const posArray = positionAttribute.array as Float32Array;

                // Ensure local matrices are up to date for this frame
                ring1Ref.current.updateMatrix();
                ring2Ref.current.updateMatrix();
                ring3Ref.current.updateMatrix();

                const tempVec = new THREE.Vector3();

                for (let i = 0; i < basePositions.length; i++) {
                    // Center point is always 0,0,0
                    const ringId = lineRingIndices[i];
                    tempVec.copy(basePositions[i]);

                    // Apply the LOCAL rotation matrix of the parent ring
                    if (ringId === 1) tempVec.applyMatrix4(ring1Ref.current.matrix);
                    else if (ringId === 2) tempVec.applyMatrix4(ring2Ref.current.matrix);
                    else if (ringId === 3) tempVec.applyMatrix4(ring3Ref.current.matrix);

                    // The ring node endpoint is at posArray[i*6+3...5]
                    posArray[i * 6 + 3] = tempVec.x;
                    posArray[i * 6 + 4] = tempVec.y;
                    posArray[i * 6 + 5] = tempVec.z;
                }

                positionAttribute.needsUpdate = true;
            }

            // Update glow halo positions to match
            if (glowRef.current) {
                const glowPosAttr = glowRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
                const glowPosArr = glowPosAttr.array as Float32Array;

                const gv = new THREE.Vector3();
                for (let i = 0; i < basePositions.length; i++) {
                    const ringId = lineRingIndices[i];
                    gv.copy(basePositions[i]);

                    if (ringId === 1) gv.applyMatrix4(ring1Ref.current.matrix);
                    else if (ringId === 2) gv.applyMatrix4(ring2Ref.current.matrix);
                    else if (ringId === 3) gv.applyMatrix4(ring3Ref.current.matrix);

                    glowPosArr[i * 3] = gv.x;
                    glowPosArr[i * 3 + 1] = gv.y;
                    glowPosArr[i * 3 + 2] = gv.z;
                }

                glowPosAttr.needsUpdate = true;
            }
        }

        rotVel.current.x *= 0.92;
        rotVel.current.y *= 0.92;
    });

    // ========================================================================
    // FADE-OUT as camera enters the sphere (offset 0.6 → 0.85)
    // ========================================================================
    const fadeOut = THREE.MathUtils.clamp(1 - (offset - 0.6) / 0.25, 0, 1);

    // ========================================================================
    // RENDER
    // ========================================================================
    if (fadeOut <= 0) return null; // Skip rendering when completely hidden

    return (
        <group ref={groupRef} position={[0, 0, 0]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} scale={fadeOut}>

            {/* 1. The Core — Neural Network Hub */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <group ref={coreRef}>

                    {/* Layer 1: Outer perfectly-round wireframe shell — data-flow flicker */}
                    <mesh scale={1.0} material={wireflow1Mat}>
                        <sphereGeometry args={[0.82, 24, 18]} />
                    </mesh>

                    {/* Layer 2: Inner dense neural mesh — data-flow flicker */}
                    <mesh ref={innerGeo1Ref} scale={0.92} material={wireflow2Mat}>
                        <icosahedronGeometry args={[0.82, 3]} />
                    </mesh>

                    {/* Layer 3: Deep inner structural frame — data-flow flicker */}
                    <mesh ref={innerGeo2Ref} scale={0.6} material={wireflow3Mat}>
                        <icosahedronGeometry args={[0.82, 1]} />
                    </mesh>

                    {/* Layer 4: Equatorial ring accent — horizontal */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.83, 0.003, 8, 80]} />
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
                    </mesh>
                    {/* Equatorial ring accent — vertical */}
                    <mesh>
                        <torusGeometry args={[0.83, 0.003, 8, 80]} />
                        <meshBasicMaterial color="#b53dff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
                    </mesh>
                    {/* Equatorial ring accent — angled */}
                    <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
                        <torusGeometry args={[0.83, 0.002, 8, 80]} />
                        <meshBasicMaterial color="#4488ff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
                    </mesh>

                    {/* Layer 5: Glowing energy sphere — the brain */}
                    <mesh>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
                    </mesh>
                    <mesh scale={1.5}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
                    </mesh>
                    <mesh scale={2.5}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="#4488ff" transparent opacity={0.08} blending={THREE.AdditiveBlending} />
                    </mesh>

                    {/* Purple energy shell — faint aura behind the core */}
                    <mesh scale={1.25}>
                        <sphereGeometry args={[0.82, 24, 24]} />
                        <meshBasicMaterial color="#b53dff" transparent opacity={0.06} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
                    </mesh>

                </group>
            </Float>

            {/* 2. Structured Data Rings */}
            <group ref={ring1Ref}>
                <mesh material={ring1Mat}>
                    <torusGeometry args={[1.8, 0.004, 16, 100]} />
                </mesh>
                {/* Nodes on Ring 1 */}
                <Instances limit={24} range={24}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                    {busNodes1.map((angle, i) => (
                        <Instance key={i} position={[Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, 0]} />
                    ))}
                </Instances>
            </group>

            <group ref={ring2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
                <mesh material={ring2Mat}>
                    <torusGeometry args={[2.6, 0.003, 16, 120]} />
                </mesh>
                {/* Nodes on Ring 2 */}
                <Instances limit={36} range={36}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshBasicMaterial color="#e040fb" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
                    {busNodes2.map((angle, i) => (
                        <Instance key={i} position={[Math.cos(angle) * 2.6, Math.sin(angle) * 2.6, 0]} />
                    ))}
                </Instances>
            </group>

            {/* Third massive outer ring — golden orange for clear distinction */}
            <group ref={ring3Ref} rotation={[-Math.PI / 4, -Math.PI / 6, 0]}>
                <mesh material={ring3Mat}>
                    <torusGeometry args={[3.5, 0.006, 16, 150]} />
                </mesh>
                <Instances limit={48} range={48}>
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshBasicMaterial color="#4488ff" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
                    {busNodes3.map((angle, i) => (
                        <Instance key={i} position={[Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0]} />
                    ))}
                </Instances>
            </group>

            {/* 3. The Chaotic Data Field */}
            <points ref={particlesRef} material={particleMaterial}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={numParticles} args={[particlePositions, 3]} />
                    <bufferAttribute attach="attributes-color" count={numParticles} args={[particleColors, 3]} />
                    <bufferAttribute attach="attributes-phase" count={numParticles} args={[particlePhases, 1]} />
                </bufferGeometry>
            </points>

            {/* 4. Dynamic Neuron Connections */}
            <lineSegments ref={linesRef} material={lineMaterial}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={basePositions.length * 2} args={[new Float32Array(basePositions.length * 6), 3]} />
                    <bufferAttribute attach="attributes-color" count={lineColors.length / 3} args={[lineColors, 3]} />
                    <bufferAttribute attach="attributes-randomId" count={lineRandoms.length} args={[lineRandoms, 1]} />
                </bufferGeometry>
            </lineSegments>

            {/* 5. Dot Glow Halos — pulse when neuron lines fire */}
            <points ref={glowRef} material={glowMaterial}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={glowPositions.length / 3} args={[glowPositions, 3]} />
                    <bufferAttribute attach="attributes-color" count={glowColors.length / 3} args={[glowColors, 3]} />
                    <bufferAttribute attach="attributes-randomId" count={glowRandoms.length} args={[glowRandoms, 1]} />
                </bufferGeometry>
            </points>

        </group>
    );
}
