'use client';

import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScrollStore } from '@/store/useScrollStore';
import * as THREE from 'three';
import { useAi } from '@/context/AiContext';

export default function NeuralSphere() {
    const { isLoading } = useAi();
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Group>(null);
    const ringsRef = useRef<THREE.Group>(null);
    const offset = useScrollStore((state) => state.offset || 0);

    // Drag interaction
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

    // Geometry
    const { wireGeo, innerGeo, beamsGeo, ringGeos } = useMemo(() => {
        const icosa = new THREE.IcosahedronGeometry(1.38, 4);
        const edges = new THREE.EdgesGeometry(icosa, 28);
        const wireGeo = edges;

        const innerGeo = new THREE.SphereGeometry(1.22, 72, 72);

        const beamPoints: THREE.Vector3[] = [];
        for (let i = 0; i < 32; i++) {
            const dir = new THREE.Vector3().randomDirection();
            beamPoints.push(dir.clone().multiplyScalar(1.1));
            beamPoints.push(dir.clone().multiplyScalar(3.6));
        }
        const beamsGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);

        const ringGeos = [
            new THREE.TorusGeometry(1.82, 0.009, 48, 128),
            new THREE.TorusGeometry(2.15, 0.007, 48, 110),
            new THREE.TorusGeometry(2.55, 0.005, 48, 96),
        ];

        return { wireGeo, innerGeo, beamsGeo, ringGeos };
    }, []);

    const wireMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.95 }), []);
    const innerMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6b21a8', transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, side: THREE.BackSide }), []);
    const beamMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending }), []);
    const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending }), []);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const scroll = offset;

        if (groupRef.current) {
            groupRef.current.rotation.y = time * 0.11 + rotVel.current.y;
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.08 + scroll * 0.45, 0.1);
        }

        if (coreRef.current) {
            const pulse = 1 + Math.sin(time * 4.2) * (isLoading ? 0.12 : 0.05);
            coreRef.current.scale.setScalar(pulse);
        }

        if (ringsRef.current) {
            ringsRef.current.children.forEach((ring, i) => {
                ring.rotation.z = time * (0.08 + i * 0.03);
            });
        }

        rotVel.current.x *= 0.9;
        rotVel.current.y *= 0.9;
    });

    // 🔥 AGGRESSIVE FADE — orb completely gone by offset 0.82
    const fade = Math.max(0, 1 - (offset - 0.55) * 6); // starts fading early, fully invisible at 0.82

    return (
        <group
            ref={groupRef}
            position={[0, 0.12, 0]}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
        >
            <group scale={fade}>
                <lineSegments geometry={wireGeo} material={wireMat} />
                <mesh geometry={innerGeo} material={innerMat} />
                <group ref={coreRef}>
                    <mesh>
                        <sphereGeometry args={[0.48, 64, 64]} />
                        <meshBasicMaterial {...coreMat} />
                    </mesh>
                </group>
                <lineSegments geometry={beamsGeo} material={beamMat} />
                <group ref={ringsRef}>
                    {ringGeos.map((geo, i) => (
                        <mesh key={i} geometry={geo} rotation={[i * 0.7 + 0.3, i * 0.5, 0]}>
                            <meshBasicMaterial
                                color={i === 0 ? '#67e8f9' : i === 1 ? '#a78bfa' : '#c084fc'}
                                transparent
                                opacity={0.65 - i * 0.12}
                                blending={THREE.AdditiveBlending}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    ))}
                </group>
            </group>
        </group>
    );
}